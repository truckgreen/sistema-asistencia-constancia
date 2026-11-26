import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { hashPassword, signSessionToken, verifyPassword } from './src/lib/auth-crypto.ts';
import { requireAuth, requireDirectivo, type AuthRequest } from './src/middleware/auth.ts';
import {
  countApprovedPermissions,
  countDirectivos,
  createBootstrapAdmin,
  createStaffUser,
  deleteEvent,
  deleteScheduleAssignment,
  deleteStaffUser,
  findAttendanceByUserAndDate,
  findAuthUserByEmail,
  findUserByEmail,
  findUserById,
  findUserByUid,
  getBootstrapDataForUser,
  getOrCreateSystemConfig,
  getUserEffectiveSchedule,
  insertAttendance,
  insertEvent,
  insertPermission,
  insertScheduleAssignment,
  insertScheduleTemplate,
  linkUserUid,
  replaceClassSchedules,
  replacePersonalSchedules,
  resetAllOperationalData,
  toggleScheduleTemplate,
  updateAttendanceEstado,
  updateEvent,
  updatePermissionEstado,
  updateStaffUser,
  updateSystemConfig,
  updateUserPasswordHash,
} from './src/db/queries.ts';
import type { RolUsuario } from './src/types/index.ts';

type PortalRole = 'direccion' | 'profesor' | 'administrativo' | 'obrero';

const PORTAL_TO_ROL: Record<PortalRole, RolUsuario> = {
  direccion: 'directivo',
  profesor: 'personal',
  administrativo: 'administrativo',
  obrero: 'obrero',
};

const ROL_TO_PORTAL_LABEL: Record<RolUsuario, string> = {
  directivo: 'Dirección',
  personal: 'Profesor / Docente',
  administrativo: 'Personal Administrativo',
  obrero: 'Personal Obrero',
};

const VALID_ROLES = new Set<RolUsuario>(['directivo', 'personal', 'administrativo', 'obrero']);

function isPortalRole(val: unknown): val is PortalRole {
  return typeof val === 'string' && val in PORTAL_TO_ROL;
}

const app = express();
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/auth/bootstrap-status', async (_req, res) => {
  try {
    const adminCount = await countDirectivos();
    res.json({ hasAdmin: adminCount > 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error consultando estado inicial.' });
  }
});

app.post('/api/auth/bootstrap', async (req, res) => {
  try {
    const { nombre, apellido, correo, password } = req.body ?? {};
    if (
      typeof nombre !== 'string' ||
      typeof apellido !== 'string' ||
      typeof correo !== 'string' ||
      typeof password !== 'string' ||
      !nombre.trim() ||
      !apellido.trim() ||
      !correo.trim() ||
      password.trim().length < 4
    ) {
      return res.status(400).json({
        error: 'Complete nombre, apellido, correo y una contraseña de al menos 4 caracteres.',
      });
    }

    const created = await createBootstrapAdmin({
      nombre,
      apellido,
      correo,
      passwordHash: hashPassword(password.trim()),
    });

    if (!created) {
      return res.status(409).json({
        error: 'La cuenta de Dirección inicial ya fue configurada. Inicie sesión con sus credenciales.',
      });
    }

    const token = signSessionToken({
      userId: created.id,
      rol: created.rol,
      correo: created.correo,
    });

    return res.status(201).json({ token, user: created });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'No se pudo completar la configuración inicial.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { correo, password, portal } = req.body ?? {};
    if (typeof correo !== 'string' || typeof password !== 'string' || !correo.trim() || !password.trim()) {
      return res.status(400).json({ error: 'Ingrese su correo institucional y contraseña.' });
    }
    if (!isPortalRole(portal)) {
      return res.status(400).json({ error: 'Seleccione un portal de acceso válido.' });
    }

    const record = await findAuthUserByEmail(correo);
    if (!record || !verifyPassword(password.trim(), record.passwordHash)) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const expectedRol = PORTAL_TO_ROL[portal];
    if (record.usuario.rol !== expectedRol) {
      const correctLabel = ROL_TO_PORTAL_LABEL[record.usuario.rol] || record.usuario.rol;
      return res.status(403).json({
        error: `Esta cuenta pertenece al portal de ${correctLabel}. Selecciona esa pestaña para ingresar.`,
      });
    }

    const token = signSessionToken({
      userId: record.usuario.id,
      rol: record.usuario.rol,
      correo: record.usuario.correo,
    });

    return res.json({ token, user: record.usuario });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error al iniciar sesión.' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de Google faltante.' });
    }
    const idToken = authHeader.split('Bearer ')[1]?.trim();
    const { portal } = req.body ?? {};
    if (!isPortalRole(portal)) {
      return res.status(400).json({ error: 'Seleccione un portal de acceso válido.' });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = (decoded.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'La cuenta de Google no tiene un correo verificable.' });
    }

    let user = await findUserByUid(decoded.uid);
    if (!user) {
      const byEmail = await findUserByEmail(email);
      if (byEmail) {
        user = await linkUserUid(byEmail.id, decoded.uid);
      }
    }

    if (!user) {
      const adminCount = await countDirectivos();
      if (adminCount === 0 && portal === 'direccion') {
        const displayParts = (decoded.name || email.split('@')[0] || 'Director').trim().split(/\s+/);
        const nombre = displayParts[0] || 'Director';
        const apellido = displayParts.slice(1).join(' ') || 'General';
        user = await createBootstrapAdmin({
          uid: decoded.uid,
          nombre,
          apellido,
          correo: email,
          passwordHash: null,
        });
      }
    }

    if (!user) {
      return res.status(403).json({
        error:
          'Tu cuenta de Google no está registrada en la nómina institucional. Solicita a Dirección que registre este correo.',
      });
    }

    const expectedRol = PORTAL_TO_ROL[portal];
    if (user.rol !== expectedRol) {
      const correctLabel = ROL_TO_PORTAL_LABEL[user.rol] || user.rol;
      return res.status(403).json({
        error: `Tu cuenta corresponde al portal de ${correctLabel}. Cambia a esa pestaña para ingresar.`,
      });
    }

    return res.json({ user });
  } catch (error: any) {
    console.error('Google sign-in verification failed:', error);
    return res.status(401).json({ error: 'No se pudo verificar la autenticación con Google.' });
  }
});

