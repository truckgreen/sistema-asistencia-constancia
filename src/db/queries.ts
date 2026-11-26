import { and, desc, eq, or } from 'drizzle-orm';
import { db } from './index.ts';
import {
  attendances,
  classSchedules,
  events,
  permissions,
  personalSchedules,
  scheduleAssignments,
  scheduleTemplates,
  systemConfig,
  users,
} from './schema.ts';
import type {
  AsignacionHorario,
  AsistenciaDiaria,
  ClaseHorario,
  Configuracion,
  EstadoAsistencia,
  EstadoPermiso,
  Evento,
  HorarioPersonal,
  Permiso,
  PlantillaHorario,
  RolUsuario,
  TipoEvento,
  Usuario,
} from '../types/index.ts';

type UserRow = typeof users.$inferSelect;

export interface AuthUserRecord {
  usuario: Usuario;
  passwordHash: string | null;
  uid: string | null;
}

function toUsuario(row: UserRow): Usuario {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    correo: row.correo,
    telefono: row.telefono ?? undefined,
    fecha_nacimiento: row.fechaNacimiento ?? undefined,
    hora_entrada: row.horaEntrada ?? '07:30',
    hora_salida: row.horaSalida ?? '15:30',
    limite_permisos: row.limitePermisos ?? 3,
    rol: row.rol as RolUsuario,
    departamento: row.departamento ?? undefined,
  };
}

function toEvento(row: typeof events.$inferSelect): Evento {
  return {
    id: row.id,
    titulo: row.titulo,
    fecha_inicio: row.fechaInicio,
    fecha_fin: row.fechaFin,
    tipo: row.tipo as TipoEvento,
    profesor_id: row.profesorId ?? null,
  };
}

function toAsistencia(row: typeof attendances.$inferSelect): AsistenciaDiaria {
  return {
    id: row.id,
    usuario_id: row.usuarioId,
    fecha: row.fecha,
    hora_registro: row.horaRegistro,
    estado: row.estado as EstadoAsistencia,
    minutos_retraso: row.minutosRetraso,
    registrada_manualmente: row.registradaManualmente ?? false,
    motivo: row.motivo ?? undefined,
    observaciones: row.observaciones ?? undefined,
    archivo_adjunto: row.archivoAdjunto ?? undefined,
  };
}

function toConfig(row: typeof systemConfig.$inferSelect): Configuracion {
  return {
    id: row.id,
    hora_entrada_oficial: row.horaEntradaOficial,
    hora_salida_oficial: row.horaSalidaOficial ?? '15:30',
    dias_laborables: row.diasLaborables,
    limite_permisos: row.limitePermisos,
  };
}

function toHorarioPersonal(row: typeof personalSchedules.$inferSelect): HorarioPersonal {
  return {
    id: row.id,
    usuario_id: row.usuarioId,
    dia_semana: row.diaSemana,
    hora_entrada: row.horaEntrada,
    hora_salida: row.horaSalida,
  };
}

function toPlantilla(row: typeof scheduleTemplates.$inferSelect): PlantillaHorario {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? undefined,
    activa: row.activa,
    detalles: row.detalles,
  };
}

function toAsignacion(row: typeof scheduleAssignments.$inferSelect): AsignacionHorario {
  return {
    id: row.id,
    plantilla_id: row.plantillaId,
    usuario_id: row.usuarioId ?? null,
    rol: row.rol ?? null,
    departamento: row.departamento ?? null,
    fecha_inicio: row.fechaInicio,
    fecha_fin: row.fechaFin ?? null,
    prioridad: row.prioridad,
    creada_en: row.creadaEn,
  };
}

function toClase(row: typeof classSchedules.$inferSelect): ClaseHorario {
  return {
    id: row.id,
    usuario_id: row.usuarioId,
    curso: row.curso,
    nombre: row.nombre,
    tipo: row.tipo as 'clase' | 'receso',
    dia_semana: row.diaSemana,
    hora_inicio: row.horaInicio,
    hora_fin: row.horaFin,
    aula: row.aula ?? undefined,
  };
}

