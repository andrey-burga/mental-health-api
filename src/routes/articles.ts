import crypto from 'node:crypto';
import { desc, eq, sql } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.js';
import { articles, roles, users } from '../db/schema.js';
import {
  type AuthenticatedRequest,
  authenticateUser,
  isAdminOrAuthor,
  requireRole,
} from '../middleware/auth.js';
import type { Article } from '../types.js';
import {
  articleCreateSchema,
  articleUpdateSchema,
  parsePagination,
  validateBody,
} from '../validation/schemas.js';

export const articlesRouter = Router();

type ArticleJoinedRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  excerpt: string;
  content: string;
  category: string;
  published_at: string;
  created_at: string;
  author_id: string | null;
  authorName: string | null;
  authorRoleId: string | null;
  authorRoleName: string | null;
};

function formatJoinedArticle(row: ArticleJoinedRow) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    published_at: row.published_at,
    created_at: row.created_at,
    author:
      row.author_id && row.authorName
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

function selectArticleWithAuthor() {
  return db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      description: articles.description,
      excerpt: articles.excerpt,
      content: articles.content,
      category: articles.category,
      published_at: articles.published_at,
      created_at: articles.created_at,
      author_id: articles.author_id,
      authorName: users.name,
      authorRoleId: users.role_id,
      authorRoleName: roles.name,
    })
    .from(articles)
    .leftJoin(users, eq(articles.author_id, users.id))
    .leftJoin(roles, eq(users.role_id, roles.id));
}

articlesRouter.get('/', async (req, res, next) => {
  try {
    const { skip, limit } = parsePagination(req.query, 100);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(articles);

    const rows = await selectArticleWithAuthor()
      .orderBy(desc(articles.published_at))
      .limit(limit)
      .offset(skip);

    res.setHeader('X-Total-Count', String(total));
    res.json(rows.map(formatJoinedArticle));
  } catch (err) {
    next(err);
  }
});

articlesRouter.get('/slug/:slug', async (req, res, next) => {
  try {
    const rows = await selectArticleWithAuthor()
      .where(eq(articles.slug, String(req.params.slug)))
      .limit(1);

    if (!rows[0]) {
      res.status(404).json({ detail: 'Artículo no encontrado' });
      return;
    }

    res.json(formatJoinedArticle(rows[0]));
  } catch (err) {
    next(err);
  }
});

articlesRouter.post(
  '/',
  authenticateUser,
  requireRole('admin', 'editor'),
  validateBody(articleCreateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        title,
        slug,
        description,
        excerpt,
        content,
        category,
        published_at,
      } = req.body as {
        title: string;
        slug: string;
        description: string;
        excerpt: string;
        content: string;
        category: string;
        published_at?: string;
      };

      const existing = await db
        .select({ id: articles.id })
        .from(articles)
        .where(eq(articles.slug, slug))
        .limit(1);

      if (existing[0]) {
        res.status(400).json({ detail: 'El slug ya está registrado' });
        return;
      }

      const now = new Date().toISOString();
      const id = crypto.randomUUID();

      await db.insert(articles).values({
        id,
        title,
        slug,
        description,
        excerpt,
        content,
        category,
        published_at: published_at ?? now,
        author_id: req.user!.id,
        created_at: now,
      });

      const [created] = await selectArticleWithAuthor()
        .where(eq(articles.id, id))
        .limit(1);

      res.status(201).json(formatJoinedArticle(created));
    } catch (err) {
      next(err);
    }
  }
);

articlesRouter.patch(
  '/:article_id',
  authenticateUser,
  validateBody(articleUpdateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const articleId = String(req.params.article_id);
      const existingRows = await db
        .select()
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);

      const existing = existingRows[0];
      if (!existing) {
        res.status(404).json({ detail: 'Artículo no encontrado' });
        return;
      }

      if (!isAdminOrAuthor(req.user!, existing.author_id)) {
        res.status(403).json({
          detail:
            'No tienes permisos para realizar esta acción sobre este artículo',
        });
        return;
      }

      const updates = req.body as Partial<Article>;
      if (updates.slug && updates.slug !== existing.slug) {
        const slugOwner = await db
          .select({ id: articles.id })
          .from(articles)
          .where(eq(articles.slug, updates.slug))
          .limit(1);

        if (slugOwner[0]) {
          res.status(400).json({
            detail: 'El nuevo slug ya está en uso por otro artículo',
          });
          return;
        }
      }

      const patchPayload: Partial<typeof articles.$inferInsert> = {};
      if (updates.title !== undefined) patchPayload.title = updates.title;
      if (updates.slug !== undefined) patchPayload.slug = updates.slug;
      if (updates.description !== undefined)
        patchPayload.description = updates.description;
      if (updates.excerpt !== undefined) patchPayload.excerpt = updates.excerpt;
      if (updates.content !== undefined) patchPayload.content = updates.content;
      if (updates.category !== undefined)
        patchPayload.category = updates.category;
      if (updates.published_at !== undefined)
        patchPayload.published_at = updates.published_at;

      if (Object.keys(patchPayload).length > 0) {
        await db
          .update(articles)
          .set(patchPayload)
          .where(eq(articles.id, articleId));
      }

      const [updated] = await selectArticleWithAuthor()
        .where(eq(articles.id, articleId))
        .limit(1);

      res.json(formatJoinedArticle(updated));
    } catch (err) {
      next(err);
    }
  }
);

articlesRouter.delete(
  '/:article_id',
  authenticateUser,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const articleId = String(req.params.article_id);
      const existingRows = await db
        .select({ id: articles.id, author_id: articles.author_id })
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);

      const existing = existingRows[0];
      if (!existing) {
        res.status(404).json({ detail: 'Artículo no encontrado' });
        return;
      }

      if (!isAdminOrAuthor(req.user!, existing.author_id)) {
        res.status(403).json({
          detail:
            'No tienes permisos para realizar esta acción sobre este artículo',
        });
        return;
      }

      await db.delete(articles).where(eq(articles.id, articleId));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
