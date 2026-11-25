import { desc, eq, ilike, or } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.js';
import { roles, users } from '../db/schema.js';
import {
  type AuthenticatedRequest,
  authenticateUser,
  requireRole,
} from '../middleware/auth.js';
import { userRoleUpdateSchema, validateBody } from '../validation/schemas.js';

export const usersRouter = Router();

usersRouter.get(
  '/',
  authenticateUser,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const searchQuery =
        typeof req.query.q === 'string' ? req.query.q.trim() : '';

      const baseQuery = db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role_id: users.role_id,
          roleName: roles.name,
          created_at: users.created_at,
        })
        .from(users)
        .leftJoin(roles, eq(users.role_id, roles.id));

      const rows = searchQuery
        ? await baseQuery
            .where(
              or(
                ilike(users.email, `%${searchQuery}%`),
                ilike(users.name, `%${searchQuery}%`)
              )
            )
            .orderBy(desc(users.created_at))
        : await baseQuery.orderBy(desc(users.created_at));

      const formatted = rows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        role_id: row.role_id,
        role: {
          id: row.role_id,
          name: row.roleName ?? 'user',
        },
        created_at: row.created_at,
      }));

      res.json(formatted);
    } catch (err) {
      next(err);
    }
  }
);

usersRouter.patch(
  '/:user_id/role',
  authenticateUser,
  requireRole('admin'),
  validateBody(userRoleUpdateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = String(req.params.user_id);
      const { role, role_id } = req.body as {
        role?: string;
        role_id?: string;
      };
      const requestedRole = (role_id || role)!.trim();

      const matchedRoles = await db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(or(eq(roles.id, requestedRole), eq(roles.name, requestedRole)))
        .limit(1);

      const targetRole = matchedRoles[0];
      if (!targetRole) {
        res.status(400).json({
          detail: 'Rol destino inválido. Roles válidos: user, editor, admin.',
        });
        return;
      }

      const targetUsers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role_id: users.role_id,
          created_at: users.created_at,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const targetUser = targetUsers[0];
      if (!targetUser) {
        res.status(404).json({ detail: 'Usuario no encontrado' });
        return;
      }

      if (targetUser.id === req.user!.id && targetRole.name !== 'admin') {
        res.status(400).json({
          detail: 'No puedes quitarte tu propio rol de administrador.',
        });
        return;
      }

      const [updated] = await db
        .update(users)
        .set({ role_id: targetRole.id })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role_id: users.role_id,
          created_at: users.created_at,
        });

      res.json({
        ...updated,
        role: targetRole,
      });
    } catch (err) {
      next(err);
    }
  }
);