function toPermiso(row: typeof permissions.$inferSelect): Permiso {
  return {
    id: row.id,
    usuario_id: row.usuarioId,
    fecha_inicio: row.fechaInicio,
    fecha_fin: row.fechaFin,
    motivo: row.motivo,
    observaciones: row.observaciones ?? undefined,
    archivo_adjunto: row.archivoAdjunto ?? undefined,
    estado: row.estado as EstadoPermiso,
    creado_en: row.creadoEn,
  };
}

export async function countDirectivos(): Promise<number> {
  try {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.rol, 'directivo'));
    return rows.length;
  } catch (error) {
    console.error('Database query failed (countDirectivos):', error);
    throw new Error('Error al consultar el estado inicial del sistema.', { cause: error });
  }
}

export async function findAuthUserByEmail(correo: string): Promise<AuthUserRecord | null> {
  try {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.correo, correo.trim().toLowerCase()))
      .limit(1);
    if (!row) return null;
    return { usuario: toUsuario(row), passwordHash: row.passwordHash, uid: row.uid };
  } catch (error) {
    console.error('Database query failed (findAuthUserByEmail):', error);
    throw new Error('Error al consultar usuario por correo.', { cause: error });
  }
}

export async function findUserById(id: number): Promise<Usuario | null> {
  try {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toUsuario(row) : null;
  } catch (error) {
    console.error('Database query failed (findUserById):', error);
    throw new Error('Error al consultar usuario.', { cause: error });
  }
}

export async function findUserByUid(uid: string): Promise<Usuario | null> {
  try {
    const [row] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return row ? toUsuario(row) : null;
  } catch (error) {
    console.error('Database query failed (findUserByUid):', error);
    throw new Error('Error al consultar usuario por UID.', { cause: error });
  }
}

export async function findUserByEmail(correo: string): Promise<Usuario | null> {
  try {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.correo, correo.trim().toLowerCase()))
      .limit(1);
    return row ? toUsuario(row) : null;
  } catch (error) {
    console.error('Database query failed (findUserByEmail):', error);
    throw new Error('Error al consultar usuario por correo.', { cause: error });
  }
}

export async function linkUserUid(userId: number, uid: string): Promise<Usuario> {
  try {
    const [updated] = await db
      .update(users)
      .set({ uid })
      .where(eq(users.id, userId))
      .returning();
    return toUsuario(updated);
  } catch (error) {
    console.error('Database query failed (linkUserUid):', error);
    throw new Error('Error al vincular cuenta de Google.', { cause: error });
  }
}

export async function createBootstrapAdmin(data: {
  uid?: string | null;
  nombre: string;
  apellido: string;
  correo: string;
  passwordHash: string | null;
}): Promise<Usuario | null> {
  try {
    return await db.transaction(async (tx) => {
      const existingAdmins = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.rol, 'directivo'));
      if (existingAdmins.length > 0) {
        return null;
      }

      const [created] = await tx
        .insert(users)
        .values({
          uid: data.uid ?? null,
          nombre: data.nombre.trim(),
          apellido: data.apellido.trim(),
          correo: data.correo.trim().toLowerCase(),
          passwordHash: data.passwordHash,
          rol: 'directivo',
          departamento: 'Dirección General',
          horaEntrada: '07:30',
          horaSalida: '15:30',
          limitePermisos: 3,
        })
        .returning();

      const existingCfg = await tx.select().from(systemConfig).limit(1);
      if (existingCfg.length === 0) {
        await tx.insert(systemConfig).values({
          horaEntradaOficial: '07:30',
          horaSalidaOficial: '15:30',
          diasLaborables: [0, 1, 2, 3, 4],
          limitePermisos: 3,
        });
      }

      return toUsuario(created);
    });
  } catch (error) {
    console.error('Database query failed (createBootstrapAdmin):', error);
    throw new Error('Error al registrar el directivo inicial.', { cause: error });
  }
}

