import { and, desc, eq, gt, ne } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.js';
import { sessions } from '../db/schema.js';
import {
  type AuthenticatedRequest,
  authenticateUser,
  hashToken,
} from '../middleware/auth.js';

export const sessionsRouter = Router();

sessionsRouter.get(
  '/',
  authenticateUser,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const currentTokenHash = hashToken(req.rawToken || '');
      const nowIso = new Date().toISOString();

      const activeSessions = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.user_id, req.user!.id),
            gt(sessions.expires_at, nowIso)
          )
        )
        .orderBy(desc(sessions.last_active_at));

      const formatted = activeSessions.map((s) => {
        const isCurrent = s.refresh_token_hash === currentTokenHash;
        const lastActiveDate = new Date(s.last_active_at);
        const formattedLastAccess = isCurrent
          ? 'Ahora mismo'
          : lastActiveDate.toISOString().slice(0, 16).replace('T', ' ');

        return {
          id: s.id,
          device: s.device_name || 'Dispositivo desconocido',
          location: s.location || 'Ubicación desconocida',
          ip: s.ip_address || 'IP no registrada',
          lastAccess: formattedLastAccess,
          current: isCurrent,
        };
      });

      res.json(formatted);
    } catch (err) {
      next(err);
    }
  }
);

sessionsRouter.delete(
  '/:session_id',
  authenticateUser,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const sessionId = String(req.params.session_id);
      const deleted = await db
        .delete(sessions)
        .where(
          and(eq(sessions.id, sessionId), eq(sessions.user_id, req.user!.id))
        )
        .returning({ id: sessions.id });

      if (!deleted[0]) {
        res
          .status(404)
          .json({ detail: 'La sesión no existe o no te pertenece.' });
        return;
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

sessionsRouter.delete(
  '/',
  authenticateUser,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const currentTokenHash = hashToken(req.rawToken || '');

      await db
        .delete(sessions)
        .where(
          and(
            eq(sessions.user_id, req.user!.id),
            ne(sessions.refresh_token_hash, currentTokenHash)
          )
        );

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
