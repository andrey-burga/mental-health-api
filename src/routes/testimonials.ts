import crypto from 'node:crypto';
import { desc, eq, or, sql, type SQL } from 'drizzle-orm';
import { Router, type NextFunction, type Response } from 'express';
import { db } from '../db/index.js';
import { roles, testimonials, users } from '../db/schema.js';
import {
  type AuthenticatedRequest,
  authenticateUser,
  isAdminOrAuthor,
  optionalAuthenticateUser,
} from '../middleware/auth.js';
import type { TestimonialStatus } from '../types.js';
import {
  parsePagination,
  testimonialCreateSchema,
  testimonialUpdateSchema,
  validateBody,
} from '../validation/schemas.js';

export const testimonialsRouter = Router();

type TestimonialJoinedRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  status: TestimonialStatus;
  created_at: string;
  author_id: string;
  authorName: string | null;
  authorRoleId: string | null;
  authorRoleName: string | null;
};

function formatJoinedTestimonial(row: TestimonialJoinedRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    status: row.status,
    created_at: row.created_at,
    author: row.authorName
      ? {
          id: row.author_id,
          name: row.authorName,
          role: {
            id: row.authorRoleId ?? 'role-user',
            name: row.authorRoleName ?? 'user',
          },
        }
      : null,
  };
}

function selectTestimonialWithAuthor() {
  return db
    .select({
      id: testimonials.id,
      slug: testimonials.slug,
      title: testimonials.title,
      excerpt: testimonials.excerpt,
      content: testimonials.content,
      status: testimonials.status,
      created_at: testimonials.created_at,
      author_id: testimonials.author_id,
      authorName: users.name,
      authorRoleId: users.role_id,
      authorRoleName: roles.name,
    })
    .from(testimonials)
    .leftJoin(users, eq(testimonials.author_id, users.id))
    .leftJoin(roles, eq(users.role_id, roles.id));
}

testimonialsRouter.get(
  '/',
  optionalAuthenticateUser,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { skip, limit } = parsePagination(req.query, 10);
      const isAdmin = req.user?.role.name === 'admin';
      const requestedStatus =
        typeof req.query.status === 'string' ? req.query.status : undefined;

      if (requestedStatus && requestedStatus !== 'approved' && !isAdmin) {
        res.status(403).json({
          detail: 'No tienes permisos para consultar testimonios no aprobados',
        });
        return;
      }

      let whereClause: SQL | undefined;
      if (!isAdmin || !requestedStatus) {
        whereClause = eq(testimonials.status, 'approved');
      } else if (
        requestedStatus === 'pending' ||
        requestedStatus === 'approved' ||
        requestedStatus === 'rejected'
      ) {
        whereClause = eq(testimonials.status, requestedStatus);
      }

      const countQuery = whereClause
        ? db
            .select({ total: sql<number>`count(*)::int` })
            .from(testimonials)
            .where(whereClause)
        : db
            .select({ total: sql<number>`count(*)::int` })
            .from(testimonials);

      const rowsQuery = whereClause
        ? selectTestimonialWithAuthor()
            .where(whereClause)
            .orderBy(desc(testimonials.created_at))
            .limit(limit)
            .offset(skip)
        : selectTestimonialWithAuthor()
            .orderBy(desc(testimonials.created_at))
            .limit(limit)
            .offset(skip);

      const [[{ total }], rows] = await Promise.all([countQuery, rowsQuery]);

      res.setHeader('X-Total-Count', String(total));
      res.json(rows.map(formatJoinedTestimonial));
    } catch (err) {
      next(err);
    }
  }
);

testimonialsRouter.get(
  '/:slug_or_id',
  optionalAuthenticateUser,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const key = String(req.params.slug_or_id);
      const rows = await selectTestimonialWithAuthor()
        .where(or(eq(testimonials.id, key), eq(testimonials.slug, key)))
        .limit(1);

      const found = rows[0];
      if (!found) {
        res.status(404).json({ detail: 'Testimonio no encontrado' });
        return;
      }

      if (
        found.status !== 'approved' &&
        (!req.user || !isAdminOrAuthor(req.user, found.author_id))
      ) {
        res.status(404).json({ detail: 'Testimonio no encontrado' });
        return;
      }

      res.json(formatJoinedTestimonial(found));
    } catch (err) {
      next(err);
    }
  }
);