export async function getOrCreateSystemConfig(): Promise<Configuracion> {
  try {
    const [existing] = await db.select().from(systemConfig).limit(1);
    if (existing) return toConfig(existing);

    const [created] = await db
      .insert(systemConfig)
      .values({
        horaEntradaOficial: '07:30',
        horaSalidaOficial: '15:30',
        diasLaborables: [0, 1, 2, 3, 4],
        limitePermisos: 3,
      })
      .returning();
    return toConfig(created);
  } catch (error) {
    console.error('Database query failed (getOrCreateSystemConfig):', error);
    throw new Error('Error al obtener configuración del sistema.', { cause: error });
  }
}

export async function updateSystemConfig(data: Partial<Configuracion>): Promise<Configuracion> {
  try {
    const current = await getOrCreateSystemConfig();
    const [updated] = await db
      .update(systemConfig)
      .set({
        horaEntradaOficial: data.hora_entrada_oficial ?? current.hora_entrada_oficial,
        horaSalidaOficial: data.hora_salida_oficial ?? current.hora_salida_oficial,
        diasLaborables: data.dias_laborables ?? current.dias_laborables,
        limitePermisos: data.limite_permisos ?? current.limite_permisos,
      })
      .where(eq(systemConfig.id, current.id!))
      .returning();
    return toConfig(updated);
  } catch (error) {
    console.error('Database query failed (updateSystemConfig):', error);
    throw new Error('Error al actualizar configuración.', { cause: error });
  }
}

export async function getBootstrapDataForUser(user: Usuario) {
  try {
    const cfg = await getOrCreateSystemConfig();
    const isDirectivo = user.rol === 'directivo';

    if (isDirectivo) {
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
        db.select().from(users).orderBy(users.id),
        db.select().from(events).orderBy(events.fechaInicio),
        db.select().from(attendances).orderBy(desc(attendances.id)),
        db.select().from(personalSchedules),
        db.select().from(scheduleTemplates).orderBy(scheduleTemplates.id),
        db.select().from(scheduleAssignments).orderBy(desc(scheduleAssignments.id)),
        db.select().from(classSchedules),
        db.select().from(permissions).orderBy(desc(permissions.id)),
      ]);

      return {
        currentUser: user,
        users: allUsers.map(toUsuario),
        events: allEvents.map(toEvento),
        attendances: allAttendances.map(toAsistencia),
        config: cfg,
        personalSchedules: allPersonalSchedules.map(toHorarioPersonal),
        templates: allTemplates.map(toPlantilla),
        assignments: allAssignments.map(toAsignacion),
        classes: allClasses.map(toClase),
        permissions: allPermissions.map(toPermiso),
      };
    }

    const [
      ownEvents,
      ownAttendances,
      ownSchedules,
      allTemplates,
      allAssignments,
      ownClasses,
      ownPermissions,
    ] = await Promise.all([
      db
        .select()
        .from(events)
        .where(or(eq(events.tipo, 'feriado'), eq(events.tipo, 'institucional'), eq(events.profesorId, user.id))),
      db
        .select()
        .from(attendances)
        .where(eq(attendances.usuarioId, user.id))
        .orderBy(desc(attendances.id)),
      db.select().from(personalSchedules).where(eq(personalSchedules.usuarioId, user.id)),
      db.select().from(scheduleTemplates),
      db.select().from(scheduleAssignments),
      db.select().from(classSchedules).where(eq(classSchedules.usuarioId, user.id)),
      db
        .select()
        .from(permissions)
        .where(eq(permissions.usuarioId, user.id))
        .orderBy(desc(permissions.id)),
    ]);

    return {
      currentUser: user,
      users: [user],
      events: ownEvents.map(toEvento),
      attendances: ownAttendances.map(toAsistencia),
      config: cfg,
      personalSchedules: ownSchedules.map(toHorarioPersonal),
      templates: allTemplates.map(toPlantilla),
      assignments: allAssignments.map(toAsignacion),
      classes: ownClasses.map(toClase),
      permissions: ownPermissions.map(toPermiso),
    };
  } catch (error) {
    console.error('Database query failed (getBootstrapDataForUser):', error);
    throw new Error('Error al cargar los datos del sistema.', { cause: error });
  }
}

