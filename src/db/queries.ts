import { asc, desc, eq, and } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
  systemConfig,
  events,
  attendances,
  personalSchedules,
  scheduleTemplates,
  scheduleAssignments,
  classSchedules,
  permissions,
  type DetallePlantillaDb,
} from './schema.ts';
import { hashPassword } from '../lib/security.ts';

export type DbUserRow = typeof users.$inferSelect;

export function sanitizeUser(u: DbUserRow) {
  return {
    id: u.id,
    nombre: u.nombre,
    apellido: u.apellido,
    correo: u.correo,
    telefono: u.telefono ?? undefined,
    fecha_nacimiento: u.fechaNacimiento ?? undefined,
    hora_entrada: u.horaEntrada ?? '07:30',
    hora_salida: u.horaSalida ?? '15:30',
    limite_permisos: u.limitePermisos ?? 3,
    rol: u.rol,
    departamento: u.departamento ?? undefined,
    has_password: Boolean(u.passwordHash),
  };
}

export function sanitizePublicDirectoryUser(u: DbUserRow) {
  return {
    id: u.id,
    nombre: u.nombre,
    apellido: u.apellido,
    correo: u.correo,
    hora_entrada: u.horaEntrada ?? '07:30',
    hora_salida: u.horaSalida ?? '15:30',
    limite_permisos: u.limitePermisos ?? 3,
    rol: u.rol,
    departamento: u.departamento ?? undefined,
    has_password: Boolean(u.passwordHash),
  };
}

export async function isAdminClaimed(): Promise<boolean> {
  try {
    const directivos = await db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
        uid: users.uid,
      })
      .from(users)
      .where(eq(users.rol, 'directivo'));

    return directivos.some(d => Boolean(d.passwordHash) || Boolean(d.uid));
  } catch (error) {
    console.error('Database query failed in isAdminClaimed:', error);
    throw new Error('Error al verificar el estado inicial del sistema.', { cause: error });
  }
}

export async function ensureSystemConfigExists() {
  try {
    const rows = await db.select().from(systemConfig).limit(1);
    if (rows.length > 0) return rows[0];
    const [inserted] = await db
      .insert(systemConfig)
      .values({
        horaEntradaOficial: '07:30',
        horaSalidaOficial: '15:30',
        diasLaborables: [0, 1, 2, 3, 4],
        limitePermisos: 3,
      })
      .returning();
    return inserted;
  } catch (error) {
    console.error('Database query failed in ensureSystemConfigExists:', error);
    throw new Error('Error al inicializar parámetros del sistema.', { cause: error });
  }
}

export async function seedSampleStaffIfEmpty() {
  try {
    const existing = await db.select({ id: users.id }).from(users).limit(5);
    if (existing.length > 1) return;

    const sampleStaff = [
      {
        nombre: 'Carlos',
        apellido: 'Silva',
        correo: 'carlos.silva@institucion.edu',
        telefono: '0414-1112233',
        horaEntrada: '07:30',
        horaSalida: '15:30',
        limitePermisos: 3,
        rol: 'personal',
        departamento: 'Matemáticas y Ciencias',
      },
      {
        nombre: 'María',
        apellido: 'González',
        correo: 'maria.gonzalez@institucion.edu',
        telefono: '0416-2223344',
        horaEntrada: '07:30',
        horaSalida: '15:30',
        limitePermisos: 3,
        rol: 'personal',
        departamento: 'Lengua y Literatura',
      },
      {
        nombre: 'Juan',
        apellido: 'Pérez',
        correo: 'juan.perez@institucion.edu',
        telefono: '0424-3334455',
        horaEntrada: '07:00',
        horaSalida: '15:00',
        limitePermisos: 3,
        rol: 'obrero',
        departamento: 'Mantenimiento y Portería',
      },
      {
        nombre: 'Elena',
        apellido: 'Mendoza',
        correo: 'elena.mendoza@institucion.edu',
        telefono: '0412-5556677',
        horaEntrada: '07:30',
        horaSalida: '15:30',
        limitePermisos: 3,
        rol: 'administrativo',
        departamento: 'Control de Estudios y Secretaría',
      },
    ];

    for (const s of sampleStaff) {
      await db.insert(users).values(s).onConflictDoNothing({ target: users.correo });
    }
  } catch (error) {
    console.error('Database query failed in seedSampleStaffIfEmpty:', error);
    throw new Error('Error al inicializar nómina institucional.', { cause: error });
  }
}

