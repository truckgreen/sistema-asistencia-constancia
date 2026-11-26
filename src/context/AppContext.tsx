import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  Usuario,
  Evento,
  AsistenciaDiaria,
  Configuracion,
  HorarioPersonal,
  PlantillaHorario,
  AsignacionHorario,
  ClaseHorario,
  Permiso,
  RolUsuario,
} from '../types';
import { DEFAULT_SYSTEM_CONFIG } from '../config/systemConfig';

interface AppContextType {
  currentUser: Usuario | null;
  users: Usuario[];
  events: Evento[];
  attendances: AsistenciaDiaria[];
  config: Configuracion;
  personalSchedules: HorarioPersonal[];
  templates: PlantillaHorario[];
  assignments: AsignacionHorario[];
  classes: ClaseHorario[];
  permissions: Permiso[];
  sessionPasswords: Record<number, string>;
  authReady: boolean;
  adminClaimed: boolean | null;
  activeNotification: { message: string; type: 'success' | 'warning' | 'danger' | 'info' } | null;

  // Auth Actions
  claimAdmin: (data: { nombre: string; apellido: string; correo: string; password: string }) => Promise<{ ok: boolean; message: string }>;
  login: (identifier: string, password: string, expectedRole?: RolUsuario) => Promise<{
    ok: boolean;
    message: string;
    user?: Usuario;
    suggestedRole?: RolUsuario;
  }>;
  loginWithGoogle: () => Promise<{ ok: boolean; message: string }>;
  logout: () => Promise<void>;
  setNotification: (message: string, type: 'success' | 'warning' | 'danger' | 'info') => void;
  clearNotification: () => void;

  // Asistencias & QR
  registrarAsistencia: (usuarioId: number, forzarNuevo?: boolean) => { ok: boolean; message: string; estado?: string; hora?: string; yaRegistrado?: boolean };
  registrarAsistenciaManual: (usuarioId: number, fecha: string, hora: string) => { ok: boolean; message: string };
  reportarInasistencia: (data: { usuario_id: number; motivo: string; observaciones?: string; archivo_adjunto?: string }) => void;
  aprobarInasistencia: (asistenciaId: number) => void;
  rechazarInasistencia: (asistenciaId: number) => void;

  // Permisos
  solicitarPermiso: (data: { usuario_id: number; fecha_inicio: string; fecha_fin: string; motivo: string; observaciones?: string; archivo_adjunto?: string }) => { ok: boolean; message: string };
  resolverPermiso: (permisoId: number, accion: 'aprobar' | 'rechazar') => void;

  // Usuarios
  crearUsuario: (data: Omit<Usuario, 'id'>) => Promise<{ ok: boolean; message: string; password?: string }>;
  editarUsuario: (id: number, data: Partial<Usuario>) => Promise<{ ok: boolean; message?: string }>;
  eliminarUsuario: (id: number) => Promise<void>;

  // Configuración
  actualizarConfiguracion: (data: Partial<Configuracion>) => void;

  // Eventos / Agenda
  crearEvento: (evento: Omit<Evento, 'id'>) => void;
  editarEvento: (id: number, evento: Partial<Evento>) => void;
  eliminarEvento: (id: number) => void;

  // Horarios & Clases
  guardarHorarioPersonal: (usuarioId: number, jornadas: { dia_semana: number; hora_entrada: string; hora_salida: string }[]) => void;
  guardarClasesDocente: (usuarioId: number, curso: string, clases: Omit<ClaseHorario, 'id' | 'usuario_id' | 'curso'>[]) => void;
  crearPlantilla: (nombre: string, descripcion: string, detalles: { dia_semana: number; hora_entrada: string; hora_salida: string }[]) => Promise<{ ok: boolean; message: string }>;
  alternarPlantilla: (plantillaId: number) => void;
  asignarPlantilla: (data: { plantilla_id: number; usuario_id?: number | null; rol?: string | null; departamento?: string | null; fecha_inicio: string; fecha_fin?: string | null; prioridad: number }) => void;
  eliminarAsignacion: (asignacionId: number) => void;

  // Helper
  getHorarioDeUsuario: (usuario: Usuario, fechaStr: string) => { hora_entrada: string; hora_salida: string };
  resetToDefaults: () => void;