export async function createStaffUser(data: {
  nombre: string;
  apellido: string;
  correo: string;
  passwordHash: string;
  telefono?: string;
  fecha_nacimiento?: string;
  hora_entrada?: string;
  hora_salida?: string;
  limite_permisos?: number;
  rol: RolUsuario;
  departamento?: string;
}): Promise<Usuario> {
  try {
    const [created] = await db
      .insert(users)
      .values({
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        correo: data.correo.trim().toLowerCase(),
        passwordHash: data.passwordHash,
        telefono: data.telefono?.trim() || null,
        fechaNacimiento: data.fecha_nacimiento || null,
        horaEntrada: data.hora_entrada || '07:30',
        horaSalida: data.hora_salida || '15:30',
        limitePermisos: data.limite_permisos ?? 3,
        rol: data.rol,
        departamento: data.departamento?.trim() || null,
      })
      .returning();
    return toUsuario(created);
  } catch (error) {
    console.error('Database query failed (createStaffUser):', error);
    throw new Error('Error al registrar el funcionario.', { cause: error });
  }
}

export async function updateStaffUser(
  id: number,
  data: Partial<Omit<Usuario, 'id' | 'password'>> & { passwordHash?: string }
): Promise<Usuario | null> {
  try {
    const updateValues: Partial<typeof users.$inferInsert> = {};
    if (data.nombre !== undefined) updateValues.nombre = data.nombre.trim();
    if (data.apellido !== undefined) updateValues.apellido = data.apellido.trim();
    if (data.correo !== undefined) updateValues.correo = data.correo.trim().toLowerCase();
    if (data.telefono !== undefined) updateValues.telefono = data.telefono?.trim() || null;
    if (data.fecha_nacimiento !== undefined) updateValues.fechaNacimiento = data.fecha_nacimiento || null;
    if (data.hora_entrada !== undefined) updateValues.horaEntrada = data.hora_entrada;
    if (data.hora_salida !== undefined) updateValues.horaSalida = data.hora_salida;
    if (data.limite_permisos !== undefined) updateValues.limitePermisos = data.limite_permisos;
    if (data.rol !== undefined) updateValues.rol = data.rol;
    if (data.departamento !== undefined) updateValues.departamento = data.departamento?.trim() || null;
    if (data.passwordHash !== undefined) updateValues.passwordHash = data.passwordHash;

    const [updated] = await db
      .update(users)
      .set(updateValues)
      .where(eq(users.id, id))
      .returning();
    return updated ? toUsuario(updated) : null;
  } catch (error) {
    console.error('Database query failed (updateStaffUser):', error);
    throw new Error('Error al actualizar datos del funcionario.', { cause: error });
  }
}

export async function updateUserPasswordHash(id: number, passwordHash: string): Promise<boolean> {
  try {
    const [updated] = await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, id))
      .returning({ id: users.id });
    return Boolean(updated);
  } catch (error) {
    console.error('Database query failed (updateUserPasswordHash):', error);
    throw new Error('Error al actualizar la contraseña.', { cause: error });
  }
}

export async function deleteStaffUser(id: number): Promise<boolean> {
  try {
    const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    return Boolean(deleted);
  } catch (error) {
    console.error('Database query failed (deleteStaffUser):', error);
    throw new Error('Error al eliminar funcionario.', { cause: error });
  }
}