export async function claimInitialAdmin(params: {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
}) {
  try {
    const claimed = await isAdminClaimed();
    if (claimed) {
      return { alreadyClaimed: true as const };
    }

    const cleanCorreo = params.correo.trim().toLowerCase();
    const passwordHash = hashPassword(params.password);

    const [adminUser] = await db
      .insert(users)
      .values({
        nombre: params.nombre.trim(),
        apellido: params.apellido.trim(),
        correo: cleanCorreo,
        passwordHash,
        telefono: '0412-0000000',
        horaEntrada: '07:30',
        horaSalida: '15:30',
        limitePermisos: 3,
        rol: 'directivo',
        departamento: 'Dirección General',
      })
      .onConflictDoUpdate({
        target: users.correo,
        set: {
          nombre: params.nombre.trim(),
          apellido: params.apellido.trim(),
          passwordHash,
          rol: 'directivo',
          departamento: 'Dirección General',
        },
      })
      .returning();

    await ensureSystemConfigExists();
    await seedSampleStaffIfEmpty();

    return { alreadyClaimed: false as const, user: adminUser };
  } catch (error) {
    console.error('Database query failed in claimInitialAdmin:', error);
    throw new Error('No se pudo configurar la cuenta de Dirección.', { cause: error });
  }
}

export async function getOrCreateGoogleUser(uid: string, email: string, displayName?: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const existingByUid = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existingByUid.length > 0) {
      return existingByUid[0];
    }

    const existingByEmail = await db.select().from(users).where(eq(users.correo, cleanEmail)).limit(1);
    if (existingByEmail.length > 0) {
      const [updated] = await db
        .update(users)
        .set({ uid })
        .where(eq(users.id, existingByEmail[0].id))
        .returning();
      return updated;
    }

    const claimed = await isAdminClaimed();
    const parts = (displayName || cleanEmail.split('@')[0] || 'Usuario').trim().split(/\s+/);
    const nombre = parts[0] || 'Usuario';
    const apellido = parts.slice(1).join(' ') || 'Institucional';

    const [created] = await db
      .insert(users)
      .values({
        uid,
        nombre,
        apellido,
        correo: cleanEmail,
        rol: claimed ? 'personal' : 'directivo',
        departamento: claimed ? 'Personal Docente' : 'Dirección General',
        horaEntrada: '07:30',
        horaSalida: '15:30',
        limitePermisos: 3,
      })
      .onConflictDoUpdate({
        target: users.correo,
        set: { uid },
      })
      .returning();

    await ensureSystemConfigExists();
    if (!claimed) {
      await seedSampleStaffIfEmpty();
    }
    return created;
  } catch (error) {
    console.error('Database query failed in getOrCreateGoogleUser:', error);
    throw new Error('No se pudo vincular la cuenta de Google.', { cause: error });
  }
}

export async function getUserById(id: number): Promise<DbUserRow | null> {
  try {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in getUserById:', error);
    throw new Error('Error al consultar usuario.', { cause: error });
  }
}

export async function findUserByIdentifier(identifier: string): Promise<DbUserRow | null> {
  try {
    const clean = identifier.trim().toLowerCase();
    const allUsers = await db.select().from(users).orderBy(asc(users.id));
    const exactMatch = allUsers.find(u => {
      const mail = u.correo.toLowerCase();
      const shortName = mail.split('@')[0];
      const fullName = `${u.nombre} ${u.apellido}`.toLowerCase();
      return mail === clean || shortName === clean || fullName === clean;
    });
    if (exactMatch) return exactMatch;

    const firstNameMatches = allUsers.filter(u => u.nombre.trim().toLowerCase() === clean);
    return firstNameMatches.length === 1 ? firstNameMatches[0] : null;
  } catch (error) {
    console.error('Database query failed in findUserByIdentifier:', error);
    throw new Error('Error al buscar usuario.', { cause: error });
  }
}