  // Retrocompatibilidad con temas y utilidades
  palettes: any[];
  currentPaletteId: string;
  primaryColor: string;
  accentColor: string;
  cambiarPaleta: (id: string) => void;
  cambiarColoresPersonalizados: (p: string, a: string) => void;
  resetearColoresInstitucionales: () => void;
  cargarDatosDemostracion: () => void;
  vaciarRegistros: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const tokenRef = useRef<string | null>(null);
  const manualSessionRef = useRef<boolean>(false);
  const clientIdRef = useRef<string>(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const hasConnectedOnceRef = useRef<boolean>(false);

  const [authReady, setAuthReady] = useState<boolean>(false);
  const [adminClaimed, setAdminClaimed] = useState<boolean | null>(null);

  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [events, setEvents] = useState<Evento[]>([]);
  const [attendances, setAttendances] = useState<AsistenciaDiaria[]>([]);
  const [config, setConfig] = useState<Configuracion>(DEFAULT_SYSTEM_CONFIG);
  const [personalSchedules, setPersonalSchedules] = useState<HorarioPersonal[]>([]);
  const [templates, setTemplates] = useState<PlantillaHorario[]>([]);
  const [assignments, setAssignments] = useState<AsignacionHorario[]>([]);
  const [classes, setClasses] = useState<ClaseHorario[]>([]);
  const [permissions, setPermissions] = useState<Permiso[]>([]);
  const [sessionPasswords, setSessionPasswords] = useState<Record<number, string>>({});

  const [activeNotification, setActiveNotification] = useState<{
    message: string;
    type: 'success' | 'warning' | 'danger' | 'info';
  } | null>(null);

  const setNotification = (message: string, type: 'success' | 'warning' | 'danger' | 'info') => {
    setActiveNotification({ message, type });
  };

  const clearNotification = () => {
    setActiveNotification(null);
  };

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Id': clientIdRef.current,
      ...(options.headers as Record<string, string> | undefined),
    };
    if (tokenRef.current) {
      headers.Authorization = `Bearer ${tokenRef.current}`;
    }
    const res = await fetch(url, { ...options, headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Error en la solicitud al servidor.');
    }
    return json;
  };

  const applyRealtimeEvent = (msg: { type: string; data?: any }) => {
    const d = msg.data;
    switch (msg.type) {
      case 'user:created':
        if (d?.user) {
          setUsers(prev => (prev.some(u => u.id === d.user.id) ? prev : [...prev, d.user]));
        }
        break;
      case 'user:updated':
        if (d?.user) {
          setUsers(prev => prev.map(u => (u.id === d.user.id ? { ...u, ...d.user } : u)));
          setCurrentUser(prev => (prev && prev.id === d.user.id ? { ...prev, ...d.user } : prev));
        }
        break;
      case 'user:deleted':
        if (typeof d?.id === 'number') {
          setUsers(prev => prev.filter(u => u.id !== d.id));
        }
        break;
      case 'config:updated':
        if (d?.config) {
          setConfig(d.config);
        }
        break;
      case 'event:created':
        if (d?.event) {
          setEvents(prev => (prev.some(e => e.id === d.event.id) ? prev : [...prev, d.event]));
        }
        break;
      case 'event:updated':
        if (d?.event) {
          setEvents(prev => prev.map(e => (e.id === d.event.id ? d.event : e)));
        }
        break;
      case 'event:deleted':
        if (typeof d?.id === 'number') {
          setEvents(prev => prev.filter(e => e.id !== d.id));
        }
        break;
      case 'attendance:upserted':
        if (d?.attendance) {
          setAttendances(prev => {
            const exists = prev.some(a => a.id === d.attendance.id);
            if (exists) {
              return prev.map(a => (a.id === d.attendance.id ? d.attendance : a));
            }
            return [
              d.attendance,
              ...prev.filter(
                a => !(a.usuario_id === d.attendance.usuario_id && a.fecha === d.attendance.fecha)
              ),
            ];
          });
        }
        break;
      case 'attendance:status':
        if (typeof d?.id === 'number' && d?.estado) {
          setAttendances(prev => prev.map(a => (a.id === d.id ? { ...a, estado: d.estado } : a)));
        }
        break;
      case 'permission:created':
        if (d?.permission) {
          setPermissions(prev =>
            prev.some(p => p.id === d.permission.id) ? prev : [d.permission, ...prev]
          );
        }
        break;
      case 'permission:updated':
        if (typeof d?.id === 'number' && d?.estado) {
          setPermissions(prev => prev.map(p => (p.id === d.id ? { ...p, estado: d.estado } : p)));
        }
        break;
      case 'schedule:personal_updated':
        if (typeof d?.usuarioId === 'number' && Array.isArray(d?.schedules)) {
          setPersonalSchedules(prev => [
            ...prev.filter(h => h.usuario_id !== d.usuarioId),
            ...d.schedules,
          ]);
        }
        break;
      case 'schedule:classes_updated':
        if (typeof d?.usuarioId === 'number' && typeof d?.curso === 'string' && Array.isArray(d?.classes)) {
          setClasses(prev => [
            ...prev.filter(c => !(c.usuario_id === d.usuarioId && c.curso === d.curso)),
            ...d.classes,
          ]);
        }
        break;
      case 'template:created':
        if (d?.template) {
          setTemplates(prev =>
            prev.some(t => t.id === d.template.id) ? prev : [...prev, d.template]
          );
        }
        break;
      case 'template:toggled':
        if (typeof d?.id === 'number' && typeof d?.activa === 'boolean') {
          setTemplates(prev =>
            prev.map(t => (t.id === d.id ? { ...t, activa: d.activa } : t))
          );
        }
        break;
      case 'assignment:created':
        if (d?.assignment) {
          setAssignments(prev =>
            prev.some(a => a.id === d.assignment.id) ? prev : [d.assignment, ...prev]
          );
        }
        break;
      case 'assignment:deleted':
        if (typeof d?.id === 'number') {
          setAssignments(prev => prev.filter(a => a.id !== d.id));
        }
        break;
      case 'system:reset':
        setEvents([]);
        setAttendances([]);
        setConfig(DEFAULT_SYSTEM_CONFIG);
        setPersonalSchedules([]);
        setTemplates([]);
        setAssignments([]);
        setClasses([]);
        setPermissions([]);
        break;
      default:
        break;
    }
  };

