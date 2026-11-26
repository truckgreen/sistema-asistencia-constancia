import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export interface DetallePlantillaDb {
  dia_semana: number;
  hora_entrada: string;
  hora_salida: string;
}

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(),
  nombre: text('nombre').notNull(),
  apellido: text('apellido').notNull(),
  correo: text('correo').notNull().unique(),
  passwordHash: text('password_hash'),
  telefono: text('telefono'),
  fechaNacimiento: text('fecha_nacimiento'),
  horaEntrada: text('hora_entrada'),
  horaSalida: text('hora_salida'),
  limitePermisos: integer('limite_permisos').default(3),
  rol: text('rol').notNull().default('personal'),
  departamento: text('departamento'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const systemConfig = pgTable('system_config', {
  id: serial('id').primaryKey(),
  horaEntradaOficial: text('hora_entrada_oficial').notNull().default('07:30'),
  horaSalidaOficial: text('hora_salida_oficial').default('15:30'),
  diasLaborables: jsonb('dias_laborables').$type<number[]>().notNull().default([0, 1, 2, 3, 4]),
  limitePermisos: integer('limite_permisos').notNull().default(3),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  titulo: text('titulo').notNull(),
  fechaInicio: text('fecha_inicio').notNull(),
  fechaFin: text('fecha_fin').notNull(),
  tipo: text('tipo').notNull(),
  profesorId: integer('profesor_id').references(() => users.id, { onDelete: 'set null' }),
});

export const attendances = pgTable('attendances', {
  id: serial('id').primaryKey(),
  usuarioId: integer('usuario_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  fecha: text('fecha').notNull(),
  horaRegistro: text('hora_registro').notNull(),
  estado: text('estado').notNull(),
  minutosRetraso: integer('minutos_retraso').notNull().default(0),
  registradaManualmente: boolean('registrada_manualmente').default(false),
  motivo: text('motivo'),
  observaciones: text('observaciones'),
  archivoAdjunto: text('archivo_adjunto'),
});

export const personalSchedules = pgTable('personal_schedules', {
  id: serial('id').primaryKey(),
  usuarioId: integer('usuario_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  diaSemana: integer('dia_semana').notNull(),
  horaEntrada: text('hora_entrada').notNull(),
  horaSalida: text('hora_salida').notNull(),
});

export const scheduleTemplates = pgTable('schedule_templates', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  activa: boolean('activa').notNull().default(true),
  detalles: jsonb('detalles').$type<DetallePlantillaDb[]>().notNull().default([]),
});

export const scheduleAssignments = pgTable('schedule_assignments', {
  id: serial('id').primaryKey(),
  plantillaId: integer('plantilla_id')
    .references(() => scheduleTemplates.id, { onDelete: 'cascade' })
    .notNull(),
  usuarioId: integer('usuario_id').references(() => users.id, { onDelete: 'cascade' }),
  rol: text('rol'),
  departamento: text('departamento'),
  fechaInicio: text('fecha_inicio').notNull(),
  fechaFin: text('fecha_fin'),
  prioridad: integer('prioridad').notNull().default(10),
  creadaEn: text('creada_en').notNull(),
});

export const classSchedules = pgTable('class_schedules', {
  id: serial('id').primaryKey(),
  usuarioId: integer('usuario_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  curso: text('curso').notNull(),
  nombre: text('nombre').notNull(),
  tipo: text('tipo').notNull(),
  diaSemana: integer('dia_semana').notNull(),
  horaInicio: text('hora_inicio').notNull(),
  horaFin: text('hora_fin').notNull(),
  aula: text('aula'),
});

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  usuarioId: integer('usuario_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  fechaInicio: text('fecha_inicio').notNull(),
  fechaFin: text('fecha_fin').notNull(),
  motivo: text('motivo').notNull(),
  observaciones: text('observaciones'),
  archivoAdjunto: text('archivo_adjunto'),
  estado: text('estado').notNull(),
  creadoEn: text('creado_en').notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  attendances: many(attendances),
  personalSchedules: many(personalSchedules),
  scheduleAssignments: many(scheduleAssignments),
  classSchedules: many(classSchedules),
  permissions: many(permissions),
  events: many(events),
}));

export const scheduleTemplatesRelations = relations(scheduleTemplates, ({ many }) => ({
  assignments: many(scheduleAssignments),
}));