export async function findAttendanceByUserAndDate(usuarioId: number, fecha: string): Promise<AsistenciaDiaria | null> {
  try {
    const [row] = await db
      .select()
      .from(attendances)
      .where(and(eq(attendances.usuarioId, usuarioId), eq(attendances.fecha, fecha)))
      .limit(1);
    return row ? toAsistencia(row) : null;
  } catch (error) {
    console.error('Database query failed (findAttendanceByUserAndDate):', error);
    throw new Error('Error al verificar asistencia.', { cause: error });
  }
}

export async function insertAttendance(data: Omit<AsistenciaDiaria, 'id'>): Promise<AsistenciaDiaria> {
  try {
    const [created] = await db
      .insert(attendances)
      .values({
        usuarioId: data.usuario_id,
        fecha: data.fecha,
        horaRegistro: data.hora_registro,
        estado: data.estado,
        minutosRetraso: data.minutos_retraso,
        registradaManualmente: data.registrada_manualmente ?? false,
        motivo: data.motivo ?? null,
        observaciones: data.observaciones ?? null,
        archivoAdjunto: data.archivo_adjunto ?? null,
      })
      .returning();
    return toAsistencia(created);
  } catch (error) {
    console.error('Database query failed (insertAttendance):', error);
    throw new Error('Error al registrar asistencia.', { cause: error });
  }
}

export async function updateAttendanceEstado(
  id: number,
  estado: EstadoAsistencia
): Promise<AsistenciaDiaria | null> {
  try {
    const [updated] = await db
      .update(attendances)
      .set({ estado })
      .where(eq(attendances.id, id))
      .returning();
    return updated ? toAsistencia(updated) : null;
  } catch (error) {
    console.error('Database query failed (updateAttendanceEstado):', error);
    throw new Error('Error al actualizar estado de asistencia.', { cause: error });
  }
}

export async function countApprovedPermissions(usuarioId: number): Promise<number> {
  try {
    const rows = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(and(eq(permissions.usuarioId, usuarioId), eq(permissions.estado, 'Aprobado')));
    return rows.length;
  } catch (error) {
    console.error('Database query failed (countApprovedPermissions):', error);
    throw new Error('Error al contar permisos aprobados.', { cause: error });
  }
}

export async function insertPermission(data: Omit<Permiso, 'id'>): Promise<Permiso> {
  try {
    const [created] = await db
      .insert(permissions)
      .values({
        usuarioId: data.usuario_id,
        fechaInicio: data.fecha_inicio,
        fechaFin: data.fecha_fin,
        motivo: data.motivo,
        observaciones: data.observaciones ?? null,
        archivoAdjunto: data.archivo_adjunto ?? null,
        estado: data.estado,
        creadoEn: data.creado_en,
      })
      .returning();
    return toPermiso(created);
  } catch (error) {
    console.error('Database query failed (insertPermission):', error);
    throw new Error('Error al registrar solicitud de permiso.', { cause: error });
  }
}

export async function updatePermissionEstado(id: number, estado: EstadoPermiso): Promise<Permiso | null> {
  try {
    const [updated] = await db
      .update(permissions)
      .set({ estado })
      .where(eq(permissions.id, id))
      .returning();
    return updated ? toPermiso(updated) : null;
  } catch (error) {
    console.error('Database query failed (updatePermissionEstado):', error);
    throw new Error('Error al actualizar estado del permiso.', { cause: error });
  }
}

export async function insertEvent(data: Omit<Evento, 'id'>): Promise<Evento> {
  try {
    const [created] = await db
      .insert(events)
      .values({
        titulo: data.titulo,
        fechaInicio: data.fecha_inicio,
        fechaFin: data.fecha_fin,
        tipo: data.tipo,
        profesorId: data.profesor_id ?? null,
      })
      .returning();
    return toEvento(created);
  } catch (error) {
    console.error('Database query failed (insertEvent):', error);
    throw new Error('Error al crear actividad.', { cause: error });
  }
}

