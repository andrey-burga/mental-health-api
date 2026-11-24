import type { Request, Response, NextFunction } from 'express';
import { z, type ZodSchema } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const registerSchema = z.object({
  email: z.string().trim().email('Correo electrónico inválido').max(255),
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(120),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Correo electrónico inválido').max(255),
  password: z.string().min(1, 'La contraseña es requerida').max(128),
});

export const tokenLoginSchema = z
  .object({
    username: z.string().trim().email().max(255).optional(),
    email: z.string().trim().email().max(255).optional(),
    password: z.string().min(1, 'La contraseña es requerida').max(128),
  })
  .refine((data) => Boolean(data.username || data.email), {
    message: 'username o email es requerido',
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Correo electrónico inválido').max(255),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Token inválido').max(2048),
  new_password: z
    .string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .max(128),
});

export const articleCreateSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(150)
    .regex(slugRegex, 'Slug inválido (solo minúsculas, números y guiones)'),
  description: z.string().trim().min(5).max(500),
  excerpt: z.string().trim().min(5).max(1000),
  content: z.string().trim().min(10).max(50000),
  category: z.string().trim().min(2).max(80),
  published_at: z.string().datetime().optional(),
});

export const articleUpdateSchema = articleCreateSchema.partial();

export const disorderCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(150)
    .regex(slugRegex, 'Slug inválido (solo minúsculas, números y guiones)'),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(5).max(2000),
});

export const symptomCreateSchema = z.object({
  text: z.string().trim().min(2).max(500),
  disorder_id: z.string().trim().min(1).max(100),
});

export const testimonialCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(150)
    .regex(slugRegex, 'Slug inválido (solo minúsculas, números y guiones)'),
  title: z.string().trim().min(3).max(200),
  excerpt: z.string().trim().min(5).max(1000),
  content: z.string().trim().min(10).max(20000),
});

export const testimonialUpdateSchema = testimonialCreateSchema.partial().extend({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

export const diarieCreateSchema = z.object({
  mood: z.string().trim().min(1).max(50),
  text: z.string().trim().min(1).max(10000),
  tag: z.string().trim().min(1).max(60),
});

export const habitCreateSchema = z.object({
  text: z.string().trim().min(1).max(300),
  category: z.enum(['Físico', 'Mental', 'Emocional', 'Social']),
});

export const habitUpdateSchema = z
  .object({
    text: z.string().trim().min(1).max(300).optional(),
    completed: z.boolean().optional(),
    category: z.enum(['Físico', 'Mental', 'Emocional', 'Social']).optional(),
  })
  .refine(
    (data) =>
      data.text !== undefined ||
      data.completed !== undefined ||
      data.category !== undefined,
    { message: 'Debes enviar al menos un campo para actualizar' }
  );

export const reflectionCreateSchema = z.object({
  phrase: z.string().trim().min(3).max(1000),
  author: z.string().trim().min(1).max(100).nullable().optional(),
  show_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha esperado: YYYY-MM-DD')
    .nullable()
    .optional(),
  active: z.boolean().optional(),
});

export function parsePagination(
  query: Request['query'],
  defaultLimit = 20
): { skip: number; limit: number } {
  const rawSkip = Number(query.skip ?? 0);
  const rawLimit = Number(query.limit ?? defaultLimit);
  const skip = Number.isFinite(rawSkip) && rawSkip >= 0 ? Math.floor(rawSkip) : 0;
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.min(Math.floor(rawLimit), 100)
      : defaultLimit;
  return { skip, limit };
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const field = firstIssue?.path?.join('.');
      const message = field
        ? `${field}: ${firstIssue.message}`
        : firstIssue?.message || 'Datos de entrada inválidos';
      res.status(400).json({ detail: message });
      return;
    }
    req.body = parsed.data;
    next();
  };
}
