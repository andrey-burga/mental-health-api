import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.js';
import { habits } from '../db/schema.js';
import { type AuthenticatedRequest, authenticateUser } from '../middleware/auth.js';
import type { HabitCategory } from '../types.js';
import {
  habitCreateSchema,
  habitUpdateSchema,
  validateBody,
} from '../validation/schemas.js';

export const habitsRouter = Router();

habitsRouter.get(
  '/',
  authenticateUser,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userHabits = await db
        .select()
        .from(habits)
        .where(eq(habits.user_id, req.user!.id));

      res.json(userHabits);
    } catch (err) {
      next(err);
    }
  }
);

habitsRouter.post(
  '/',
  authenticateUser,
  validateBody(habitCreateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { text, category } = req.body as {
        text: string;
        category: HabitCategory;
      };

      const [newHabit] = await db
        .insert(habits)
        .values({
          id: crypto.randomUUID(),
          user_id: req.user!.id,
          text,
          completed: false,
          category,
          created_at: new Date().toISOString(),
        })
        .returning();

      res.status(201).json(newHabit);
    } catch (err) {
      next(err);
    }
  }
);

habitsRouter.patch(
  '/:habit_id',
  authenticateUser,
  validateBody(habitUpdateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const habitId = String(req.params.habit_id);
      const { text, completed, category } = req.body as {
        text?: string;
        completed?: boolean;
        category?: HabitCategory;
      };

      const patchPayload: Partial<typeof habits.$inferInsert> = {};
      if (text !== undefined) patchPayload.text = text;
      if (completed !== undefined) patchPayload.completed = completed;
      if (category !== undefined) patchPayload.category = category;

      const updated = await db
        .update(habits)
        .set(patchPayload)
        .where(and(eq(habits.id, habitId), eq(habits.user_id, req.user!.id)))
        .returning();

      if (!updated[0]) {
        res
          .status(404)
          .json({ detail: 'Hábito no encontrado o no autorizado' });
        return;
      }

      res.json(updated[0]);
    } catch (err) {
      next(err);
    }
  }
);

habitsRouter.delete(
  '/:habit_id',
  authenticateUser,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const habitId = String(req.params.habit_id);
      const deleted = await db
        .delete(habits)
        .where(and(eq(habits.id, habitId), eq(habits.user_id, req.user!.id)))
        .returning({ id: habits.id });

      if (!deleted[0]) {
        res
          .status(404)
          .json({ detail: 'Hábito no encontrado o no autorizado' });
        return;
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