  const disconnectRealtime = () => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    hasConnectedOnceRef.current = false;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const connectRealtime = (token: string) => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', token, clientId: clientIdRef.current }));
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg?.type === 'auth:ok') {
          const isReconnect = hasConnectedOnceRef.current;
          hasConnectedOnceRef.current = true;
          reconnectAttemptRef.current = 0;
          if (isReconnect && tokenRef.current) {
            // Reconcile state after a network disconnect
            try {
              const data = await apiFetch('/api/bootstrap', { method: 'GET' });
              setCurrentUser(data.currentUser);
              setUsers(data.users || []);
              setEvents(data.events || []);
              setAttendances(data.attendances || []);
              setConfig(data.config || DEFAULT_SYSTEM_CONFIG);
              setPersonalSchedules(data.personalSchedules || []);
              setTemplates(data.templates || []);
              setAssignments(data.assignments || []);
              setClasses(data.classes || []);
              setPermissions(data.permissions || []);
            } catch {
              // ignore transient reconnect sync errors
            }
          }
          return;
        }
        applyRealtimeEvent(msg);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      if (!tokenRef.current) return;
      const delay = Math.min(5000, 1000 * Math.pow(2, reconnectAttemptRef.current));
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = window.setTimeout(() => {
        if (tokenRef.current) {
          connectRealtime(tokenRef.current);
        }
      }, delay);
    };
  };

  const loadBootstrap = async (token: string) => {
    tokenRef.current = token;
    const data = await apiFetch('/api/bootstrap', { method: 'GET' });
    setCurrentUser(data.currentUser);
    setUsers(data.users || []);
    setEvents(data.events || []);
    setAttendances(data.attendances || []);
    setConfig(data.config || DEFAULT_SYSTEM_CONFIG);
    setPersonalSchedules(data.personalSchedules || []);
    setTemplates(data.templates || []);
    setAssignments(data.assignments || []);
    setClasses(data.classes || []);
    setPermissions(data.permissions || []);
    connectRealtime(token);
  };

  const refreshAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json().catch(() => ({ adminClaimed: true }));
      setAdminClaimed(Boolean(data.adminClaimed));
    } catch {
      setAdminClaimed(true);
    }
  };

  useEffect(() => {
    let active = true;
    refreshAuthStatus();

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!active) return;
      if (fbUser && !manualSessionRef.current) {
        try {
          const idToken = await fbUser.getIdToken();
          await loadBootstrap(idToken);
          setAdminClaimed(true);
        } catch (err) {
          console.error('Error syncing Google session:', err);
          tokenRef.current = null;
          setCurrentUser(null);
        }
      }
      if (active) setAuthReady(true);
    });

    return () => {
      active = false;
      unsubscribe();
      disconnectRealtime();
    };
  }, []);

  const claimAdmin = async (data: {
    nombre: string;
    apellido: string;
    correo: string;
    password: string;
  }) => {
    try {
      const res = await fetch('/api/auth/claim-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) setAdminClaimed(true);
        return { ok: false, message: json.error || 'No se pudo configurar la cuenta de Dirección.' };
      }

      manualSessionRef.current = true;
      await loadBootstrap(json.token);
      setAdminClaimed(true);
      setSessionPasswords(prev => ({ ...prev, [json.user.id]: data.password }));
      setNotification(`Cuenta de Dirección creada. Bienvenido, ${json.user.nombre} ${json.user.apellido}.`, 'success');
      return { ok: true, message: 'Cuenta creada con éxito.' };
    } catch (error: any) {
      return { ok: false, message: error.message || 'Error de conexión con el servidor.' };
    }
  };

  const login = async (
    identifier: string,
    password: string,
    expectedRole?: RolUsuario
  ): Promise<{ ok: boolean; message: string; user?: Usuario; suggestedRole?: RolUsuario }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, expectedRole }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          message: json.error || 'Credenciales inválidas.',
          suggestedRole: json.suggestedRole,
        };
      }

      manualSessionRef.current = true;
      await loadBootstrap(json.token);
      setNotification(`Bienvenido al sistema, ${json.user.nombre} ${json.user.apellido}`, 'success');
      return { ok: true, message: 'Acceso concedido', user: json.user };
    } catch (error: any) {
      return { ok: false, message: error.message || 'Error de conexión al iniciar sesión.' };
    }
  };

  const loginWithGoogle = async (): Promise<{ ok: boolean; message: string }> => {
    try {
      manualSessionRef.current = false;
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      await loadBootstrap(idToken);
      setAdminClaimed(true);
      setNotification('Sesión iniciada con Google correctamente.', 'success');
      return { ok: true, message: 'Sesión iniciada.' };
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      return {
        ok: false,
        message: error?.code === 'auth/popup-closed-by-user'
          ? 'Se cerró la ventana de Google antes de completar el acceso.'
          : 'No se pudo iniciar sesión con Google. Verifica los popups e inténtalo de nuevo.',
      };
    }
  };

  const logout = async () => {
    manualSessionRef.current = false;
    tokenRef.current = null;
    disconnectRealtime();
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      // ignore signOut errors
    }
    setCurrentUser(null);
    setUsers([]);
    setEvents([]);
    setAttendances([]);
    setPersonalSchedules([]);
    setTemplates([]);
    setAssignments([]);
    setClasses([]);
    setPermissions([]);
    setSessionPasswords({});
    await refreshAuthStatus();
    setNotification('Sesión cerrada correctamente.', 'info');
  };

  const getHorarioDeUsuario = (usuario: Usuario, fechaStr: string): { hora_entrada: string; hora_salida: string } => {
    const date = new Date(fechaStr + 'T00:00:00');
    const pyDay = (date.getDay() + 6) % 7;

    const personal = personalSchedules.find(h => h.usuario_id === usuario.id && h.dia_semana === pyDay);
    if (personal) {
      return { hora_entrada: personal.hora_entrada, hora_salida: personal.hora_salida };
    }

    const validAssignments = assignments.filter(asig => {
      const startOk = asig.fecha_inicio <= fechaStr;
      const endOk = !asig.fecha_fin || asig.fecha_fin >= fechaStr;
      const targetOk =
        asig.usuario_id === usuario.id ||
        (!asig.usuario_id && (asig.departamento === usuario.departamento || asig.rol === usuario.rol));
      return startOk && endOk && targetOk;
    });

    for (const asig of validAssignments) {
      const template = templates.find(t => t.id === asig.plantilla_id && t.activa);
      if (template) {
        const detail = template.detalles.find(d => d.dia_semana === pyDay);
        if (detail) {
          return { hora_entrada: detail.hora_entrada, hora_salida: detail.hora_salida };
        }
      }
    }

    return {
      hora_entrada: usuario.hora_entrada || config.hora_entrada_oficial || '07:30',
      hora_salida: usuario.hora_salida || config.hora_salida_oficial || '15:30',
    };
  };

  const registrarAsistencia = (usuarioId: number, forzarNuevo = false) => {
    const today = new Date();
    const fecha = today.toISOString().split('T')[0];
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    const usuario = users.find(u => u.id === usuarioId);
    if (!usuario) {
      return { ok: false, message: 'Usuario no encontrado en el sistema.' };
    }

    const existe = attendances.find(a => a.usuario_id === usuarioId && a.fecha === fecha);
    if (existe && !forzarNuevo) {
      const horaPrev = new Date(existe.hora_registro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        ok: true,
        message: `${usuario.nombre} ${usuario.apellido} ya tiene asistencia asentada hoy a las ${horaPrev} (${existe.estado}).`,
        estado: existe.estado,
        hora: horaPrev,
        yaRegistrado: true,
      };
    }

    const horario = getHorarioDeUsuario(usuario, fecha);
    const [hEntrada, mEntrada] = horario.hora_entrada.split(':').map(Number);
    const minutosLimite = hEntrada * 60 + mEntrada;
    const minutosActuales = today.getHours() * 60 + today.getMinutes();

    let estado: 'A tiempo' | 'Tarde' = 'A tiempo';
    let minutos_retraso = 0;

    if (minutosActuales > minutosLimite) {
      estado = 'Tarde';
      minutos_retraso = minutosActuales - minutosLimite;
    }

    const tempId = Date.now();
    const isoNow = today.toISOString();
    const nuevaAsistencia: AsistenciaDiaria = {
      id: tempId,
      usuario_id: usuarioId,
      fecha,
      hora_registro: isoNow,
      estado,
      minutos_retraso,
      registrada_manualmente: false,
    };

    setAttendances(prev => [nuevaAsistencia, ...prev.filter(a => !(a.usuario_id === usuarioId && a.fecha === fecha))]);

    apiFetch('/api/attendances/qr', {
      method: 'POST',
      body: JSON.stringify({
        usuario_id: usuarioId,
        fecha,
        hora_registro: isoNow,
        estado,
        minutos_retraso,
        replaceSameDay: true,
      }),
    })
      .then(res => {
        if (res.attendance) {
          setAttendances(prev => prev.map(a => (a.id === tempId ? res.attendance : a)));
        }
      })
      .catch(err => setNotification(err.message || 'Error al sincronizar asistencia.', 'danger'));

    const msg = minutos_retraso > 0
      ? `Asistencia de ${usuario.nombre} ${usuario.apellido} registrada: Tarde (+${minutos_retraso} min).`
      : `Asistencia de ${usuario.nombre} ${usuario.apellido} registrada: A tiempo.`;

    setNotification(msg, minutos_retraso > 0 ? 'warning' : 'success');

    return {
      ok: true,
      message: msg,
      estado,
      hora: currentTimeStr,
      yaRegistrado: false,
    };
  };

  const registrarAsistenciaManual = (usuarioId: number, fecha: string, hora: string) => {
    const usuario = users.find(u => u.id === usuarioId);
    if (!usuario) return { ok: false, message: 'Usuario no encontrado' };

    const existe = attendances.find(a => a.usuario_id === usuarioId && a.fecha === fecha);
    if (existe) {
      setNotification(`Ya existe una marcación para ${usuario.nombre} ${usuario.apellido} en fecha ${fecha}.`, 'warning');
      return { ok: false, message: 'Ya registrada' };
    }

    const horario = getHorarioDeUsuario(usuario, fecha);
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

    const tempId = Date.now();
    const horaReg = `${fecha}T${hora}:00`;
    const nueva: AsistenciaDiaria = {
      id: tempId,
      usuario_id: usuarioId,
      fecha,
      hora_registro: horaReg,
      estado,
      minutos_retraso,
      registrada_manualmente: true,
    };

    setAttendances(prev => [nueva, ...prev]);
    apiFetch('/api/attendances/manual', {
      method: 'POST',
      body: JSON.stringify({
        usuario_id: usuarioId,
        fecha,
        hora_registro: horaReg,
        estado,
        minutos_retraso,
      }),
    })
      .then(res => {
        if (res.attendance) {
          setAttendances(prev => prev.map(a => (a.id === tempId ? res.attendance : a)));
        }
      })
      .catch(err => setNotification(err.message || 'Error al guardar asistencia manual.', 'danger'));

    setNotification(`Asistencia manual de ${usuario.nombre} ${usuario.apellido} registrada correctamente.`, 'success');
    return { ok: true, message: 'Registrado con éxito' };
  };

  const reportarInasistencia = (data: {
    usuario_id: number;
    motivo: string;
    observaciones?: string;
    archivo_adjunto?: string;
  }) => {
    const today = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    const user = users.find(u => u.id === data.usuario_id);
    const tempId = Date.now();

    const nueva: AsistenciaDiaria = {
      id: tempId,
      usuario_id: data.usuario_id,
      fecha: today,
      hora_registro: nowIso,
      estado: 'Inasistencia Reportada',
      minutos_retraso: 0,
      motivo: data.motivo,
      observaciones: data.observaciones,
      archivo_adjunto: data.archivo_adjunto,
    };

    setAttendances(prev => [nueva, ...prev]);
    apiFetch('/api/attendances/absence', {
      method: 'POST',
      body: JSON.stringify({
        usuario_id: data.usuario_id,
        fecha: today,
        hora_registro: nowIso,
        motivo: data.motivo,
        observaciones: data.observaciones,
        archivo_adjunto: data.archivo_adjunto,
      }),
    })
      .then(res => {
        if (res.attendance) {
          setAttendances(prev => prev.map(a => (a.id === tempId ? res.attendance : a)));
        }
      })
      .catch(err => setNotification(err.message || 'Error al enviar justificativo.', 'danger'));

    setNotification(`Inasistencia de ${user?.nombre} ${user?.apellido} enviada a revisión.`, 'info');
  };

  const aprobarInasistencia = (asistenciaId: number) => {
    setAttendances(prev =>
      prev.map(a => (a.id === asistenciaId ? { ...a, estado: 'Inasistencia Aprobada' } : a))
    );
    apiFetch(`/api/attendances/${asistenciaId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'Inasistencia Aprobada' }),
    }).catch(err => setNotification(err.message || 'Error al aprobar justificativo.', 'danger'));
    setNotification('Justificativo aprobado satisfactoriamente.', 'success');
  };

  const rechazarInasistencia = (asistenciaId: number) => {
    setAttendances(prev =>
      prev.map(a => (a.id === asistenciaId ? { ...a, estado: 'Inasistencia Rechazada' } : a))
    );
    apiFetch(`/api/attendances/${asistenciaId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'Inasistencia Rechazada' }),
    }).catch(err => setNotification(err.message || 'Error al rechazar justificativo.', 'danger'));
    setNotification('Justificativo rechazado.', 'warning');
  };

  const solicitarPermiso = (data: {
    usuario_id: number;
    fecha_inicio: string;
    fecha_fin: string;
    motivo: string;
    observaciones?: string;
    archivo_adjunto?: string;
  }) => {
    const user = users.find(u => u.id === data.usuario_id);
    const limite = user?.limite_permisos ?? config.limite_permisos;

    const permisosAprobados = permissions.filter(
      p => p.usuario_id === data.usuario_id && p.estado === 'Aprobado'
    ).length;

    if (permisosAprobados >= limite) {
      setNotification(`Has alcanzado el límite máximo anual de permisos (${limite}).`, 'danger');
      return { ok: false, message: 'Límite de permisos superado' };
    }

    const tempId = Date.now();
    const nuevo: Permiso = {
      id: tempId,
      usuario_id: data.usuario_id,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin,
      motivo: data.motivo,
      observaciones: data.observaciones,
      archivo_adjunto: data.archivo_adjunto,
      estado: 'Pendiente',
      creado_en: new Date().toISOString(),
    };

    setPermissions(prev => [nuevo, ...prev]);
    apiFetch('/api/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
      .then(res => {
        if (res.permission) {
          setPermissions(prev => prev.map(p => (p.id === tempId ? res.permission : p)));
        }
      })
      .catch(err => setNotification(err.message || 'Error al registrar permiso.', 'danger'));

    setNotification('Solicitud de permiso enviada a la Dirección.', 'success');
    return { ok: true, message: 'Solicitud registrada' };
  };

  const resolverPermiso = (permisoId: number, accion: 'aprobar' | 'rechazar') => {
    const nuevoEstado = accion === 'aprobar' ? 'Aprobado' : 'Rechazado';
    setPermissions(prev =>
      prev.map(p => (p.id === permisoId ? { ...p, estado: nuevoEstado } : p))
    );
    apiFetch(`/api/permissions/${permisoId}`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: nuevoEstado }),
    }).catch(err => setNotification(err.message || 'Error al actualizar permiso.', 'danger'));
    setNotification(
      accion === 'aprobar' ? 'Permiso aprobado con éxito.' : 'Permiso rechazado.',
      accion === 'aprobar' ? 'success' : 'info'
    );
  };

  const crearUsuario = async (data: Omit<Usuario, 'id'>) => {
    const cleanMail = data.correo.trim().toLowerCase();
    const defaultPass = `${data.nombre.toLowerCase().replace(/\s+/g, '')}123`;
    const assignedPassword = data.password?.trim() || defaultPass;

    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          correo: cleanMail,
          password: assignedPassword,
        }),
      });
      const created: Usuario = res.user;
      setUsers(prev => [...prev, created]);
      setSessionPasswords(prev => ({ ...prev, [created.id]: assignedPassword }));
      setNotification(`Funcionario ${created.nombre} ${created.apellido} guardado en base de datos.`, 'success');
      return { ok: true, message: 'Usuario creado', password: assignedPassword };
    } catch (error: any) {
      setNotification(error.message || 'No se pudo registrar el funcionario.', 'warning');
      return { ok: false, message: error.message || 'Error al crear usuario' };
    }
  };

  const editarUsuario = async (id: number, data: Partial<Usuario>) => {
    try {
      const res = await apiFetch(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      const updated: Usuario = res.user;
      setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
      if (currentUser?.id === id) {
        setCurrentUser(updated);
      }
      if (data.password && data.password.trim()) {
        setSessionPasswords(prev => ({ ...prev, [id]: data.password!.trim() }));
      }
      setNotification('Datos del funcionario actualizados en base de datos.', 'success');
      return { ok: true };
    } catch (error: any) {
      setNotification(error.message || 'Error al actualizar funcionario.', 'danger');
      return { ok: false, message: error.message };
    }
  };

  const eliminarUsuario = async (id: number) => {
    if (id === currentUser?.id) {
      setNotification('No puedes eliminar tu propia cuenta en sesión activa.', 'danger');
      return;
    }
    try {
      await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== id));
      setNotification('Funcionario retirado de la nómina.', 'info');
    } catch (error: any) {
      setNotification(error.message || 'Error al eliminar funcionario.', 'danger');
    }
  };

  const actualizarConfiguracion = (data: Partial<Configuracion>) => {
    setConfig(prev => ({ ...prev, ...data }));
    apiFetch('/api/config', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
      .then(res => {
        if (res.config) setConfig(res.config);
      })
      .catch(err => setNotification(err.message || 'Error al guardar configuración.', 'danger'));
    setNotification('Parámetros de puntualidad y horarios actualizados.', 'success');
  };

  const crearEvento = (evento: Omit<Evento, 'id'>) => {
    const tempId = Date.now();
    setEvents(prev => [...prev, { ...evento, id: tempId }]);
    apiFetch('/api/events', {
      method: 'POST',
      body: JSON.stringify(evento),
    })
      .then(res => {
        if (res.event) setEvents(prev => prev.map(e => (e.id === tempId ? res.event : e)));
      })
      .catch(err => setNotification(err.message || 'Error al guardar evento.', 'danger'));
    setNotification('Actividad añadida a la agenda escolar.', 'success');
  };

  const editarEvento = (id: number, evento: Partial<Evento>) => {
    setEvents(prev => prev.map(e => (e.id === id ? { ...e, ...evento } : e)));
    apiFetch(`/api/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(evento),
    }).catch(err => setNotification(err.message || 'Error al actualizar actividad.', 'danger'));
    setNotification('Actividad actualizada en la agenda.', 'success');
  };

  const eliminarEvento = (id: number) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    apiFetch(`/api/events/${id}`, { method: 'DELETE' }).catch(err =>
      setNotification(err.message || 'Error al eliminar actividad.', 'danger')
    );
    setNotification('Actividad retirada de la agenda.', 'info');
  };

  const guardarHorarioPersonal = (
    usuarioId: number,
    jornadas: { dia_semana: number; hora_entrada: string; hora_salida: string }[]
  ) => {
    setPersonalSchedules(prev => {
      const filtered = prev.filter(h => h.usuario_id !== usuarioId);
      const nuevas = jornadas.map((j, idx) => ({
        id: Date.now() + idx,
        usuario_id: usuarioId,
        dia_semana: j.dia_semana,
        hora_entrada: j.hora_entrada,
        hora_salida: j.hora_salida,
      }));
      return [...filtered, ...nuevas];
    });
    apiFetch(`/api/schedules/personal/${usuarioId}`, {
      method: 'PUT',
      body: JSON.stringify({ jornadas }),
    })
      .then(res => {
        if (Array.isArray(res.schedules)) {
          setPersonalSchedules(prev => [
            ...prev.filter(h => h.usuario_id !== usuarioId),
            ...res.schedules,
          ]);
        }
      })
      .catch(err => setNotification(err.message || 'Error al guardar horario.', 'danger'));
    setNotification('Horario semanal del funcionario guardado con éxito.', 'success');
  };

  const guardarClasesDocente = (
    usuarioId: number,
    curso: string,
    nuevasClases: Omit<ClaseHorario, 'id' | 'usuario_id' | 'curso'>[]
  ) => {
    setClasses(prev => {
      const rest = prev.filter(c => !(c.usuario_id === usuarioId && c.curso === curso));
      const added: ClaseHorario[] = nuevasClases.map((c, idx) => ({
        id: Date.now() + idx,
        usuario_id: usuarioId,
        curso,
        nombre: c.nombre,
        tipo: c.tipo,
        dia_semana: c.dia_semana,
        hora_inicio: c.hora_inicio,
        hora_fin: c.hora_fin,
        aula: c.aula,
      }));
      return [...rest, ...added];
    });
    apiFetch(`/api/schedules/classes/${usuarioId}`, {
      method: 'PUT',
      body: JSON.stringify({ curso, clases: nuevasClases }),
    })
      .then(res => {
        if (Array.isArray(res.classes)) {
          setClasses(prev => [
            ...prev.filter(c => !(c.usuario_id === usuarioId && c.curso === curso)),
            ...res.classes,
          ]);
        }
      })
      .catch(err => setNotification(err.message || 'Error al guardar clases.', 'danger'));
    const user = users.find(u => u.id === usuarioId);
    setNotification(`Clases asignadas a ${user?.nombre || 'Docente'}.`, 'success');
  };

  const crearPlantilla = async (
    nombre: string,
    descripcion: string,
    detalles: { dia_semana: number; hora_entrada: string; hora_salida: string }[]
  ) => {
    if (!nombre.trim()) return { ok: false, message: 'El nombre es obligatorio' };
    if (templates.some(t => t.nombre.toLowerCase() === nombre.trim().toLowerCase())) {
      setNotification('Ya existe una plantilla con ese nombre.', 'warning');
      return { ok: false, message: 'Nombre duplicado' };
    }

    const validDetails = detalles.filter(d => d.hora_entrada && d.hora_salida);
    if (!validDetails.length) {
      setNotification('Define al menos un día de trabajo con horario válido.', 'danger');
      return { ok: false, message: 'Días insuficientes' };
    }

    try {
      const res = await apiFetch('/api/templates', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim(), descripcion: descripcion.trim(), detalles: validDetails }),
      });
      setTemplates(prev => [...prev, res.template]);
      setNotification('Plantilla de horario creada correctamente.', 'success');
      return { ok: true, message: 'Plantilla creada' };
    } catch (error: any) {
      setNotification(error.message || 'Error al crear plantilla.', 'danger');
      return { ok: false, message: error.message || 'Error' };
    }
  };

  const alternarPlantilla = (plantillaId: number) => {
    setTemplates(prev =>
      prev.map(t => (t.id === plantillaId ? { ...t, activa: !t.activa } : t))
    );
    apiFetch(`/api/templates/${plantillaId}/toggle`, { method: 'PATCH' }).catch(err =>
      setNotification(err.message || 'Error al actualizar plantilla.', 'danger')
    );
    setNotification('Estado de la plantilla actualizado.', 'success');
  };

  const asignarPlantilla = (data: {
    plantilla_id: number;
    usuario_id?: number | null;
    rol?: string | null;
    departamento?: string | null;
    fecha_inicio: string;
    fecha_fin?: string | null;
    prioridad: number;
  }) => {
    const tempId = Date.now();
    const newAsig: AsignacionHorario = {
      id: tempId,
      plantilla_id: data.plantilla_id,
      usuario_id: data.usuario_id || null,
      rol: data.rol || null,
      departamento: data.departamento || null,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin || null,
      prioridad: data.prioridad,
      creada_en: new Date().toISOString(),
    };
    setAssignments(prev => [newAsig, ...prev]);
    apiFetch('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    })
      .then(res => {
        if (res.assignment) {
          setAssignments(prev => prev.map(a => (a.id === tempId ? res.assignment : a)));
        }
      })
      .catch(err => setNotification(err.message || 'Error al asignar plantilla.', 'danger'));
    setNotification('Horario asignado correctamente.', 'success');
  };

  const eliminarAsignacion = (asignacionId: number) => {
    setAssignments(prev => prev.filter(a => a.id !== asignacionId));
    apiFetch(`/api/assignments/${asignacionId}`, { method: 'DELETE' }).catch(err =>
      setNotification(err.message || 'Error al eliminar asignación.', 'danger')
    );
    setNotification('Asignación eliminada.', 'success');
  };

  const resetToDefaults = () => {
    setEvents([]);
    setAttendances([]);
    setConfig(DEFAULT_SYSTEM_CONFIG);
    setPersonalSchedules([]);
    setTemplates([]);
    setAssignments([]);
    setClasses([]);
    setPermissions([]);
    apiFetch('/api/system/reset', { method: 'POST' }).catch(err =>
      setNotification(err.message || 'Error al restablecer datos.', 'danger')
    );
    setNotification('Registros operacionales restablecidos en la base de datos.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        events,
        attendances,
        config,
        personalSchedules,
        templates,
        assignments,
        classes,
        permissions,
        sessionPasswords,
        authReady,
        adminClaimed,
        activeNotification,
        claimAdmin,
        login,
        loginWithGoogle,
        logout,
        setNotification,
        clearNotification,
        registrarAsistencia,
        registrarAsistenciaManual,
        reportarInasistencia,
        aprobarInasistencia,
        rechazarInasistencia,
        solicitarPermiso,
        resolverPermiso,
        crearUsuario,
        editarUsuario,
        eliminarUsuario,
        actualizarConfiguracion,
        crearEvento,
        editarEvento,
        eliminarEvento,
        guardarHorarioPersonal,
        guardarClasesDocente,
        crearPlantilla,
        alternarPlantilla,
        asignarPlantilla,
        eliminarAsignacion,
        getHorarioDeUsuario,
        resetToDefaults,
        palettes: [
          { id: 'institucional', nombre: 'Verde Institucional', primary: '#0C5528', accent: '#DF5C12' }
        ],
        currentPaletteId: 'institucional',
        primaryColor: '#0C5528',
        accentColor: '#DF5C12',
        cambiarPaleta: () => {},
        cambiarColoresPersonalizados: () => {},
        resetearColoresInstitucionales: () => {},
        cargarDatosDemostracion: () => {},
        vaciarRegistros: () => resetToDefaults(),
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
