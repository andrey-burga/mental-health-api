import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, pool } from './index.js';
import {
  articles,
  dailyReflections,
  disorders,
  roles,
  symptoms,
  testimonials,
  users,
} from './schema.js';

const LOCKED_PASSWORD_MARKER = '!LOCKED_SET_ADMIN_INITIAL_PASSWORD';

export async function seedDatabase(): Promise<void> {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // 1. Seed base roles
  await db
    .insert(roles)
    .values([
      { id: 'role-admin', name: 'admin' },
      { id: 'role-editor', name: 'editor' },
      { id: 'role-user', name: 'user' },
    ])
    .onConflictDoNothing();

  // 2. Seed editorial admin user (uses ADMIN_INITIAL_PASSWORD when configured)
  const seedAdminId = 'user-editorial-1';
  const adminInitialPassword = process.env.ADMIN_INITIAL_PASSWORD?.trim();
  const passwordHash =
    adminInitialPassword && adminInitialPassword.length >= 8
      ? await bcrypt.hash(adminInitialPassword, 12)
      : LOCKED_PASSWORD_MARKER;

  if (!adminInitialPassword) {
    console.warn(
      '[Seed] ADMIN_INITIAL_PASSWORD no configurada: la cuenta editorial admin permanece bloqueada hasta definir esa variable.'
    );
  }

  await db
    .insert(users)
    .values({
      id: seedAdminId,
      email: 'editorial@mentalhealth.local',
      password: passwordHash,
      name: 'Equipo Editorial',
      role_id: 'role-admin',
      created_at: now,
    })
    .onConflictDoNothing();

  // If ADMIN_INITIAL_PASSWORD was configured after initial locked seed, activate it safely
  if (adminInitialPassword && adminInitialPassword.length >= 8) {
    const existingAdmin = await db
      .select({ id: users.id, password: users.password })
      .from(users)
      .where(eq(users.id, seedAdminId))
      .limit(1);

    if (
      existingAdmin[0] &&
      existingAdmin[0].password === LOCKED_PASSWORD_MARKER
    ) {
      await db
        .update(users)
        .set({ password: passwordHash })
        .where(eq(users.id, seedAdminId));
    }
  }

  // 3. Seed disorders & symptoms
  await db
    .insert(disorders)
    .values({
      id: 'dis-1',
      slug: 'trastorno-ansiedad-generalizada',
      title: 'Trastorno de Ansiedad Generalizada',
      description:
        'Preocupación persistente y excesiva difícil de controlar sobre situaciones cotidianas.',
    })
    .onConflictDoNothing();

  await db
    .insert(symptoms)
    .values([
      {
        id: 'sym-1',
        text: 'Inquietud o sensación de estar atrapado o con los nervios de punta',
        disorder_id: 'dis-1',
      },
      {
        id: 'sym-2',
        text: 'Dificultad para concentrarse o tener la mente en blanco',
        disorder_id: 'dis-1',
      },
    ])
    .onConflictDoNothing();

  // 4. Seed initial article
  await db
    .insert(articles)
    .values({
      id: 'art-1',
      slug: 'manejo-ansiedad-diaria',
      title: 'Estrategias prácticas para manejar la ansiedad diaria',
      description:
        'Técnicas de respiración y atención plena aplicables en cualquier momento del día.',
      excerpt:
        'Aprende herramientas simples de regulación emocional para reducir la sobrecarga mental.',
      content:
        'La ansiedad cotidiana suele amplificarse cuando intentamos evitarla. Practicar respiración diafragmática durante cuatro minutos, identificar pensamientos catastróficos y dividir las tareas en pasos pequeños ayuda a recuperar la sensación de control.',
      category: 'Ansiedad',
      published_at: now,
      author_id: seedAdminId,
      created_at: now,
    })
    .onConflictDoNothing();

  // 5. Seed daily reflections
  await db
    .insert(dailyReflections)
    .values([
      {
        id: 'refl-1',
        phrase: 'Cuidar tu mente es un acto diario de respeto hacia ti mismo.',
        author: 'Equipo de Bienestar',
        show_date: today,
        active: true,
        created_at: now,
      },
      {
        id: 'refl-2',
        phrase:
          'Un paso pequeño en calma vale más que diez pasos en agotamiento.',
        author: 'Anónimo',
        show_date: null,
        active: true,
        created_at: now,
      },
    ])
    .onConflictDoNothing();

  // 6. Seed approved testimonial
  await db
    .insert(testimonials)
    .values({
      id: 'test-1',
      slug: 'mi-proceso-con-el-diario-emocional',
      title: 'Cómo escribir cada noche me ayudó a ordenar mis pensamientos',
      excerpt:
        'Registrar mis emociones durante tres semanas cambió mi relación con el estrés.',
      content:
        'Al principio me costaba poner en palabras lo que sentía, pero dedicar cinco minutos antes de dormir a registrar mi estado de ánimo me permitió detectar patrones y pedir apoyo a tiempo.',
      author_id: seedAdminId,
      status: 'approved',
      created_at: now,
    })
    .onConflictDoNothing();
}

const isDirectExecution =
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'));

if (isDirectExecution) {
  seedDatabase()
    .then(async () => {
      console.log('[Seed] Base de datos inicializada correctamente.');
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed] Error inicializando base de datos:', err);
      await pool.end();
      process.exit(1);
    });
}