export async function getAllBootstrapData(authUser: DbUserRow) {
  try {
    const cfg = await ensureSystemConfigExists();
    const isDirectivo = authUser.rol === 'directivo';

    const [
      allUsers,
      allEvents,
      allAttendances,
      allPersonalSchedules,
      allTemplates,
      allAssignments,
      allClasses,
      allPermissions,
    ] = await Promise.all([
      db.select().from(users).orderBy(asc(users.id)),
      db.select().from(events).orderBy(asc(events.id)),
      isDirectivo
        ? db.select().from(attendances).orderBy(desc(attendances.id))
        : db.select().from(attendances).where(eq(attendances.usuarioId, authUser.id)).orderBy(desc(attendances.id)),
      isDirectivo
        ? db.select().from(personalSchedules).orderBy(asc(personalSchedules.id))
        : db.select().from(personalSchedules).where(eq(personalSchedules.usuarioId, authUser.id)),
      db.select().from(scheduleTemplates).orderBy(asc(scheduleTemplates.id)),
      db.select().from(scheduleAssignments).orderBy(desc(scheduleAssignments.id)),
      isDirectivo
        ? db.select().from(classSchedules).orderBy(asc(classSchedules.id))
        : db.select().from(classSchedules).where(eq(classSchedules.usuarioId, authUser.id)),
      isDirectivo
        ? db.select().from(permissions).orderBy(desc(permissions.id))
        : db.select().from(permissions).where(eq(permissions.usuarioId, authUser.id)).orderBy(desc(permissions.id)),
    ]);

    return {
      currentUser: sanitizeUser(authUser),
      users: isDirectivo ? allUsers.map(sanitizeUser) : allUsers.map(sanitizePublicDirectoryUser),
      events: allEvents.map(e => ({
        id: e.id,
        titulo: e.titulo,
        fecha_inicio: e.fechaInicio,
        fecha_fin: e.fechaFin,
        tipo: e.tipo,
        profesor_id: e.profesorId,
      })),
      attendances: allAttendances.map(a => ({
        id: a.id,
        usuario_id: a.usuarioId,
        fecha: a.fecha,
        hora_registro: a.horaRegistro,
        estado: a.estado,
        minutos_retraso: a.minutosRetraso,
        registrada_manualmente: Boolean(a.registradaManualmente),
        motivo: a.motivo ?? undefined,
        observaciones: a.observaciones ?? undefined,
        archivo_adjunto: a.archivoAdjunto ?? undefined,
      })),
      config: {
        id: cfg.id,
        hora_entrada_oficial: cfg.horaEntradaOficial,
        hora_salida_oficial: cfg.horaSalidaOficial ?? '15:30',
        dias_laborables: cfg.diasLaborables,
        limite_permisos: cfg.limitePermisos,
      },
      personalSchedules: allPersonalSchedules.map(h => ({
        id: h.id,
        usuario_id: h.usuarioId,
        dia_semana: h.diaSemana,
        hora_entrada: h.horaEntrada,
        hora_salida: h.horaSalida,
      })),
      templates: allTemplates.map(t => ({
        id: t.id,
        nombre: t.nombre,
        descripcion: t.descripcion ?? undefined,
        activa: t.activa,
        detalles: t.detalles,
      })),
      assignments: allAssignments.map(a => ({
        id: a.id,
        plantilla_id: a.plantillaId,
        usuario_id: a.usuarioId,
        rol: a.rol,
        departamento: a.departamento,
        fecha_inicio: a.fechaInicio,
        fecha_fin: a.fechaFin,
        prioridad: a.prioridad,
        creada_en: a.creadaEn,
      })),
      classes: allClasses.map(c => ({
        id: c.id,
        usuario_id: c.usuarioId,
        curso: c.curso,
        nombre: c.nombre,
        tipo: c.tipo,
        dia_semana: c.diaSemana,
        hora_inicio: c.horaInicio,
        hora_fin: c.horaFin,
        aula: c.aula ?? undefined,
      })),
      permissions: allPermissions.map(p => ({
        id: p.id,
        usuario_id: p.usuarioId,
        fecha_inicio: p.fechaInicio,
        fecha_fin: p.fechaFin,
        motivo: p.motivo,
        observaciones: p.observaciones ?? undefined,
        archivo_adjunto: p.archivoAdjunto ?? undefined,
        estado: p.estado,
        creado_en: p.creadoEn,
      })),
    };
  } catch (error) {
    console.error('Database query failed in getAllBootstrapData:', error);
    throw new Error('Error al cargar los datos institucionales.', { cause: error });
  }
}