app.get('/api/bootstrap', requireAuth, async (req: AuthRequest, res) => {
  try {
    const payload = await getBootstrapDataForUser(req.authUser!);
    return res.json(payload);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error al cargar datos del sistema.' });
  }
});

// ==================== USERS (DIRECTIVO ONLY) ====================

app.post('/api/users', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const {
      nombre,
      apellido,
      correo,
      password,
      telefono,
      fecha_nacimiento,
      hora_entrada,
      hora_salida,
      limite_permisos,
      rol,
      departamento,
    } = req.body ?? {};

    if (
      typeof nombre !== 'string' ||
      typeof apellido !== 'string' ||
      typeof correo !== 'string' ||
      !nombre.trim() ||
      !apellido.trim() ||
      !correo.trim()
    ) {
      return res.status(400).json({ error: 'Nombre, apellido y correo son obligatorios.' });
    }

    const targetRol: RolUsuario = VALID_ROLES.has(rol) ? rol : 'personal';
    const existing = await findUserByEmail(correo);
    if (existing) {
      return res.status(409).json({ error: 'Ya existe un funcionario registrado con ese correo.' });
    }

    const rawPassword =
      typeof password === 'string' && password.trim().length > 0
        ? password.trim()
        : `${nombre.trim().toLowerCase().replace(/\s+/g, '')}123`;

    if (rawPassword.length < 4) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
    }

    const created = await createStaffUser({
      nombre,
      apellido,
      correo,
      passwordHash: hashPassword(rawPassword),
      telefono,
      fecha_nacimiento,
      hora_entrada,
      hora_salida,
      limite_permisos: typeof limite_permisos === 'number' ? limite_permisos : 3,
      rol: targetRol,
      departamento,
    });

    return res.status(201).json({ user: created, assignedPassword: rawPassword });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'No se pudo crear el funcionario.' });
  }
});