testimonialsRouter.post(
  '/',
  authenticateUser,
  validateBody(testimonialCreateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { slug, title, excerpt, content } = req.body as {
        slug: string;
        title: string;
        excerpt: string;
        content: string;
      };

      const existing = await db
        .select({ id: testimonials.id })
        .from(testimonials)
        .where(eq(testimonials.slug, slug))
        .limit(1);

      if (existing[0]) {
        res.status(400).json({
          detail: 'El slug ya está registrado. Usa uno diferente.',
        });
        return;
      }

      const isAdmin = req.user!.role.name === 'admin';
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await db.insert(testimonials).values({
        id,
        slug,
        title,
        excerpt,
        content,
        author_id: req.user!.id,
        status: isAdmin ? 'approved' : 'pending',
        created_at: now,
      });

      const [created] = await selectTestimonialWithAuthor()
        .where(eq(testimonials.id, id))
        .limit(1);

      res.status(201).json(formatJoinedTestimonial(created));
    } catch (err) {
      next(err);
    }
  }
);

async function handleUpdateTestimonial(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id = String(req.params.testimonial_id);
    const existingRows = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.id, id))
      .limit(1);

    const existing = existingRows[0];
    if (!existing) {
      res.status(404).json({ detail: 'Testimonio no encontrado' });
      return;
    }

    if (!isAdminOrAuthor(req.user!, existing.author_id)) {
      res.status(403).json({
        detail: 'No tienes permiso para modificar este testimonio',
      });
      return;
    }

    const { title, slug, excerpt, content, status } = req.body as {
      title?: string;
      slug?: string;
      excerpt?: string;
      content?: string;
      status?: TestimonialStatus;
    };

    const isAdmin = req.user!.role.name === 'admin';
    if (status !== undefined && !isAdmin) {
      res.status(403).json({
        detail: 'Solo un administrador puede moderar el estado de un testimonio',
      });
      return;
    }

    if (slug && slug !== existing.slug) {
      const slugOwner = await db
        .select({ id: testimonials.id })
        .from(testimonials)
        .where(eq(testimonials.slug, slug))
        .limit(1);

      if (slugOwner[0]) {
        res.status(400).json({
          detail: 'El slug ya está registrado. Usa uno diferente.',
        });
        return;
      }
    }

    const patchPayload: Partial<typeof testimonials.$inferInsert> = {};
    if (title !== undefined) patchPayload.title = title;
    if (slug !== undefined) patchPayload.slug = slug;
    if (excerpt !== undefined) patchPayload.excerpt = excerpt;
    if (content !== undefined) patchPayload.content = content;
    if (status !== undefined && isAdmin) patchPayload.status = status;

    if (Object.keys(patchPayload).length > 0) {
      await db
        .update(testimonials)
        .set(patchPayload)
        .where(eq(testimonials.id, id));
    }

    const [updated] = await selectTestimonialWithAuthor()
      .where(eq(testimonials.id, id))
      .limit(1);

    res.json(formatJoinedTestimonial(updated));
  } catch (err) {
    next(err);
  }
}

testimonialsRouter.put(
  '/:testimonial_id',
  authenticateUser,
  validateBody(testimonialUpdateSchema),
  handleUpdateTestimonial
);

testimonialsRouter.patch(
  '/:testimonial_id',
  authenticateUser,
  validateBody(testimonialUpdateSchema),
  handleUpdateTestimonial
);

testimonialsRouter.delete(
  '/:testimonial_id',
  authenticateUser,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const id = String(req.params.testimonial_id);
      const existingRows = await db
        .select({ id: testimonials.id, author_id: testimonials.author_id })
        .from(testimonials)
        .where(eq(testimonials.id, id))
        .limit(1);

      const existing = existingRows[0];
      if (!existing) {
        res.status(404).json({ detail: 'Testimonio no encontrado' });
        return;
      }

      if (!isAdminOrAuthor(req.user!, existing.author_id)) {
        res.status(403).json({
          detail: 'No tienes permiso para eliminar este testimonio',
        });
        return;
      }

      await db.delete(testimonials).where(eq(testimonials.id, id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