export async function createUserRecord(data: {
  nombre: string;
  apellido: string;
  correo: string;
  password?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  hora_entrada?: string;
  hora_salida?: string;
  limite_permisos?: number;
  rol: string;
  departamento?: string;
}) {
  try {
    const cleanMail = data.correo.trim().toLowerCase();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.correo, cleanMail)).limit(1);
    if (existing.length > 0) {
      return { conflict: true as const };
    }

    const passwordHash = data.password?.trim() ? hashPassword(data.password.trim()) : null;

    const [created] = await db
      .insert(users)
      .values({
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        correo: cleanMail,
        passwordHash,
        telefono: data.telefono?.trim() || null,
        fechaNacimiento: data.fecha_nacimiento || null,
        horaEntrada: data.hora_entrada || '07:30',
        horaSalida: data.hora_salida || '15:30',
        limitePermisos: data.limite_permisos ?? 3,
        rol: data.rol || 'personal',
        departamento: data.departamento?.trim() || null,
      })
      .returning();

    return { conflict: false as const, user: sanitizeUser(created) };
  } catch (error) {
    console.error('Database query failed in createUserRecord:', error);
    throw new Error('No se pudo crear el funcionario.', { cause: error });
  }
}

export async function updateUserRecord(
  id: number,
  data: {
    nombre?: string;
    apellido?: string;
    telefono?: string | null;
    fecha_nacimiento?: string | null;
    hora_entrada?: string;
    hora_salida?: string;
    limite_permisos?: number;
    rol?: string;
    departamento?: string | null;
    password?: string;
  }
) {
  try {
    const patch: Record<string, unknown> = {};
    if (data.nombre !== undefined) patch.nombre = data.nombre.trim();
    if (data.apellido !== undefined) patch.apellido = data.apellido.trim();
    if (data.telefono !== undefined) patch.telefono = data.telefono || null;
    if (data.fecha_nacimiento !== undefined) patch.fechaNacimiento = data.fecha_nacimiento || null;
    if (data.hora_entrada !== undefined) patch.horaEntrada = data.hora_entrada;
    if (data.hora_salida !== undefined) patch.horaSalida = data.hora_salida;
    if (data.limite_permisos !== undefined) patch.limitePermisos = data.limite_permisos;
    if (data.rol !== undefined) patch.rol = data.rol;
    if (data.departamento !== undefined) patch.departamento = data.departamento || null;
    if (data.password && data.password.trim()) {
      patch.passwordHash = hashPassword(data.password.trim());
    }

    const [updated] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
    return updated ? sanitizeUser(updated) : null;
  } catch (error) {
    console.error('Database query failed in updateUserRecord:', error);
    throw new Error('No se pudo actualizar el funcionario.', { cause: error });
  }
}

export async function deleteUserRecord(id: number) {
  try {
    await db.delete(users).where(eq(users.id, id));
  } catch (error) {
    console.error('Database query failed in deleteUserRecord:', error);
    throw new Error('No se pudo eliminar el funcionario.', { cause: error });
  }
}

export async function updateSystemConfigRecord(data: {
  hora_entrada_oficial?: string;
  hora_salida_oficial?: string;
  dias_laborables?: number[];
  limite_permisos?: number;
}) {
  try {
    const cfg = await ensureSystemConfigExists();
    const [updated] = await db
      .update(systemConfig)
      .set({
        ...(data.hora_entrada_oficial !== undefined ? { horaEntradaOficial: data.hora_entrada_oficial } : {}),
        ...(data.hora_salida_oficial !== undefined ? { horaSalidaOficial: data.hora_salida_oficial } : {}),
        ...(data.dias_laborables !== undefined ? { diasLaborables: data.dias_laborables } : {}),
        ...(data.limite_permisos !== undefined ? { limitePermisos: data.limite_permisos } : {}),
      })
      .where(eq(systemConfig.id, cfg.id))
      .returning();

    return {
      id: updated.id,
      hora_entrada_oficial: updated.horaEntradaOficial,
      hora_salida_oficial: updated.horaSalidaOficial ?? '15:30',
      dias_laborables: updated.diasLaborables,
      limite_permisos: updated.limitePermisos,
    };
  } catch (error) {
    console.error('Database query failed in updateSystemConfigRecord:', error);
    throw new Error('No se pudo actualizar la configuración.', { cause: error });
  }
}

