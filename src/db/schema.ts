import {
  boolean,
  date,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
});

export const users = pgTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  role_id: varchar('role_id', { length: 64 })
    .notNull()
    .references(() => roles.id),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
});

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  refresh_token_hash: varchar('refresh_token_hash', { length: 128 })
    .notNull()
    .unique(),
  device_name: varchar('device_name', { length: 255 }),
  ip_address: varchar('ip_address', { length: 100 }),
  location: varchar('location', { length: 255 }),
  last_active_at: timestamp('last_active_at', {
    withTimezone: true,
    mode: 'string',
  })
    .defaultNow()
    .notNull(),
  expires_at: timestamp('expires_at', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
});

export const articles = pgTable('articles', {
  id: varchar('id', { length: 64 }).primaryKey(),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  title: varchar('title', { length: 200 }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 80 }).notNull(),
  published_at: timestamp('published_at', {
    withTimezone: true,
    mode: 'string',
  })
    .defaultNow()
    .notNull(),
  author_id: varchar('author_id', { length: 64 }).references(() => users.id, {
    onDelete: 'set null',
  }),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
});

export const disorders = pgTable('disorders', {
  id: varchar('id', { length: 64 }).primaryKey(),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
});

export const symptoms = pgTable('symptoms', {
  id: varchar('id', { length: 64 }).primaryKey(),
  text: varchar('text', { length: 500 }).notNull(),
  disorder_id: varchar('disorder_id', { length: 64 })
    .notNull()
    .references(() => disorders.id, { onDelete: 'cascade' }),
});

export const testimonials = pgTable('testimonials', {
  id: varchar('id', { length: 64 }).primaryKey(),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  title: varchar('title', { length: 200 }).notNull(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  author_id: varchar('author_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 })
    .notNull()
    .default('pending')
    .$type<'pending' | 'approved' | 'rejected'>(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
});

export const dailyReflections = pgTable('daily_reflections', {
  id: varchar('id', { length: 64 }).primaryKey(),
  phrase: text('phrase').notNull(),
  author: varchar('author', { length: 100 }).default('Anónimo'),
  show_date: date('show_date', { mode: 'string' }).unique(),
  active: boolean('active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
});

export const diaries = pgTable('diaries', {
  id: varchar('id', { length: 64 }).primaryKey(),
  mood: varchar('mood', { length: 50 }).notNull(),
  text: text('text').notNull(),
  tag: varchar('tag', { length: 60 }).notNull(),
  user_id: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
});

export const habits = pgTable('habits', {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  text: varchar('text', { length: 300 }).notNull(),
  completed: boolean('completed').notNull().default(false),
  category: varchar('category', { length: 30 })
    .notNull()
    .$type<'Físico' | 'Mental' | 'Emocional' | 'Social'>(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
});
