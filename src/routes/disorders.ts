import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.js';
import { disorders, symptoms } from '../db/schema.js';
import { authenticateUser, requireRole } from '../middleware/auth.js';
import type { Symptom } from '../types.js';
import {
  disorderCreateSchema,
  symptomCreateSchema,
  validateBody,
} from '../validation/schemas.js';

export const disordersRouter = Router();

disordersRouter.get('/', async (_req, res, next) => {
  try {
    const [allDisorders, allSymptoms] = await Promise.all([
      db.select().from(disorders),
      db.select().from(symptoms),
    ]);

    const symptomsByDisorder = new Map<string, Symptom[]>();
    for (const s of allSymptoms) {
      const list = symptomsByDisorder.get(s.disorder_id) ?? [];
      list.push(s);
      symptomsByDisorder.set(s.disorder_id, list);
    }

    const result = allDisorders.map((d) => ({
      ...d,
      symptoms: symptomsByDisorder.get(d.id) ?? [],
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

disordersRouter.get('/slug/:slug', async (req, res, next) => {
  try {
    const [disorder] = await db
      .select()
      .from(disorders)
      .where(eq(disorders.slug, String(req.params.slug)))
      .limit(1);

    if (!disorder) {
      res.status(404).json({ detail: 'Trastorno no encontrado' });
      return;
    }

    const relatedSymptoms = await db
      .select()
      .from(symptoms)
      .where(eq(symptoms.disorder_id, disorder.id));

    res.json({
      ...disorder,
      symptoms: relatedSymptoms,
    });
  } catch (err) {
    next(err);
  }
});

disordersRouter.post(
  '/',
  authenticateUser,
  requireRole('admin'),
  validateBody(disorderCreateSchema),
  async (req, res, next) => {
    try {
      const { slug, title, description } = req.body as {
        slug: string;
        title: string;
        description: string;
      };

      const existing = await db
        .select({ id: disorders.id })
        .from(disorders)
        .where(eq(disorders.slug, slug))
        .limit(1);

      if (existing[0]) {
        res.status(400).json({ detail: 'Este trastorno ya está registrado' });
        return;
      }

      const [created] = await db
        .insert(disorders)
        .values({
          id: crypto.randomUUID(),
          slug,
          title,
          description,
        })
        .returning();

      res.status(201).json({
        ...created,
        symptoms: [],
      });
    } catch (err) {
      next(err);
    }
  }
);

disordersRouter.post(
  '/symptoms',
  authenticateUser,
  requireRole('admin'),
  validateBody(symptomCreateSchema),
  async (req, res, next) => {
    try {
      const { text, disorder_id } = req.body as {
        text: string;
        disorder_id: string;
      };

      const existingDisorder = await db
        .select({ id: disorders.id })
        .from(disorders)
        .where(eq(disorders.id, disorder_id))
        .limit(1);

      if (!existingDisorder[0]) {
        res.status(404).json({ detail: 'Trastorno no encontrado' });
        return;
      }

      const [created] = await db
        .insert(symptoms)
        .values({
          id: crypto.randomUUID(),
          text,
          disorder_id,
        })
        .returning();

      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }
);