export async function createEventRecord(data: {
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: string;
  profesor_id?: number | null;
}) {
  try {
    const [created] = await db
      .insert(events)
      .values({
        titulo: data.titulo.trim(),
        fechaInicio: data.fecha_inicio,
        fechaFin: data.fecha_fin,
        tipo: data.tipo,
        profesorId: data.profesor_id ?? null,
      })
      .returning();
    return {
      id: created.id,
      titulo: created.titulo,
      fecha_inicio: created.fechaInicio,
      fecha_fin: created.fechaFin,
      tipo: created.tipo,
      profesor_id: created.profesorId,
    };
  } catch (error) {
    console.error('Database query failed in createEventRecord:', error);
    throw new Error('No se pudo crear el evento.', { cause: error });
  }
}

export async function updateEventRecord(
  id: number,
  data: {
    titulo?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    tipo?: string;
    profesor_id?: number | null;
  }
) {
  try {
    const [updated] = await db
      .update(events)
      .set({
        ...(data.titulo !== undefined ? { titulo: data.titulo.trim() } : {}),
        ...(data.fecha_inicio !== undefined ? { fechaInicio: data.fecha_inicio } : {}),
        ...(data.fecha_fin !== undefined ? { fechaFin: data.fecha_fin } : {}),
        ...(data.tipo !== undefined ? { tipo: data.tipo } : {}),
        ...(data.profesor_id !== undefined ? { profesorId: data.profesor_id } : {}),
      })
      .where(eq(events.id, id))
      .returning();

    return updated
      ? {
          id: updated.id,
          titulo: updated.titulo,
          fecha_inicio: updated.fechaInicio,
          fecha_fin: updated.fechaFin,
          tipo: updated.tipo,
          profesor_id: updated.profesorId,
        }
      : null;
  } catch (error) {
    console.error('Database query failed in updateEventRecord:', error);
    throw new Error('No se pudo actualizar el evento.', { cause: error });
  }
}

export async function deleteEventRecord(id: number) {
  try {
    await db.delete(events).where(eq(events.id, id));
  } catch (error) {
    console.error('Database query failed in deleteEventRecord:', error);
    throw new Error('No se pudo eliminar el evento.', { cause: error });
  }
}

export async function upsertAttendanceRecord(data: {
  usuario_id: number;
  fecha: string;
  hora_registro: string;
  estado: string;
  minutos_retraso: number;
  registrada_manualmente: boolean;
  motivo?: string;
  observaciones?: string;
  archivo_adjunto?: string;
  replaceSameDay?: boolean;
}) {
  try {
    if (data.replaceSameDay) {
      await db
        .delete(attendances)
        .where(and(eq(attendances.usuarioId, data.usuario_id), eq(attendances.fecha, data.fecha)));
    }
    const [created] = await db
      .insert(attendances)
      .values({
        usuarioId: data.usuario_id,
        fecha: data.fecha,
        horaRegistro: data.hora_registro,
        estado: data.estado,
        minutosRetraso: data.minutos_retraso,
        registradaManualmente: data.registrada_manualmente,
        motivo: data.motivo || null,
        observaciones: data.observaciones || null,
        archivoAdjunto: data.archivo_adjunto || null,
      })
      .returning();

    return {
      id: created.id,
      usuario_id: created.usuarioId,
      fecha: created.fecha,
      hora_registro: created.horaRegistro,
      estado: created.estado,
      minutos_retraso: created.minutosRetraso,
      registrada_manualmente: Boolean(created.registradaManualmente),
      motivo: created.motivo ?? undefined,
      observaciones: created.observaciones ?? undefined,
      archivo_adjunto: created.archivoAdjunto ?? undefined,
    };
  } catch (error) {
    console.error('Database query failed in upsertAttendanceRecord:', error);
    throw new Error('No se pudo guardar el registro de asistencia.', { cause: error });
  }
}

