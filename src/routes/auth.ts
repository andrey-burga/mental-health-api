import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db/index.js';
import { roles, sessions, users } from '../db/schema.js';
import {
  type AuthenticatedRequest,
  authenticateUser,
  createAccessToken,
  createResetToken,
  hashToken,
  verifyResetToken,
} from '../middleware/auth.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenLoginSchema,
  validateBody,
} from '../validation/schemas.js';

export const authRouter = Router();

const BCRYPT_ROUNDS = 12;

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    detail:
      'Demasiados intentos de autenticación. Intenta nuevamente en 15 minutos.',
  },
});

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

function parseUserAgent(ua: string | undefined): string {
  if (!ua) return 'Dispositivo desconocido';
  if (/android/i.test(ua)) return 'Android Mobile';
  if (/iphone|ipad/i.test(ua)) return 'iOS Mobile';
  const os = /windows/i.test(ua)
    ? 'Windows'
    : /mac os/i.test(ua)
      ? 'Mac OS X'
      : /linux/i.test(ua)
        ? 'Linux'
        : 'PC';
  const browser = /chrome/i.test(ua)
    ? 'Chrome'
    : /safari/i.test(ua)
      ? 'Safari'
      : /firefox/i.test(ua)
        ? 'Firefox'
        : 'Browser';
  return `${os} - ${browser}`;
}

async function recordSession(
  req: Request,
  userId: string,
  token: string
): Promise<void> {
  const ip = getClientIp(req);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const isLocal =
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.');

  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    user_id: userId,
    refresh_token_hash: hashToken(token),
    device_name: parseUserAgent(req.headers['user-agent']),
    ip_address: ip,
    location: isLocal ? 'Localhost (Desarrollo)' : 'Ubicación desconocida',
    last_active_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
  });
}

async function findUserWithRoleByEmail(email: string) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      password: users.password,
      name: users.name,
      role_id: users.role_id,
      created_at: users.created_at,
      roleName: roles.name,
    })
    .from(users)
    .leftJoin(roles, eq(users.role_id, roles.id))
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  return rows[0];
}

authRouter.post(
  '/register',
  authRateLimiter,
  validateBody(registerSchema),
  async (req, res, next) => {
    try {
      const { email, name, password } = req.body as {
        email: string;
        name: string;
        password: string;
      };
      const normalizedEmail = email.toLowerCase();

      const existing = await findUserWithRoleByEmail(normalizedEmail);
      if (existing) {
        res
          .status(400)
          .json({ detail: 'El correo electrónico ya está registrado.' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const now = new Date().toISOString();

      // Always force 'role-user' on public registration to prevent privilege escalation
      const [created] = await db
        .insert(users)
        .values({
          id: crypto.randomUUID(),
          email: normalizedEmail,
          name,
          password: hashedPassword,
          role_id: 'role-user',
          created_at: now,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role_id: users.role_id,
          created_at: users.created_at,
        });

      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.body as {
        email: string;
        password: string;
      };

      const user = await findUserWithRoleByEmail(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        res.status(401).json({ detail: 'Correo o contraseña incorrectos.' });
        return;
      }

      const token = await createAccessToken({
        sub: user.id,
        role: user.role_id,
        type: 'access',
      });

      await recordSession(req, user.id, token);

      res.json({
        access_token: token,
        token_type: 'bearer',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role_id: user.role_id,
          role: {
            id: user.role_id,
            name: user.roleName ?? 'user',
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/token',
  authRateLimiter,
  validateBody(tokenLoginSchema),
  async (req, res, next) => {
    try {
      const { username, email, password } = req.body as {
        username?: string;
        email?: string;
        password: string;
      };
      const identifier = (username || email)!;

      const user = await findUserWithRoleByEmail(identifier);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        res.status(401).json({ detail: 'Correo o contraseña incorrectos.' });
        return;
      }

      const token = await createAccessToken({
        sub: user.id,
        role: user.role_id,
        type: 'access',
      });

      await recordSession(req, user.id, token);

      res.json({
        access_token: token,
        token_type: 'bearer',
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/forgot-password',
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const { email } = req.body as { email: string };
      const user = await findUserWithRoleByEmail(email);

      if (user) {
        await createResetToken(user.id);
        console.info(
          `[EmailService Stub] Solicitud de recuperación procesada para usuario ${user.id}`
        );
      }

      res.json({
        message:
          'Si el correo está registrado, se ha enviado un enlace de recuperación.',
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/reset-password',
  authRateLimiter,
  validateBody(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { token, new_password } = req.body as {
        token: string;
        new_password: string;
      };

      const userId = await verifyResetToken(token);
      if (!userId) {
        res.status(400).json({
          detail: 'El token de recuperación ha expirado o no es válido.',
        });
        return;
      }

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!existing[0]) {
        res.status(404).json({ detail: 'Usuario no encontrado.' });
        return;
      }

      const hashedPassword = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));

      await db.delete(sessions).where(eq(sessions.user_id, userId));

      res.json({ message: 'Tu contraseña ha sido restablecida con éxito.' });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.get('/me', authenticateUser, (req: AuthenticatedRequest, res) => {
  res.json(req.user!);
});