export async function updateEvent(id: number, data: Partial<Evento>): Promise<Evento | null> {
  try {
    const patch: Partial<typeof events.$inferInsert> = {};
    if (data.titulo !== undefined) patch.titulo = data.titulo;
    if (data.fecha_inicio !== undefined) patch.fechaInicio = data.fecha_inicio;
    if (data.fecha_fin !== undefined) patch.fechaFin = data.fecha_fin;
    if (data.tipo !== undefined) patch.tipo = data.tipo;
    if (data.profesor_id !== undefined) patch.profesorId = data.profesor_id;

    const [updated] = await db.update(events).set(patch).where(eq(events.id, id)).returning();
    return updated ? toEvento(updated) : null;
  } catch (error) {
    console.error('Database query failed (updateEvent):', error);
    throw new Error('Error al actualizar actividad.', { cause: error });
  }
}

export async function deleteEvent(id: number): Promise<boolean> {
  try {
    const [deleted] = await db.delete(events).where(eq(events.id, id)).returning({ id: events.id });
    return Boolean(deleted);
  } catch (error) {
    console.error('Database query failed (deleteEvent):', error);
    throw new Error('Error al eliminar actividad.', { cause: error });
  }
}

export async function replacePersonalSchedules(
  usuarioId: number,
  jornadas: { dia_semana: number; hora_entrada: string; hora_salida: string }[]
): Promise<HorarioPersonal[]> {
  try {
    return await db.transaction(async (tx) => {
      await tx.delete(personalSchedules).where(eq(personalSchedules.usuarioId, usuarioId));
      if (jornadas.length === 0) return [];
      const inserted = await tx
        .insert(personalSchedules)
        .values(
          jornadas.map((j) => ({
            usuarioId,
            diaSemana: j.dia_semana,
            horaEntrada: j.hora_entrada,
            horaSalida: j.hora_salida,
          }))
        )
        .returning();
      return inserted.map(toHorarioPersonal);
    });
  } catch (error) {
    console.error('Database query failed (replacePersonalSchedules):', error);
    throw new Error('Error al guardar horario personal.', { cause: error });
  }
}

export async function replaceClassSchedules(
  usuarioId: number,
  curso: string,
  clases: Omit<ClaseHorario, 'id' | 'usuario_id' | 'curso'>[]
): Promise<ClaseHorario[]> {
  try {
    return await db.transaction(async (tx) => {
      await tx
        .delete(classSchedules)
        .where(and(eq(classSchedules.usuarioId, usuarioId), eq(classSchedules.curso, curso)));
      if (clases.length === 0) return [];
      const inserted = await tx
        .insert(classSchedules)
        .values(
          clases.map((c) => ({
            usuarioId,
            curso,
            nombre: c.nombre,
            tipo: c.tipo,
            diaSemana: c.dia_semana,
            horaInicio: c.hora_inicio,
            horaFin: c.hora_fin,
            aula: c.aula ?? null,
          }))
        )
        .returning();
      return inserted.map(toClase);
    });
  } catch (error) {
    console.error('Database query failed (replaceClassSchedules):', error);
    throw new Error('Error al guardar clases del docente.', { cause: error });
  }
}

export async function insertScheduleTemplate(data: {
  nombre: string;
  descripcion?: string;
  detalles: { dia_semana: number; hora_entrada: string; hora_salida: string }[];
}): Promise<PlantillaHorario> {
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
    return toPlantilla(created);
  } catch (error) {
    console.error('Database query failed (insertScheduleTemplate):', error);
    throw new Error('Error al crear plantilla de horario.', { cause: error });
  }
}