export async function updateAttendanceStatusRecord(id: number, estado: string) {
  try {
    const [updated] = await db
      .update(attendances)
      .set({ estado })
      .where(eq(attendances.id, id))
      .returning();
    return updated
      ? {
          id: updated.id,
          usuario_id: updated.usuarioId,
          estado: updated.estado,
        }
      : null;
  } catch (error) {
    console.error('Database query failed in updateAttendanceStatusRecord:', error);
    throw new Error('No se pudo actualizar el estado de la asistencia.', { cause: error });
  }
}

export async function createPermissionRecord(data: {
  usuario_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  observaciones?: string;
  archivo_adjunto?: string;
}) {
  try {
    const [created] = await db
      .insert(permissions)
      .values({
        usuarioId: data.usuario_id,
        fechaInicio: data.fecha_inicio,
        fechaFin: data.fecha_fin,
        motivo: data.motivo,
        observaciones: data.observaciones || null,
        archivoAdjunto: data.archivo_adjunto || null,
        estado: 'Pendiente',
        creadoEn: new Date().toISOString(),
      })
      .returning();

    return {
      id: created.id,
      usuario_id: created.usuarioId,
      fecha_inicio: created.fechaInicio,
      fecha_fin: created.fechaFin,
      motivo: created.motivo,
      observaciones: created.observaciones ?? undefined,
      archivo_adjunto: created.archivoAdjunto ?? undefined,
      estado: created.estado,
      creado_en: created.creadoEn,
    };
  } catch (error) {
    console.error('Database query failed in createPermissionRecord:', error);
    throw new Error('No se pudo registrar la solicitud de permiso.', { cause: error });
  }
}

export async function updatePermissionStatusRecord(id: number, estado: 'Aprobado' | 'Rechazado') {
  try {
    const [updated] = await db
      .update(permissions)
      .set({ estado })
      .where(eq(permissions.id, id))
      .returning();
    return updated
      ? {
          id: updated.id,
          usuario_id: updated.usuarioId,
          estado: updated.estado,
        }
      : null;
  } catch (error) {
    console.error('Database query failed in updatePermissionStatusRecord:', error);
    throw new Error('No se pudo actualizar la solicitud de permiso.', { cause: error });
  }
}

export async function savePersonalScheduleRecords(
  usuarioId: number,
  jornadas: { dia_semana: number; hora_entrada: string; hora_salida: string }[]
) {
  try {
    await db.delete(personalSchedules).where(eq(personalSchedules.usuarioId, usuarioId));
    if (jornadas.length === 0) return [];
    const inserted = await db
      .insert(personalSchedules)
      .values(
        jornadas.map(j => ({
          usuarioId,
          diaSemana: j.dia_semana,
          horaEntrada: j.hora_entrada,
          horaSalida: j.hora_salida,
        }))
      )
      .returning();
    return inserted.map(h => ({
      id: h.id,
      usuario_id: h.usuarioId,
      dia_semana: h.diaSemana,
      hora_entrada: h.horaEntrada,
      hora_salida: h.horaSalida,
    }));
  } catch (error) {
    console.error('Database query failed in savePersonalScheduleRecords:', error);
    throw new Error('No se pudo guardar el horario personal.', { cause: error });
  }
}