app.put('/api/users/:id', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de usuario inválido.' });
    }

    const { password, ...rest } = req.body ?? {};
    const updateData: Parameters<typeof updateStaffUser>[1] = {};

    if (typeof rest.nombre === 'string') updateData.nombre = rest.nombre;
    if (typeof rest.apellido === 'string') updateData.apellido = rest.apellido;
    if (typeof rest.correo === 'string') updateData.correo = rest.correo;
    if (typeof rest.telefono === 'string' || rest.telefono === undefined) updateData.telefono = rest.telefono;
    if (typeof rest.fecha_nacimiento === 'string') updateData.fecha_nacimiento = rest.fecha_nacimiento;
    if (typeof rest.hora_entrada === 'string') updateData.hora_entrada = rest.hora_entrada;
    if (typeof rest.hora_salida === 'string') updateData.hora_salida = rest.hora_salida;
    if (typeof rest.limite_permisos === 'number') updateData.limite_permisos = rest.limite_permisos;
    if (VALID_ROLES.has(rest.rol)) updateData.rol = rest.rol;
    if (typeof rest.departamento === 'string' || rest.departamento === undefined) {
      updateData.departamento = rest.departamento;
    }

    if (typeof password === 'string' && password.trim().length > 0) {
      if (password.trim().length < 4) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
      }
      updateData.passwordHash = hashPassword(password.trim());
    }

    const updated = await updateStaffUser(id, updateData);
    if (!updated) {
      return res.status(404).json({ error: 'Funcionario no encontrado.' });
    }
    return res.json({ user: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'No se pudo actualizar el funcionario.' });
  }
});

app.patch('/api/users/:id/password', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { password } = req.body ?? {};
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de usuario inválido.' });
    }
    if (typeof password !== 'string' || password.trim().length < 4) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres.' });
    }

    const ok = await updateUserPasswordHash(id, hashPassword(password.trim()));
    if (!ok) {
      return res.status(404).json({ error: 'Funcionario no encontrado.' });
    }
    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error al actualizar contraseña.' });
  }
});

app.delete('/api/users/:id', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    if (id === req.authUser!.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta en sesión activa.' });
    }
    await deleteStaffUser(id);
    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error al eliminar funcionario.' });
  }
});

// ==================== ATTENDANCES ====================

app.post('/api/attendances/qr', requireAuth, async (req: AuthRequest, res) => {
  try {
    const requestedId = Number(req.body?.usuario_id);
    const targetId = req.authUser!.rol === 'directivo' && requestedId > 0 ? requestedId : req.authUser!.id;

    const today = new Date();
    const fecha = today.toISOString().split('T')[0];
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    const existente = await findAttendanceByUserAndDate(targetId, fecha);
    if (existente) {
      return res.json({
        ok: false,
        message: 'Ya se encuentra registrada la asistencia para el día de hoy.',
      });
    }

    const usuario = await findUserById(targetId);
    if (!usuario) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado en el sistema.' });
    }

    const horario = await getUserEffectiveSchedule(usuario, fecha);
    const [hEntrada, mEntrada] = horario.hora_entrada.split(':').map(Number);
    const minutosLimite = hEntrada * 60 + mEntrada;
    const minutosActuales = today.getHours() * 60 + today.getMinutes();

    let estado: 'A tiempo' | 'Tarde' = 'A tiempo';
    let minutos_retraso = 0;

    if (minutosActuales > minutosLimite) {
      estado = 'Tarde';
      minutos_retraso = minutosActuales - minutosLimite;
    }

    const record = await insertAttendance({
      usuario_id: targetId,
      fecha,
      hora_registro: today.toISOString(),
      estado,
      minutos_retraso,
      registrada_manualmente: false,
    });

    return res.status(201).json({
      ok: true,
      message: `Asistencia de ${usuario.nombre} ${usuario.apellido} asentada (${estado}).`,
      estado,
      hora: currentTimeStr,
      attendance: record,
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, message: error.message || 'Error registrando asistencia.' });
  }
});

