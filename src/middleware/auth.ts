import crypto from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '../db/index.js';
import { roles, sessions, users } from '../db/schema.js';
import type { AuthenticatedUser } from '../types.js';

function resolveJwtSecret(): Uint8Array {
  const configuredSecret = process.env.JWT_SECRET || process.env.SECRET_KEY;

  if (process.env.NODE_ENV === 'production') {
    if (!configuredSecret || configuredSecret.length < 32) {
      throw new Error(
        'FATAL: JWT_SECRET (o SECRET_KEY) debe definirse en producción con al menos 32 caracteres.'
      );
    }
    return new TextEncoder().encode(configuredSecret);
  }

  const devSecret =
    configuredSecret && configuredSecret.length >= 32
      ? configuredSecret
      : crypto.randomBytes(32).toString('hex');

  return new TextEncoder().encode(devSecret);
}

const encodedSecret = resolveJwtSecret();

export const ACCESS_TOKEN_EXPIRE_HOURS = 24;
export const RESET_PASSWORD_TOKEN_EXPIRE_MINUTES = 15;

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  rawToken?: string;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export async function createAccessToken(
  payload: { sub: string; role: string; type: string },
  expiresHours = ACCESS_TOKEN_EXPIRE_HOURS
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresHours}h`)
    .sign(encodedSecret);
}

export async function createResetToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, purpose: 'password_reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${RESET_PASSWORD_TOKEN_EXPIRE_MINUTES}m`)
    .sign(encodedSecret);
}

export async function verifyResetToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    if (payload.purpose !== 'password_reset' || typeof payload.sub !== 'string') {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

async function resolveAuthenticatedSession(
  authHeader: string | undefined
): Promise<{ user: AuthenticatedUser; token: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    const userId = payload.sub;
    const tokenType = payload.type;

    if (tokenType !== 'access' || typeof userId !== 'string') {
      return null;
    }

    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role_id: users.role_id,
        created_at: users.created_at,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.role_id, roles.id))
      .where(eq(users.id, userId))
      .limit(1);

    const row = userRows[0];
    if (!row) {
      return null;
    }

    const tokenHash = hashToken(token);
    const nowIso = new Date().toISOString();

    const activeSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.user_id, row.id),
          eq(sessions.refresh_token_hash, tokenHash),
          gt(sessions.expires_at, nowIso)
        )
      )
      .limit(1);

    const activeSession = activeSessions[0];
    if (!activeSession) {
      return null;
    }

    await db
      .update(sessions)
      .set({ last_active_at: nowIso })
      .where(eq(sessions.id, activeSession.id));

    return {
      token,
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        role_id: row.role_id,
        role: {
          id: row.role_id,
          name: row.roleName ?? 'user',
        },
        created_at: row.created_at,
      },
    };
  } catch {
    return null;
  }
}

export async function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ detail: 'No autenticado' });
    return;
  }

  try {
    const resolved = await resolveAuthenticatedSession(authHeader);
    if (!resolved) {
      res.status(401).json({ detail: 'Token inválido o sesión revocada' });
      return;
    }

    req.user = resolved.user;
    req.rawToken = resolved.token;
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuthenticateUser(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const resolved = await resolveAuthenticatedSession(req.headers.authorization);
    if (resolved) {
      req.user = resolved.user;
      req.rawToken = resolved.token;
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({ detail: 'No autenticado' });
      return;
    }

    if (!allowedRoles.includes(req.user.role.name)) {
      res.status(403).json({
        detail: 'No tienes permisos suficientes para realizar esta acción',
      });
      return;
    }

    next();
  };
}

export function isAdminOrAuthor(
  user: AuthenticatedUser,
  authorId: string | null
): boolean {
  const isAdmin = user.role.name === 'admin';
  const isAuthor = authorId !== null && String(authorId) === String(user.id);
  return isAdmin || isAuthor;
}