export async function saveClassScheduleRecords(
  usuarioId: number,
  curso: string,
  clases: {
    nombre: string;
    tipo: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    aula?: string;
  }[]
) {
  try {
    await db
      .delete(classSchedules)
      .where(and(eq(classSchedules.usuarioId, usuarioId), eq(classSchedules.curso, curso)));

    if (clases.length === 0) return [];
    const inserted = await db
      .insert(classSchedules)
      .values(
        clases.map(c => ({
          usuarioId,
          curso,
          nombre: c.nombre,
          tipo: c.tipo,
          diaSemana: c.dia_semana,
          horaInicio: c.hora_inicio,
          horaFin: c.hora_fin,
          aula: c.aula || null,
        }))
      )
      .returning();

    return inserted.map(c => ({
      id: c.id,
      usuario_id: c.usuarioId,
      curso: c.curso,
      nombre: c.nombre,
      tipo: c.tipo,
      dia_semana: c.diaSemana,
      hora_inicio: c.horaInicio,
      hora_fin: c.horaFin,
      aula: c.aula ?? undefined,
    }));
  } catch (error) {
    console.error('Database query failed in saveClassScheduleRecords:', error);
    throw new Error('No se pudo guardar el horario de clases.', { cause: error });
  }
}

export async function createTemplateRecord(data: {
  nombre: string;
  descripcion?: string;
  detalles: DetallePlantillaDb[];
}) {
  try {
    const [created] = await db
      .insert(scheduleTemplates)
      .values({
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        activa: true,
        detalles: data.detalles,
      })
      .returning();
    return {
      id: created.id,
      nombre: created.nombre,
      descripcion: created.descripcion ?? undefined,
      activa: created.activa,
      detalles: created.detalles,
    };
  } catch (error) {
    console.error('Database query failed in createTemplateRecord:', error);
    throw new Error('No se pudo crear la plantilla de horario.', { cause: error });
  }
}

export async function toggleTemplateRecord(id: number) {
  try {
    const existing = await db.select().from(scheduleTemplates).where(eq(scheduleTemplates.id, id)).limit(1);
    if (existing.length === 0) return null;
    const [updated] = await db
      .update(scheduleTemplates)
      .set({ activa: !existing[0].activa })
      .where(eq(scheduleTemplates.id, id))
      .returning();
    return updated;
  } catch (error) {
    console.error('Database query failed in toggleTemplateRecord:', error);
    throw new Error('No se pudo cambiar el estado de la plantilla.', { cause: error });
  }
}

export async function createAssignmentRecord(data: {
  plantilla_id: number;
  usuario_id?: number | null;
  rol?: string | null;
  departamento?: string | null;
  fecha_inicio: string;
  fecha_fin?: string | null;
  prioridad: number;
}) {
  try {
    const [created] = await db
      .insert(scheduleAssignments)
      .values({
        plantillaId: data.plantilla_id,
        usuarioId: data.usuario_id ?? null,
        rol: data.rol ?? null,
        departamento: data.departamento ?? null,
        fechaInicio: data.fecha_inicio,
        fechaFin: data.fecha_fin ?? null,
        prioridad: data.prioridad,
        creadaEn: new Date().toISOString(),
      })
      .returning();
    return {
      id: created.id,
      plantilla_id: created.plantillaId,
      usuario_id: created.usuarioId,
      rol: created.rol,
      departamento: created.departamento,
      fecha_inicio: created.fechaInicio,
      fecha_fin: created.fechaFin,
      prioridad: created.prioridad,
      creada_en: created.creadaEn,
    };
  } catch (error) {
    console.error('Database query failed in createAssignmentRecord:', error);
    throw new Error('No se pudo asignar la plantilla de horario.', { cause: error });
  }
}

export async function deleteAssignmentRecord(id: number) {
  try {
    await db.delete(scheduleAssignments).where(eq(scheduleAssignments.id, id));
  } catch (error) {
    console.error('Database query failed in deleteAssignmentRecord:', error);
    throw new Error('No se pudo eliminar la asignación.', { cause: error });
  }
}

export async function resetOperationalData() {
  try {
    await Promise.all([
      db.delete(attendances),
      db.delete(events),
      db.delete(personalSchedules),
      db.delete(scheduleAssignments),
      db.delete(classSchedules),
      db.delete(permissions),
      db.delete(scheduleTemplates),
    ]);
    await updateSystemConfigRecord({
      hora_entrada_oficial: '07:30',
      hora_salida_oficial: '15:30',
      dias_laborables: [0, 1, 2, 3, 4],
      limite_permisos: 3,
    });
  } catch (error) {
    console.error('Database query failed in resetOperationalData:', error);
    throw new Error('No se pudieron restablecer los registros.', { cause: error });
  }
}