export async function toggleScheduleTemplate(id: number): Promise<PlantillaHorario | null> {
  try {
    const [current] = await db
      .select()
      .from(scheduleTemplates)
      .where(eq(scheduleTemplates.id, id))
      .limit(1);
    if (!current) return null;
    const [updated] = await db
      .update(scheduleTemplates)
      .set({ activa: !current.activa })
      .where(eq(scheduleTemplates.id, id))
      .returning();
    return toPlantilla(updated);
  } catch (error) {
    console.error('Database query failed (toggleScheduleTemplate):', error);
    throw new Error('Error al actualizar estado de plantilla.', { cause: error });
  }
}

export async function insertScheduleAssignment(
  data: Omit<AsignacionHorario, 'id' | 'creada_en'>
): Promise<AsignacionHorario> {
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
    return toAsignacion(created);
  } catch (error) {
    console.error('Database query failed (insertScheduleAssignment):', error);
    throw new Error('Error al asignar plantilla.', { cause: error });
  }
}

export async function deleteScheduleAssignment(id: number): Promise<boolean> {
  try {
    const [deleted] = await db
      .delete(scheduleAssignments)
      .where(eq(scheduleAssignments.id, id))
      .returning({ id: scheduleAssignments.id });
    return Boolean(deleted);
  } catch (error) {
    console.error('Database query failed (deleteScheduleAssignment):', error);
    throw new Error('Error al eliminar asignación.', { cause: error });
  }
}

export async function getUserEffectiveSchedule(
  usuario: Usuario,
  fechaStr: string
): Promise<{ hora_entrada: string; hora_salida: string }> {
  try {
    const date = new Date(`${fechaStr}T00:00:00`);
    const pyDay = (date.getDay() + 6) % 7;

    const [personal] = await db
      .select()
      .from(personalSchedules)
      .where(and(eq(personalSchedules.usuarioId, usuario.id), eq(personalSchedules.diaSemana, pyDay)))
      .limit(1);
    if (personal) {
      return { hora_entrada: personal.horaEntrada, hora_salida: personal.horaSalida };
    }

    const allAssignments = await db.select().from(scheduleAssignments).orderBy(desc(scheduleAssignments.prioridad));
    const allTemplates = await db.select().from(scheduleTemplates).where(eq(scheduleTemplates.activa, true));

    const validAssignments = allAssignments.filter((asig) => {
      const startOk = asig.fechaInicio <= fechaStr;
      const endOk = !asig.fechaFin || asig.fechaFin >= fechaStr;
      const targetOk =
        asig.usuarioId === usuario.id ||
        (!asig.usuarioId &&
          ((asig.departamento && asig.departamento === usuario.departamento) ||
            (asig.rol && asig.rol === usuario.rol)));
      return startOk && endOk && targetOk;
    });

    for (const asig of validAssignments) {
      const template = allTemplates.find((t) => t.id === asig.plantillaId);
      if (template) {
        const detail = template.detalles.find((d) => d.dia_semana === pyDay);
        if (detail) {
          return { hora_entrada: detail.hora_entrada, hora_salida: detail.hora_salida };
        }
      }
    }

    const cfg = await getOrCreateSystemConfig();
    return {
      hora_entrada: usuario.hora_entrada || cfg.hora_entrada_oficial || '07:30',
      hora_salida: usuario.hora_salida || cfg.hora_salida_oficial || '15:30',
    };
  } catch (error) {
    console.error('Database query failed (getUserEffectiveSchedule):', error);
    throw new Error('Error al calcular horario efectivo.', { cause: error });
  }
}

export async function resetAllOperationalData(): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(attendances);
      await tx.delete(permissions);
      await tx.delete(events);
      await tx.delete(personalSchedules);
      await tx.delete(classSchedules);
      await tx.delete(scheduleAssignments);
      await tx.delete(scheduleTemplates);
    });
  } catch (error) {
    console.error('Database query failed (resetAllOperationalData):', error);
    throw new Error('Error al restablecer datos operacionales.', { cause: error });
  }
}