app.post('/api/attendances/manual', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const usuarioId = Number(req.body?.usuario_id);
    const fecha = String(req.body?.fecha || '');
    const hora = String(req.body?.hora || '');

    if (!usuarioId || !fecha || !hora) {
      return res.status(400).json({ ok: false, message: 'Datos incompletos.' });
    }

    const usuario = await findUserById(usuarioId);
    if (!usuario) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });

    const existente = await findAttendanceByUserAndDate(usuarioId, fecha);
    if (existente) {
      return res.json({ ok: false, message: 'Ya registrada' });
    }

    const horario = await getUserEffectiveSchedule(usuario, fecha);
    const [hEntrada, mEntrada] = horario.hora_entrada.split(':').map(Number);
    const [hMarc, mMarc] = hora.split(':').map(Number);

    const minutosLimite = hEntrada * 60 + mEntrada;
    const minutosMarc = hMarc * 60 + mMarc;

    let estado: 'A tiempo' | 'Tarde' = 'A tiempo';
    let minutos_retraso = 0;
    if (minutosMarc > minutosLimite) {
      estado = 'Tarde';
      minutos_retraso = minutosMarc - minutosLimite;
    }

    const record = await insertAttendance({
      usuario_id: usuarioId,
      fecha,
      hora_registro: `${fecha}T${hora}:00`,
      estado,
      minutos_retraso,
      registrada_manualmente: true,
    });

    return res.status(201).json({ ok: true, message: 'Registrado con éxito', attendance: record });
  } catch (error: any) {
    return res.status(500).json({ ok: false, message: error.message || 'Error registrando asistencia manual.' });
  }
});

app.post('/api/attendances/report', requireAuth, async (req: AuthRequest, res) => {
  try {
    const requestedId = Number(req.body?.usuario_id);
    const targetId = req.authUser!.rol === 'directivo' && requestedId > 0 ? requestedId : req.authUser!.id;
    const { motivo, observaciones, archivo_adjunto } = req.body ?? {};
    if (typeof motivo !== 'string' || !motivo.trim()) {
      return res.status(400).json({ error: 'El motivo es obligatorio.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const record = await insertAttendance({
      usuario_id: targetId,
      fecha: today,
      hora_registro: new Date().toISOString(),
      estado: 'Inasistencia Reportada',
      minutos_retraso: 0,
      motivo: motivo.trim(),
      observaciones: typeof observaciones === 'string' ? observaciones : undefined,
      archivo_adjunto: typeof archivo_adjunto === 'string' ? archivo_adjunto : undefined,
    });

    return res.status(201).json({ attendance: record });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error reportando inasistencia.' });
  }
});

app.patch('/api/attendances/:id/resolve', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const accion = req.body?.accion;
    if (accion !== 'aprobar' && accion !== 'rechazar') {
      return res.status(400).json({ error: 'Acción inválida.' });
    }
    const estado = accion === 'aprobar' ? 'Inasistencia Aprobada' : 'Inasistencia Rechazada';
    const updated = await updateAttendanceEstado(id, estado);
    if (!updated) return res.status(404).json({ error: 'Registro no encontrado.' });
    return res.json({ attendance: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error actualizando justificativo.' });
  }
});

// ==================== PERMISSIONS ====================

app.post('/api/permissions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const requestedId = Number(req.body?.usuario_id);
    const targetId = req.authUser!.rol === 'directivo' && requestedId > 0 ? requestedId : req.authUser!.id;
    const { fecha_inicio, fecha_fin, motivo, observaciones, archivo_adjunto } = req.body ?? {};

    if (!fecha_inicio || !fecha_fin || typeof motivo !== 'string' || !motivo.trim()) {
      return res.status(400).json({ ok: false, message: 'Complete fechas y motivo.' });
    }

    const user = await findUserById(targetId);
    const cfg = await getOrCreateSystemConfig();
    const limite = user?.limite_permisos ?? cfg.limite_permisos;
    const aprobados = await countApprovedPermissions(targetId);

    if (aprobados >= limite) {
      return res.json({ ok: false, message: 'Límite de permisos superado', limite });
    }

    const permission = await insertPermission({
      usuario_id: targetId,
      fecha_inicio: String(fecha_inicio),
      fecha_fin: String(fecha_fin),
      motivo: motivo.trim(),
      observaciones: typeof observaciones === 'string' ? observaciones : undefined,
      archivo_adjunto: typeof archivo_adjunto === 'string' ? archivo_adjunto : undefined,
      estado: 'Pendiente',
      creado_en: new Date().toISOString(),
    });

    return res.status(201).json({ ok: true, message: 'Solicitud registrada', permission });
  } catch (error: any) {
    return res.status(500).json({ ok: false, message: error.message || 'Error al registrar permiso.' });
  }
});

app.patch('/api/permissions/:id/resolve', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const accion = req.body?.accion;
    if (accion !== 'aprobar' && accion !== 'rechazar') {
      return res.status(400).json({ error: 'Acción inválida.' });
    }
    const estado = accion === 'aprobar' ? 'Aprobado' : 'Rechazado';
    const updated = await updatePermissionEstado(id, estado);
    if (!updated) return res.status(404).json({ error: 'Permiso no encontrado.' });
    return res.json({ permission: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error resolviendo permiso.' });
  }
});

