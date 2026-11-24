import crypto from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.js';
import { dailyReflections } from '../db/schema.js';
import { authenticateUser, requireRole } from '../middleware/auth.js';
import { reflectionCreateSchema, validateBody } from '../validation/schemas.js';

export const reflectionsRouter = Router();

reflectionsRouter.get('/today', async (_req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const exactMatches = await db
      .select({
        id: dailyReflections.id,
        phrase: dailyReflections.phrase,
        author: dailyReflections.author,
        show_date: dailyReflections.show_date,
      })
      .from(dailyReflections)
      .where(
        and(
          eq(dailyReflections.active, true),
          eq(dailyReflections.show_date, today)
        )
      )
      .limit(1);

    if (exactMatches[0]) {
      res.json(exactMatches[0]);
      return;
    }

    const fallbackRows = await db
      .select({
        id: dailyReflections.id,
        phrase: dailyReflections.phrase,
        author: dailyReflections.author,
        show_date: dailyReflections.show_date,
      })
      .from(dailyReflections)
      .where(eq(dailyReflections.active, true))
      .orderBy(sql`random()`)
      .limit(1);

    if (!fallbackRows[0]) {
      res
        .status(404)
        .json({ detail: 'No hay reflexiones disponibles en el sistema.' });
      return;
    }

    res.json(fallbackRows[0]);
  } catch (err) {
    next(err);
  }
});

reflectionsRouter.post(
  '/',
  authenticateUser,
  requireRole('admin', 'editor'),
  validateBody(reflectionCreateSchema),
  async (req, res, next) => {
    try {
      const {
        phrase,
        author = 'Anónimo',
        show_date = null,
        active = true,
      } = req.body as {
        phrase: string;
        author?: string | null;
        show_date?: string | null;
        active?: boolean;
      };

      if (show_date) {
        const existingDate = await db
          .select({ id: dailyReflections.id })
          .from(dailyReflections)
          .where(eq(dailyReflections.show_date, show_date))
          .limit(1);

        if (existingDate[0]) {
          res.status(400).json({
            detail: 'Ya existe una reflexión asignada para esa fecha.',
          });
          return;
        }
      }

      const [created] = await db
        .insert(dailyReflections)
        .values({
          id: crypto.randomUUID(),
          phrase,
          author: author ?? 'Anónimo',
          show_date: show_date ?? null,
          active,
          created_at: new Date().toISOString(),
        })
        .returning({
          id: dailyReflections.id,
          phrase: dailyReflections.phrase,
          author: dailyReflections.author,
          show_date: dailyReflections.show_date,
        });

      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }
);
