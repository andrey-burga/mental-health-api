import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.js';
import { disorders, symptoms } from '../db/schema.js';
import { authenticateUser, requireRole } from '../middleware/auth.js';
import type { Symptom } from '../types.js';
import {
  disorderCreateSchema,
  disorderUpdateSchema,
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

disordersRouter.patch(
  '/:disorder_id',
  authenticateUser,
  requireRole('admin'),
  validateBody(disorderUpdateSchema),
  async (req, res, next) => {
    try {
      const disorderId = String(req.params.disorder_id);
      const existingRows = await db
        .select()
        .from(disorders)
        .where(eq(disorders.id, disorderId))
        .limit(1);

      const existing = existingRows[0];
      if (!existing) {
        res.status(404).json({ detail: 'Trastorno no encontrado' });
        return;
      }

      const { slug, title, description } = req.body as {
        slug?: string;
        title?: string;
        description?: string;
      };

      if (slug && slug !== existing.slug) {
        const slugOwner = await db
          .select({ id: disorders.id })
          .from(disorders)
          .where(eq(disorders.slug, slug))
          .limit(1);

        if (slugOwner[0]) {
          res.status(400).json({
            detail: 'El nuevo slug ya está en uso por otro trastorno',
          });
          return;
        }
      }

      const patchPayload: Partial<typeof disorders.$inferInsert> = {};
      if (slug !== undefined) patchPayload.slug = slug;
      if (title !== undefined) patchPayload.title = title;
      if (description !== undefined) patchPayload.description = description;

      const [updated] = await db
        .update(disorders)
        .set(patchPayload)
        .where(eq(disorders.id, disorderId))
        .returning();

      const relatedSymptoms = await db
        .select()
        .from(symptoms)
        .where(eq(symptoms.disorder_id, disorderId));

      res.json({
        ...updated,
        symptoms: relatedSymptoms,
      });
    } catch (err) {
      next(err);
    }
  }
);

disordersRouter.delete(
  '/:disorder_id',
  authenticateUser,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const disorderId = String(req.params.disorder_id);
      const deleted = await db
        .delete(disorders)
        .where(eq(disorders.id, disorderId))
        .returning({ id: disorders.id });

      if (!deleted[0]) {
        res.status(404).json({ detail: 'Trastorno no encontrado' });
        return;
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