// ==================== CONFIG & EVENTS ====================

app.put('/api/config', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const updated = await updateSystemConfig(req.body ?? {});
    return res.json({ config: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error actualizando configuración.' });
  }
});

app.post('/api/events', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const { titulo, fecha_inicio, fecha_fin, tipo, profesor_id } = req.body ?? {};
    if (!titulo || !fecha_inicio || !fecha_fin || !tipo) {
      return res.status(400).json({ error: 'Datos de evento incompletos.' });
    }
    const event = await insertEvent({
      titulo: String(titulo),
      fecha_inicio: String(fecha_inicio),
      fecha_fin: String(fecha_fin),
      tipo,
      profesor_id: profesor_id ? Number(profesor_id) : null,
    });
    return res.status(201).json({ event });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error creando evento.' });
  }
});

app.put('/api/events/:id', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await updateEvent(id, req.body ?? {});
    if (!updated) return res.status(404).json({ error: 'Evento no encontrado.' });
    return res.json({ event: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error actualizando evento.' });
  }
});

app.delete('/api/events/:id', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await deleteEvent(id);
    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error eliminando evento.' });
  }
});

// ==================== SCHEDULES, TEMPLATES, CLASSES ====================

app.put('/api/schedules/personal/:userId', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.params.userId);
    const jornadas = Array.isArray(req.body?.jornadas) ? req.body.jornadas : [];
    const saved = await replacePersonalSchedules(userId, jornadas);
    return res.json({ schedules: saved });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error guardando horario personal.' });
  }
});

app.put('/api/schedules/classes/:userId', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.params.userId);
    const curso = String(req.body?.curso || '');
    const clases = Array.isArray(req.body?.clases) ? req.body.clases : [];
    const saved = await replaceClassSchedules(userId, curso, clases);
    return res.json({ classes: saved });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error guardando clases.' });
  }
});

app.post('/api/templates', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const { nombre, descripcion, detalles } = req.body ?? {};
    if (typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({ ok: false, message: 'El nombre es obligatorio' });
    }
    const validDetails = Array.isArray(detalles)
      ? detalles.filter((d: any) => d.hora_entrada && d.hora_salida)
      : [];
    if (!validDetails.length) {
      return res.status(400).json({ ok: false, message: 'Días insuficientes' });
    }

    const template = await insertScheduleTemplate({
      nombre,
      descripcion,
      detalles: validDetails,
    });
    return res.status(201).json({ ok: true, message: 'Plantilla creada', template });
  } catch (error: any) {
    return res.status(500).json({ ok: false, message: error.message || 'Error creando plantilla.' });
  }
});

app.patch('/api/templates/:id/toggle', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const template = await toggleScheduleTemplate(id);
    if (!template) return res.status(404).json({ error: 'Plantilla no encontrada.' });
    return res.json({ template });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error actualizando plantilla.' });
  }
});

app.post('/api/assignments', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const { plantilla_id, usuario_id, rol, departamento, fecha_inicio, fecha_fin, prioridad } = req.body ?? {};
    const assignment = await insertScheduleAssignment({
      plantilla_id: Number(plantilla_id),
      usuario_id: usuario_id ? Number(usuario_id) : null,
      rol: rol || null,
      departamento: departamento || null,
      fecha_inicio: String(fecha_inicio),
      fecha_fin: fecha_fin || null,
      prioridad: Number(prioridad) || 10,
    });
    return res.status(201).json({ assignment });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error asignando plantilla.' });
  }
});

app.delete('/api/assignments/:id', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await deleteScheduleAssignment(id);
    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error eliminando asignación.' });
  }
});

app.post('/api/system/reset', requireAuth, requireDirectivo, async (_req: AuthRequest, res) => {
  try {
    await resetAllOperationalData();
    const cfg = await updateSystemConfig({
      hora_entrada_oficial: '07:30',
      hora_salida_oficial: '15:30',
      dias_laborables: [0, 1, 2, 3, 4],
      limite_permisos: 3,
    });
    return res.json({ ok: true, config: cfg });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error restableciendo sistema.' });
  }
});

// ==================== VITE / STATIC SERVING ====================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`La Constancia server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
