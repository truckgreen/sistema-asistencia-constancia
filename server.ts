import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { AuthRequest, requireAuth, requireDirectivo } from './src/middleware/auth.ts';
import { signSessionToken, verifyPassword } from './src/lib/security.ts';
import { realtimeHub } from './src/lib/realtime.ts';
import {
  claimInitialAdmin,
  createAssignmentRecord,
  createEventRecord,
  createPermissionRecord,
  createTemplateRecord,
  createUserRecord,
  deleteAssignmentRecord,
  deleteEventRecord,
  deleteUserRecord,
  findUserByIdentifier,
  getAllBootstrapData,
  getUserById,
  isAdminClaimed,
  resetOperationalData,
  sanitizeUser,
  saveClassScheduleRecords,
  savePersonalScheduleRecords,
  toggleTemplateRecord,
  updateAttendanceStatusRecord,
  updateEventRecord,
  updatePermissionStatusRecord,
  updateSystemConfigRecord,
  updateUserRecord,
  upsertAttendanceRecord,
} from './src/db/queries.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_ROLES = new Set(['directivo', 'personal', 'administrativo', 'obrero']);

function getOriginClientId(req: express.Request): string | undefined {
  const val = req.headers['x-client-id'];
  return typeof val === 'string' && val.trim() ? val.trim() : undefined;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Check whether initial Director account has been claimed
  app.get('/api/auth/status', async (_req, res) => {
    try {
      const adminClaimed = await isAdminClaimed();
      res.json({ adminClaimed });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'No se pudo consultar el estado del sistema.' });
    }
  });

  // One-time bootstrap route for the first Director account
  app.post('/api/auth/claim-admin', async (req, res) => {
    try {
      const { nombre, apellido, correo, password } = req.body || {};
      if (
        typeof nombre !== 'string' || !nombre.trim() ||
        typeof apellido !== 'string' || !apellido.trim() ||
        typeof correo !== 'string' || !correo.includes('@') ||
        typeof password !== 'string' || password.trim().length < 4
      ) {
        return res.status(400).json({
          error: 'Completa nombre, apellido, correo válido y una contraseña de al menos 4 caracteres.',
        });
      }

      const result = await claimInitialAdmin({
        nombre,
        apellido,
        correo,
        password: password.trim(),
      });

      if (result.alreadyClaimed) {
        return res.status(409).json({
          error: 'La cuenta principal de Dirección ya fue configurada. Inicia sesión con tus credenciales.',
        });
      }

      const token = signSessionToken({
        userId: result.user.id,
        rol: result.user.rol,
        correo: result.user.correo,
      });

      res.status(201).json({ token, user: sanitizeUser(result.user) });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'No se pudo registrar la cuenta de Dirección.' });
    }
  });

  // Credentialed login (usuario/correo + contraseña + rol)
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { identifier, password, expectedRole } = req.body || {};
      if (typeof identifier !== 'string' || !identifier.trim() || typeof password !== 'string' || !password.trim()) {
        return res.status(400).json({ error: 'Ingresa tu usuario o correo y tu contraseña.' });
      }

      const user = await findUserByIdentifier(identifier);
      if (!user) {
        return res.status(401).json({ error: 'Usuario o correo no encontrado en la nómina.' });
      }

      if (!user.passwordHash) {
        return res.status(401).json({
          error: 'Esta cuenta aún no tiene contraseña asignada. Solicítala en Dirección o entra con Google.',
        });
      }

      if (!verifyPassword(password.trim(), user.passwordHash)) {
        return res.status(401).json({ error: 'Contraseña incorrecta. Verifica tus credenciales.' });
      }

      if (typeof expectedRole === 'string' && VALID_ROLES.has(expectedRole) && user.rol !== expectedRole) {
        const roleLabels: Record<string, string> = {
          directivo: 'Dirección',
          personal: 'Profesor',
          administrativo: 'Administrativo',
          obrero: 'Obrero',
        };
        return res.status(403).json({
          error: `Esta cuenta pertenece al área de ${roleLabels[user.rol] || user.rol}. Selecciona esa pestaña para ingresar.`,
          suggestedRole: user.rol,
        });
      }

      const token = signSessionToken({
        userId: user.id,
        rol: user.rol,
        correo: user.correo,
      });

      res.json({ token, user: sanitizeUser(user) });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'No se pudo iniciar sesión.' });
    }
  });

  // Firebase Google Sign-In verification & account sync
  app.post('/api/auth/google', requireAuth, async (req: AuthRequest, res) => {
    try {
      res.json({ user: sanitizeUser(req.authUser!) });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'No se pudo completar el acceso con Google.' });
    }
  });

  // Load all authorized application data
  app.get('/api/bootstrap', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await getAllBootstrapData(req.authUser!);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al cargar los datos del sistema.' });
    }
  });

  // Users CRUD (Directivo only)
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
      } = req.body || {};

      if (
        typeof nombre !== 'string' || !nombre.trim() ||
        typeof apellido !== 'string' || !apellido.trim() ||
        typeof correo !== 'string' || !correo.includes('@')
      ) {
        return res.status(400).json({ error: 'Nombre, apellido y correo electrónico son obligatorios.' });
      }

      const safeRol = typeof rol === 'string' && VALID_ROLES.has(rol) ? rol : 'personal';
      const result = await createUserRecord({
        nombre,
        apellido,
        correo,
        password: typeof password === 'string' ? password : undefined,
        telefono: typeof telefono === 'string' ? telefono : undefined,
        fecha_nacimiento: typeof fecha_nacimiento === 'string' ? fecha_nacimiento : undefined,
        hora_entrada: typeof hora_entrada === 'string' ? hora_entrada : undefined,
        hora_salida: typeof hora_salida === 'string' ? hora_salida : undefined,
        limite_permisos: typeof limite_permisos === 'number' ? limite_permisos : 3,
        rol: safeRol,
        departamento: typeof departamento === 'string' ? departamento : undefined,
      });

      if (result.conflict) {
        return res.status(409).json({ error: 'Ya existe un funcionario registrado con ese correo electrónico.' });
      }

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastAll({ type: 'user:created', data: { user: result.user } }, originClientId);

      res.status(201).json({ user: result.user });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al crear el funcionario.' });
    }
  });

  app.patch('/api/users/:id', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Identificador de usuario inválido.' });
      }

      const body = req.body || {};
      if (body.password !== undefined && (typeof body.password !== 'string' || body.password.trim().length < 4)) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
      }

      const safeRol =
        body.rol !== undefined && typeof body.rol === 'string' && VALID_ROLES.has(body.rol)
          ? body.rol
          : undefined;

      const updated = await updateUserRecord(id, {
        nombre: typeof body.nombre === 'string' ? body.nombre : undefined,
        apellido: typeof body.apellido === 'string' ? body.apellido : undefined,
        telefono: body.telefono !== undefined ? body.telefono : undefined,
        fecha_nacimiento: body.fecha_nacimiento !== undefined ? body.fecha_nacimiento : undefined,
        hora_entrada: typeof body.hora_entrada === 'string' ? body.hora_entrada : undefined,
        hora_salida: typeof body.hora_salida === 'string' ? body.hora_salida : undefined,
        limite_permisos: typeof body.limite_permisos === 'number' ? body.limite_permisos : undefined,
        rol: safeRol,
        departamento: body.departamento !== undefined ? body.departamento : undefined,
        password: typeof body.password === 'string' ? body.password : undefined,
      });

      if (!updated) {
        return res.status(404).json({ error: 'Funcionario no encontrado.' });
      }

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastAll({ type: 'user:updated', data: { user: updated } }, originClientId);

      res.json({ user: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al actualizar el funcionario.' });
    }
  });

  app.delete('/api/users/:id', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Identificador de usuario inválido.' });
      }
      if (id === req.authUser!.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta en sesión activa.' });
      }
      await deleteUserRecord(id);

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastAll({ type: 'user:deleted', data: { id } }, originClientId);

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al eliminar el funcionario.' });
    }
  });

  // System Configuration (Directivo only)
  app.patch('/api/config', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      const { hora_entrada_oficial, hora_salida_oficial, dias_laborables, limite_permisos } = req.body || {};
      const updated = await updateSystemConfigRecord({
        hora_entrada_oficial: typeof hora_entrada_oficial === 'string' ? hora_entrada_oficial : undefined,
        hora_salida_oficial: typeof hora_salida_oficial === 'string' ? hora_salida_oficial : undefined,
        dias_laborables: Array.isArray(dias_laborables) ? dias_laborables : undefined,
        limite_permisos: typeof limite_permisos === 'number' ? limite_permisos : undefined,
      });

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastAll({ type: 'config:updated', data: { config: updated } }, originClientId);

      res.json({ config: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al actualizar configuración.' });
    }
  });

  // Events (Directivo only)
  app.post('/api/events', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      const { titulo, fecha_inicio, fecha_fin, tipo, profesor_id } = req.body || {};
      if (typeof titulo !== 'string' || !titulo.trim() || typeof fecha_inicio !== 'string' || typeof fecha_fin !== 'string') {
        return res.status(400).json({ error: 'Título y fechas son obligatorios.' });
      }
      const created = await createEventRecord({
        titulo,
        fecha_inicio,
        fecha_fin,
        tipo: typeof tipo === 'string' ? tipo : 'institucional',
        profesor_id: typeof profesor_id === 'number' ? profesor_id : null,
      });

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastAll({ type: 'event:created', data: { event: created } }, originClientId);

      res.status(201).json({ event: created });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al crear actividad.' });
    }
  });

  app.patch('/api/events/:id', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Identificador inválido.' });
      }
      const updated = await updateEventRecord(id, req.body || {});
      if (!updated) return res.status(404).json({ error: 'Actividad no encontrada.' });

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastAll({ type: 'event:updated', data: { event: updated } }, originClientId);

      res.json({ event: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al actualizar actividad.' });
    }
  });

  app.delete('/api/events/:id', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Identificador inválido.' });
      }
      await deleteEventRecord(id);

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastAll({ type: 'event:deleted', data: { id } }, originClientId);

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al eliminar actividad.' });
    }
  });

  // Attendances
  app.post('/api/attendances/qr', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { usuario_id, fecha, hora_registro, estado, minutos_retraso, replaceSameDay } = req.body || {};
      const targetUserId = Number(usuario_id);
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json({ error: 'Usuario inválido.' });
      }
      if (req.authUser!.rol !== 'directivo' && targetUserId !== req.authUser!.id) {
        return res.status(403).json({ error: 'No puedes registrar asistencia en nombre de otro funcionario.' });
      }
      const targetUser = await getUserById(targetUserId);
      if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado.' });

      const attendance = await upsertAttendanceRecord({
        usuario_id: targetUserId,
        fecha: String(fecha),
        hora_registro: String(hora_registro),
        estado: String(estado),
        minutos_retraso: Number(minutos_retraso) || 0,
        registrada_manualmente: false,
        replaceSameDay: Boolean(replaceSameDay),
      });

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastDirectivoAndUser(
        targetUserId,
        { type: 'attendance:upserted', data: { attendance } },
        originClientId
      );

      res.status(201).json({ attendance });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al registrar asistencia.' });
    }
  });

  app.post('/api/attendances/manual', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      const { usuario_id, fecha, hora_registro, estado, minutos_retraso } = req.body || {};
      const targetUserId = Number(usuario_id);
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json({ error: 'Usuario inválido.' });
      }
      const attendance = await upsertAttendanceRecord({
        usuario_id: targetUserId,
        fecha: String(fecha),
        hora_registro: String(hora_registro),
        estado: String(estado),
        minutos_retraso: Number(minutos_retraso) || 0,
        registrada_manualmente: true,
      });

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastDirectivoAndUser(
        targetUserId,
        { type: 'attendance:upserted', data: { attendance } },
        originClientId
      );

      res.status(201).json({ attendance });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al registrar asistencia manual.' });
    }
  });

  app.post('/api/attendances/absence', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { usuario_id, fecha, hora_registro, motivo, observaciones, archivo_adjunto } = req.body || {};
      const targetUserId = Number(usuario_id);
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json({ error: 'Usuario inválido.' });
      }
      if (req.authUser!.rol !== 'directivo' && targetUserId !== req.authUser!.id) {
        return res.status(403).json({ error: 'No puedes reportar inasistencia para otro funcionario.' });
      }
      const attendance = await upsertAttendanceRecord({
        usuario_id: targetUserId,
        fecha: String(fecha),
        hora_registro: String(hora_registro),
        estado: 'Inasistencia Reportada',
        minutos_retraso: 0,
        registrada_manualmente: false,
        motivo: typeof motivo === 'string' ? motivo : undefined,
        observaciones: typeof observaciones === 'string' ? observaciones : undefined,
        archivo_adjunto: typeof archivo_adjunto === 'string' ? archivo_adjunto : undefined,
      });

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastDirectivoAndUser(
        targetUserId,
        { type: 'attendance:upserted', data: { attendance } },
        originClientId
      );

      res.status(201).json({ attendance });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al reportar inasistencia.' });
    }
  });

  app.patch('/api/attendances/:id/status', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const { estado } = req.body || {};
      if (!Number.isInteger(id) || id <= 0 || !['Inasistencia Aprobada', 'Inasistencia Rechazada'].includes(estado)) {
        return res.status(400).json({ error: 'Solicitud inválida.' });
      }
      const updated = await updateAttendanceStatusRecord(id, estado);
      if (!updated) return res.status(404).json({ error: 'Registro no encontrado.' });

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastDirectivoAndUser(
        updated.usuario_id,
        { type: 'attendance:status', data: { id: updated.id, estado: updated.estado } },
        originClientId
      );

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al actualizar estado.' });
    }
  });

  // Permissions
  app.post('/api/permissions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { usuario_id, fecha_inicio, fecha_fin, motivo, observaciones, archivo_adjunto } = req.body || {};
      const targetUserId = Number(usuario_id);
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json({ error: 'Usuario inválido.' });
      }
      if (req.authUser!.rol !== 'directivo' && targetUserId !== req.authUser!.id) {
        return res.status(403).json({ error: 'No puedes solicitar permisos para otro funcionario.' });
      }
      const permission = await createPermissionRecord({
        usuario_id: targetUserId,
        fecha_inicio: String(fecha_inicio),
        fecha_fin: String(fecha_fin),
        motivo: String(motivo),
        observaciones: typeof observaciones === 'string' ? observaciones : undefined,
        archivo_adjunto: typeof archivo_adjunto === 'string' ? archivo_adjunto : undefined,
      });

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastDirectivoAndUser(
        targetUserId,
        { type: 'permission:created', data: { permission } },
        originClientId
      );

      res.status(201).json({ permission });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al registrar permiso.' });
    }
  });

  app.patch('/api/permissions/:id', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const { estado } = req.body || {};
      if (!Number.isInteger(id) || id <= 0 || !['Aprobado', 'Rechazado'].includes(estado)) {
        return res.status(400).json({ error: 'Solicitud inválida.' });
      }
      const updated = await updatePermissionStatusRecord(id, estado);
      if (!updated) return res.status(404).json({ error: 'Permiso no encontrado.' });

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastDirectivoAndUser(
        updated.usuario_id,
        { type: 'permission:updated', data: { id: updated.id, estado: updated.estado } },
        originClientId
      );

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al resolver permiso.' });
    }
  });

  // Schedules, Classes, Templates, Assignments (Directivo only)
  app.put('/api/schedules/personal/:usuarioId', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      const usuarioId = Number(req.params.usuarioId);
      const { jornadas } = req.body || {};
      if (!Number.isInteger(usuarioId) || usuarioId <= 0 || !Array.isArray(jornadas)) {
        return res.status(400).json({ error: 'Datos de horario inválidos.' });
      }
      const schedules = await savePersonalScheduleRecords(usuarioId, jornadas);

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastDirectivoAndUser(
        usuarioId,
        { type: 'schedule:personal_updated', data: { usuarioId, schedules } },
        originClientId
      );

      res.json({ schedules });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al guardar horario personal.' });
    }
  });

  app.put('/api/schedules/classes/:usuarioId', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      const usuarioId = Number(req.params.usuarioId);
      const { curso, clases } = req.body || {};
      if (!Number.isInteger(usuarioId) || usuarioId <= 0 || typeof curso !== 'string' || !Array.isArray(clases)) {
        return res.status(400).json({ error: 'Datos de clases inválidos.' });
      }
      const saved = await saveClassScheduleRecords(usuarioId, curso, clases);

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastDirectivoAndUser(
        usuarioId,
        { type: 'schedule:classes_updated', data: { usuarioId, curso, classes: saved } },
        originClientId
      );

      res.json({ classes: saved });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al guardar clases.' });
    }
  });

  app.post('/api/templates', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      const { nombre, descripcion, detalles } = req.body || {};
      if (typeof nombre !== 'string' || !nombre.trim() || !Array.isArray(detalles)) {
        return res.status(400).json({ error: 'Datos de plantilla inválidos.' });
      }
      const template = await createTemplateRecord({ nombre, descripcion, detalles });

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastAll({ type: 'template:created', data: { template } }, originClientId);

      res.status(201).json({ template });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al crear plantilla.' });
    }
  });

  app.patch('/api/templates/:id/toggle', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Identificador inválido.' });
      }
      const updated = await toggleTemplateRecord(id);
      if (!updated) return res.status(404).json({ error: 'Plantilla no encontrada.' });

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastAll(
        { type: 'template:toggled', data: { id: updated.id, activa: updated.activa } },
        originClientId
      );

      res.json({ template: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al actualizar plantilla.' });
    }
  });

  app.post('/api/assignments', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      const assignment = await createAssignmentRecord(req.body || {});

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastAll({ type: 'assignment:created', data: { assignment } }, originClientId);

      res.status(201).json({ assignment });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al asignar plantilla.' });
    }
  });

  app.delete('/api/assignments/:id', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Identificador inválido.' });
      }
      await deleteAssignmentRecord(id);

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastAll({ type: 'assignment:deleted', data: { id } }, originClientId);

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al eliminar asignación.' });
    }
  });

  app.post('/api/system/reset', requireAuth, requireDirectivo, async (req: AuthRequest, res) => {
    try {
      await resetOperationalData();

      const originClientId = getOriginClientId(req);
      realtimeHub.broadcastAll({ type: 'system:reset' }, originClientId);

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al restablecer datos.' });
    }
  });

  const server = http.createServer(app);
  realtimeHub.attach(server);

  // Vite integration in development, static assets in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  server.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
