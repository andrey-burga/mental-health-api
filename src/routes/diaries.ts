import crypto from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.js';
import { diaries } from '../db/schema.js';
import { type AuthenticatedRequest, authenticateUser } from '../middleware/auth.js';
import { diarieCreateSchema, validateBody } from '../validation/schemas.js';

export const diariesRouter = Router();

diariesRouter.post(
  '/',
  authenticateUser,
  validateBody(diarieCreateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { mood, text, tag } = req.body as {
        mood: string;
        text: string;
        tag: string;
      };

      const [entry] = await db
        .insert(diaries)
        .values({
          id: crypto.randomUUID(),
          mood,
          text,
          tag,
          user_id: req.user!.id,
          created_at: new Date().toISOString(),
        })
        .returning();

      res.status(201).json(entry);
    } catch (err) {
      next(err);
    }
  }
);

diariesRouter.get(
  '/',
  authenticateUser,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userEntries = await db
        .select()
        .from(diaries)
        .where(eq(diaries.user_id, req.user!.id))
        .orderBy(desc(diaries.created_at));

      res.json(userEntries);
    } catch (err) {
      next(err);
    }
  }
);

diariesRouter.delete(
  '/:entry_id',
  authenticateUser,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const entryId = String(req.params.entry_id);
      const deleted = await db
        .delete(diaries)
        .where(and(eq(diaries.id, entryId), eq(diaries.user_id, req.user!.id)))
        .returning({ id: diaries.id });

      if (!deleted[0]) {
        res.status(404).json({
          detail: 'Entrada del diario no encontrada o no pertenece al usuario',
        });
        return;
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
