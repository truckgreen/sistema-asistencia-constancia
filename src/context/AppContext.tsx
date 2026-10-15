import React, { createContext, useContext, useState, useEffect } from 'react';
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
  activeNotification: { message: string; type: 'success' | 'warning' | 'danger' | 'info' } | null;

  // Actions
  login: (correo: string, password?: string) => boolean;
  logout: () => void;
  switchUser: (id: number) => void;
  setNotification: (message: string, type: 'success' | 'warning' | 'danger' | 'info') => void;
  clearNotification: () => void;

  // Asistencias & QR
  registrarAsistencia: (usuarioId: number) => { ok: boolean; message: string; estado?: string; hora?: string };
  registrarAsistenciaManual: (usuarioId: number, fecha: string, hora: string) => { ok: boolean; message: string };
  reportarInasistencia: (data: { usuario_id: number; motivo: string; observaciones?: string; archivo_adjunto?: string }) => void;
  aprobarInasistencia: (asistenciaId: number) => void;
  rechazarInasistencia: (asistenciaId: number) => void;

  // Permisos
  solicitarPermiso: (data: { usuario_id: number; fecha_inicio: string; fecha_fin: string; motivo: string; observaciones?: string; archivo_adjunto?: string }) => { ok: boolean; message: string };
  resolverPermiso: (permisoId: number, accion: 'aprobar' | 'rechazar') => void;

  // Usuarios
  crearUsuario: (data: Omit<Usuario, 'id'>) => { ok: boolean; message: string; password?: string };
  editarUsuario: (id: number, data: Partial<Usuario>) => void;
  eliminarUsuario: (id: number) => void;

  // Configuración
  actualizarConfiguracion: (data: Partial<Configuracion>) => void;

  // Eventos / Agenda
  crearEvento: (evento: Omit<Evento, 'id'>) => void;
  editarEvento: (id: number, evento: Partial<Evento>) => void;
  eliminarEvento: (id: number) => void;

  // Horarios & Clases
  guardarHorarioPersonal: (usuarioId: number, jornadas: { dia_semana: number; hora_entrada: string; hora_salida: string }[]) => void;
  guardarClasesDocente: (usuarioId: number, curso: string, clases: Omit<ClaseHorario, 'id' | 'usuario_id' | 'curso'>[]) => void;
  crearPlantilla: (nombre: string, descripcion: string, detalles: { dia_semana: number; hora_entrada: string; hora_salida: string }[]) => { ok: boolean; message: string };
  alternarPlantilla: (plantillaId: number) => void;
  asignarPlantilla: (data: { plantilla_id: number; usuario_id?: number | null; rol?: string | null; departamento?: string | null; fecha_inicio: string; fecha_fin?: string | null; prioridad: number }) => void;
  eliminarAsignacion: (asignacionId: number) => void;

  // Helper
  getHorarioDeUsuario: (usuario: Usuario, fechaStr: string) => { hora_entrada: string; hora_salida: string };
  resetToDefaults: () => void;
}

const STORAGE_KEY = 'sistema_asistencia_la_constancia_v1';

// Seed Events (Efemérides Institucionales de Venezuela de app.py)
const SEED_EVENTS: Evento[] = [
  { id: 1, titulo: "Inicio Frente Cívico-Militar", fecha_inicio: "2026-01-01T08:00", fecha_fin: "2026-01-01T12:00", tipo: "institucional" },
  { id: 2, titulo: "Día del Maestro", fecha_inicio: "2026-01-15T08:00", fecha_fin: "2026-01-15T14:00", tipo: "institucional" },
  { id: 3, titulo: "Día de la Juventud / Batalla La Victoria", fecha_inicio: "2026-02-12T08:00", fecha_fin: "2026-02-12T12:00", tipo: "institucional" },
  { id: 4, titulo: "Día del Médico / Natalicio J.M. Vargas", fecha_inicio: "2026-03-10T09:00", fecha_fin: "2026-03-10T12:00", tipo: "institucional" },
  { id: 5, titulo: "Primer Grito de Independencia", fecha_inicio: "2026-04-19T08:00", fecha_fin: "2026-04-19T17:00", tipo: "feriado" },
  { id: 6, titulo: "Día Internacional del Trabajador", fecha_inicio: "2026-05-01T08:00", fecha_fin: "2026-05-01T17:00", tipo: "feriado" },
  { id: 7, titulo: "Batalla de Carabobo / Día del Ejército", fecha_inicio: "2026-06-24T08:00", fecha_fin: "2026-06-24T17:00", tipo: "feriado" },
  { id: 8, titulo: "Firma Acta de Independencia", fecha_inicio: "2026-07-05T08:00", fecha_fin: "2026-07-05T17:00", tipo: "feriado" },
  { id: 9, titulo: "Natalicio de Simón Bolívar", fecha_inicio: "2026-07-24T08:00", fecha_fin: "2026-07-24T17:00", tipo: "feriado" },
  { id: 10, titulo: "Día de la Resistencia Indígena", fecha_inicio: "2026-10-12T08:00", fecha_fin: "2026-10-12T17:00", tipo: "feriado" },
  { id: 11, titulo: "Consejo General de Profesores", fecha_inicio: "2026-10-16T08:00", fecha_fin: "2026-10-16T11:30", tipo: "institucional" },
  { id: 12, titulo: "Natalicio Simón Rodríguez", fecha_inicio: "2026-10-28T09:00", fecha_fin: "2026-10-28T12:00", tipo: "institucional" },
  { id: 13, titulo: "Día del Estudiante Universitario", fecha_inicio: "2026-11-21T08:00", fecha_fin: "2026-11-21T13:00", tipo: "institucional" },
  { id: 14, titulo: "Día del Profesor", fecha_inicio: "2026-12-05T08:00", fecha_fin: "2026-12-05T14:00", tipo: "institucional" },
  { id: 15, titulo: "Muerte del Libertador Simón Bolívar", fecha_inicio: "2026-12-17T08:00", fecha_fin: "2026-12-17T12:00", tipo: "institucional" },
  // Clases regulares
  { id: 16, titulo: "Física Cuántica - 5to Año", fecha_inicio: "2026-10-15T07:30", fecha_fin: "2026-10-15T09:00", tipo: "clase", profesor_id: 2 },
  { id: 17, titulo: "Matemática Aplicada - 4to Año", fecha_inicio: "2026-10-15T09:30", fecha_fin: "2026-10-15T11:00", tipo: "clase", profesor_id: 2 },
  { id: 18, titulo: "Literatura Venezolana - 3er Año", fecha_inicio: "2026-10-15T08:00", fecha_fin: "2026-10-15T09:30", tipo: "clase", profesor_id: 3 },
];

const SEED_USERS: Usuario[] = [
  {
    id: 1,
    nombre: "Director",
    apellido: "General",
    correo: "director@institucion.edu",
    password: "admin123",
    telefono: "0412-1122334",
    fecha_nacimiento: "1978-05-14",
    hora_entrada: "07:30",
    hora_salida: "15:30",
    limite_permisos: 3,
    rol: "directivo",
    departamento: "Dirección",
  },
  {
    id: 2,
    nombre: "Carlos",
    apellido: "Mendoza",
    correo: "carlos.mendoza@institucion.edu",
    password: "password123",
    telefono: "0414-1234567",
    fecha_nacimiento: "1985-10-15", // Cumpleaños hoy!
    hora_entrada: "07:00",
    hora_salida: "13:00",
    limite_permisos: 3,
    rol: "personal",
    departamento: "Ciencias",
  },
  {
    id: 3,
    nombre: "María",
    apellido: "Rodríguez",
    correo: "maria.rodriguez@institucion.edu",
    password: "password123",
    telefono: "0424-7654321",
    fecha_nacimiento: "1990-03-22",
    hora_entrada: "07:30",
    hora_salida: "15:30",
    limite_permisos: 3,
    rol: "personal",
    departamento: "Humanidades",
  },
  {
    id: 4,
    nombre: "Luis",
    apellido: "Gómez",
    correo: "luis.gomez@institucion.edu",
    password: "password123",
    telefono: "0412-9988776",
    fecha_nacimiento: "1988-10-15", // Cumpleaños hoy!
    hora_entrada: "07:30",
    hora_salida: "15:30",
    limite_permisos: 3,
    rol: "administrativo",
    departamento: "Control de Estudios",
  },
  {
    id: 5,
    nombre: "Pedro",
    apellido: "Pérez",
    correo: "pedro.perez@institucion.edu",
    password: "password123",
    telefono: "0416-5544332",
    fecha_nacimiento: "1982-11-09",
    hora_entrada: "06:30",
    hora_salida: "14:30",
    limite_permisos: 3,
    rol: "obrero",
    departamento: "Mantenimiento",
  },
];

const SEED_CONFIG: Configuracion = {
  hora_entrada_oficial: "07:30",
  hora_salida_oficial: "15:30",
  dias_laborables: [0, 1, 2, 3, 4], // Lunes a Viernes
  limite_permisos: 3,
};

const SEED_TEMPLATES: PlantillaHorario[] = [
  {
    id: 1,
    nombre: "Jornada Matutina Docente",
    descripcion: "Horario estándar para personal docente de aula",
    activa: true,
    detalles: [
      { dia_semana: 0, hora_entrada: "07:00", hora_salida: "13:00" },
      { dia_semana: 1, hora_entrada: "07:00", hora_salida: "13:00" },
      { dia_semana: 2, hora_entrada: "07:00", hora_salida: "13:00" },
      { dia_semana: 3, hora_entrada: "07:00", hora_salida: "13:00" },
      { dia_semana: 4, hora_entrada: "07:00", hora_salida: "13:00" },
    ],
  },
  {
    id: 2,
    nombre: "Jornada Administrativa General",
    descripcion: "Horario de oficina y soporte institucional",
    activa: true,
    detalles: [
      { dia_semana: 0, hora_entrada: "07:30", hora_salida: "15:30" },
      { dia_semana: 1, hora_entrada: "07:30", hora_salida: "15:30" },
      { dia_semana: 2, hora_entrada: "07:30", hora_salida: "15:30" },
      { dia_semana: 3, hora_entrada: "07:30", hora_salida: "15:30" },
      { dia_semana: 4, hora_entrada: "07:30", hora_salida: "15:30" },
    ],
  },
];

const SEED_PERSONAL_SCHEDULES: HorarioPersonal[] = [
  { id: 1, usuario_id: 2, dia_semana: 0, hora_entrada: "07:00", hora_salida: "13:00" },
  { id: 2, usuario_id: 2, dia_semana: 1, hora_entrada: "07:00", hora_salida: "13:00" },
  { id: 3, usuario_id: 2, dia_semana: 2, hora_entrada: "07:00", hora_salida: "13:00" },
  { id: 4, usuario_id: 2, dia_semana: 3, hora_entrada: "07:00", hora_salida: "13:00" },
  { id: 5, usuario_id: 2, dia_semana: 4, hora_entrada: "07:00", hora_salida: "13:00" },
];

const SEED_ASSIGNMENTS: AsignacionHorario[] = [
  {
    id: 1,
    plantilla_id: 1,
    rol: "personal",
    fecha_inicio: "2026-09-15",
    prioridad: 10,
    creada_en: "2026-09-15T08:00:00Z",
  },
  {
    id: 2,
    plantilla_id: 2,
    departamento: "Control de Estudios",
    fecha_inicio: "2026-09-15",
    prioridad: 20,
    creada_en: "2026-09-15T08:00:00Z",
  },
];

const SEED_CLASSES: ClaseHorario[] = [
  { id: 1, usuario_id: 2, curso: "Segundo Año 'A'", nombre: "Matemática", tipo: "clase", dia_semana: 0, hora_inicio: "07:00", hora_fin: "08:30", aula: "Aula 4" },
  { id: 2, usuario_id: 2, curso: "Segundo Año 'A'", nombre: "Receso Matutino", tipo: "receso", dia_semana: 0, hora_inicio: "08:30", hora_fin: "09:00", aula: "Patio Central" },
  { id: 3, usuario_id: 2, curso: "Segundo Año 'A'", nombre: "Física", tipo: "clase", dia_semana: 0, hora_inicio: "09:00", hora_fin: "10:30", aula: "Lab 1" },
  { id: 4, usuario_id: 2, curso: "Segundo Año 'A'", nombre: "Química", tipo: "clase", dia_semana: 0, hora_inicio: "10:30", hora_fin: "12:00", aula: "Lab 2" },
  { id: 5, usuario_id: 2, curso: "Segundo Año 'A'", nombre: "Tutoría Académica", tipo: "clase", dia_semana: 0, hora_inicio: "12:00", hora_fin: "13:00", aula: "Aula 4" },
  { id: 6, usuario_id: 2, curso: "Segundo Año 'A'", nombre: "Matemática", tipo: "clase", dia_semana: 1, hora_inicio: "07:00", hora_fin: "08:30", aula: "Aula 4" },
  { id: 7, usuario_id: 2, curso: "Segundo Año 'A'", nombre: "Física", tipo: "clase", dia_semana: 2, hora_inicio: "07:00", hora_fin: "08:30", aula: "Lab 1" },
  { id: 8, usuario_id: 2, curso: "Tercer Año 'B'", nombre: "Biología General", tipo: "clase", dia_semana: 3, hora_inicio: "08:00", hora_fin: "10:00", aula: "Lab Bio" },
  { id: 9, usuario_id: 3, curso: "Primer Año 'C'", nombre: "Castellano y Literatura", tipo: "clase", dia_semana: 0, hora_inicio: "07:30", hora_fin: "09:30", aula: "Aula 1" },
  { id: 10, usuario_id: 3, curso: "Primer Año 'C'", nombre: "Historia de Venezuela", tipo: "clase", dia_semana: 2, hora_inicio: "07:30", hora_fin: "09:30", aula: "Aula 1" },
];

const TODAY_DATE = '2026-10-15';

const SEED_ATTENDANCES: AsistenciaDiaria[] = [
  {
    id: 1,
    usuario_id: 2,
    fecha: TODAY_DATE,
    hora_registro: `${TODAY_DATE}T06:58:30`,
    estado: 'A tiempo',
    minutos_retraso: 0,
    registrada_manualmente: false,
  },
  {
    id: 2,
    usuario_id: 5,
    fecha: TODAY_DATE,
    hora_registro: `${TODAY_DATE}T06:22:15`,
    estado: 'A tiempo',
    minutos_retraso: 0,
    registrada_manualmente: false,
  },
  {
    id: 3,
    usuario_id: 4,
    fecha: TODAY_DATE,
    hora_registro: `${TODAY_DATE}T07:49:10`,
    estado: 'Tarde',
    minutos_retraso: 19,
    registrada_manualmente: false,
  },
  {
    id: 4,
    usuario_id: 3,
    fecha: TODAY_DATE,
    hora_registro: `${TODAY_DATE}T07:15:00`,
    estado: 'Inasistencia Reportada',
    minutos_retraso: 0,
    motivo: 'salud',
    observaciones: 'Reposo médico por consulta odontológica de urgencia.',
    archivo_adjunto: 'constancia_medica_rodriguez.pdf',
  },
  // Past attendances
  {
    id: 5,
    usuario_id: 2,
    fecha: '2026-10-14',
    hora_registro: '2026-10-14T07:01:20',
    estado: 'A tiempo',
    minutos_retraso: 1,
  },
  {
    id: 6,
    usuario_id: 3,
    fecha: '2026-10-14',
    hora_registro: '2026-10-14T07:25:00',
    estado: 'A tiempo',
    minutos_retraso: 0,
  },
  {
    id: 7,
    usuario_id: 4,
    fecha: '2026-10-14',
    hora_registro: '2026-10-14T07:55:00',
    estado: 'Tarde',
    minutos_retraso: 25,
  },
  {
    id: 8,
    usuario_id: 5,
    fecha: '2026-10-14',
    hora_registro: '2026-10-14T06:28:00',
    estado: 'A tiempo',
    minutos_retraso: 0,
  },
  {
    id: 9,
    usuario_id: 2,
    fecha: '2026-10-13',
    hora_registro: '2026-10-13T06:55:00',
    estado: 'A tiempo',
    minutos_retraso: 0,
  },
  {
    id: 10,
    usuario_id: 3,
    fecha: '2026-10-13',
    hora_registro: '2026-10-13T07:30:00',
    estado: 'Inasistencia Aprobada',
    minutos_retraso: 0,
    motivo: 'personal',
    observaciones: 'Trámite de renovación de cédula en SAIME.',
  },
];

const SEED_PERMISOS: Permiso[] = [
  {
    id: 1,
    usuario_id: 3,
    fecha_inicio: '2026-10-20',
    fecha_fin: '2026-10-21',
    motivo: 'salud',
    observaciones: 'Exámenes médicos programados de rutina.',
    archivo_adjunto: 'orden_medica.pdf',
    estado: 'Pendiente',
    creado_en: '2026-10-14T14:30:00Z',
  },
  {
    id: 2,
    usuario_id: 2,
    fecha_inicio: '2026-10-05',
    fecha_fin: '2026-10-05',
    motivo: 'personal',
    observaciones: 'Asistencia a graduación de familiar directo.',
    archivo_adjunto: 'invitacion.pdf',
    estado: 'Aprobado',
    creado_en: '2026-10-02T10:00:00Z',
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<Usuario[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_users`);
    return saved ? JSON.parse(saved) : SEED_USERS;
  });

  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_currentUser`);
    return saved ? JSON.parse(saved) : SEED_USERS[0]; // Default directivo
  });

  const [events, setEvents] = useState<Evento[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_events`);
    return saved ? JSON.parse(saved) : SEED_EVENTS;
  });

  const [attendances, setAttendances] = useState<AsistenciaDiaria[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_attendances`);
    return saved ? JSON.parse(saved) : SEED_ATTENDANCES;
  });

  const [config, setConfig] = useState<Configuracion>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_config`);
    return saved ? JSON.parse(saved) : SEED_CONFIG;
  });

  const [personalSchedules, setPersonalSchedules] = useState<HorarioPersonal[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_personalSchedules`);
    return saved ? JSON.parse(saved) : SEED_PERSONAL_SCHEDULES;
  });

  const [templates, setTemplates] = useState<PlantillaHorario[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_templates`);
    return saved ? JSON.parse(saved) : SEED_TEMPLATES;
  });

  const [assignments, setAssignments] = useState<AsignacionHorario[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_assignments`);
    return saved ? JSON.parse(saved) : SEED_ASSIGNMENTS;
  });

  const [classes, setClasses] = useState<ClaseHorario[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_classes`);
    return saved ? JSON.parse(saved) : SEED_CLASSES;
  });

  const [permissions, setPermissions] = useState<Permiso[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_permissions`);
    return saved ? JSON.parse(saved) : SEED_PERMISOS;
  });

  const [activeNotification, setActiveNotification] = useState<{
    message: string;
    type: 'success' | 'warning' | 'danger' | 'info';
  } | null>(null);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${STORAGE_KEY}_currentUser`, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(`${STORAGE_KEY}_currentUser`);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_events`, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_attendances`, JSON.stringify(attendances));
  }, [attendances]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_config`, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_personalSchedules`, JSON.stringify(personalSchedules));
  }, [personalSchedules]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_templates`, JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_assignments`, JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_permissions`, JSON.stringify(permissions));
  }, [permissions]);

  const setNotification = (message: string, type: 'success' | 'warning' | 'danger' | 'info') => {
    setActiveNotification({ message, type });
  };

  const clearNotification = () => {
    setActiveNotification(null);
  };

  const login = (correo: string, password?: string): boolean => {
    const user = users.find(u => u.correo.toLowerCase() === correo.trim().toLowerCase());
    if (user) {
      // In a real environment passwords match; for ease of testing we check or allow default
      if (!password || !user.password || user.password === password) {
        setCurrentUser(user);
        setNotification(`Bienvenido, ${user.nombre} ${user.apellido}`, 'success');
        return true;
      }
    }
    setNotification('Credenciales de acceso inválidas.', 'danger');
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setNotification('Sesión finalizada correctamente.', 'info');
  };

  const switchUser = (id: number) => {
    const u = users.find(user => user.id === id);
    if (u) {
      setCurrentUser(u);
      setNotification(`Has cambiado a la cuenta de ${u.nombre} ${u.apellido} (${u.rol.toUpperCase()})`, 'info');
    }
  };

  const getHorarioDeUsuario = (usuario: Usuario, fechaStr: string): { hora_entrada: string; hora_salida: string } => {
    const date = new Date(fechaStr + 'T00:00:00');
    // JS: 0=Sun, 1=Mon... In our Python app: 0=Mon, 6=Sun
    const pyDay = (date.getDay() + 6) % 7;

    // 1. Personal schedule
    const personal = personalSchedules.find(h => h.usuario_id === usuario.id && h.dia_semana === pyDay);
    if (personal) {
      return { hora_entrada: personal.hora_entrada, hora_salida: personal.hora_salida };
    }

    // 2. Template assignments
    const validAssignments = assignments.filter(asig => {
      const startOk = asig.fecha_inicio <= fechaStr;
      const endOk = !asig.fecha_fin || asig.fecha_fin >= fechaStr;
      const targetOk =
        asig.usuario_id === usuario.id ||
        (!asig.usuario_id && (asig.departamento === usuario.departamento || asig.rol === usuario.rol));
      return startOk && endOk && targetOk;
    });

    validAssignments.sort((a, b) => {
      const targetWeightA = a.usuario_id === usuario.id ? 3 : a.departamento === usuario.departamento ? 2 : 1;
      const targetWeightB = b.usuario_id === usuario.id ? 3 : b.departamento === usuario.departamento ? 2 : 1;
      if (targetWeightB !== targetWeightA) return targetWeightB - targetWeightA;
      if (b.prioridad !== a.prioridad) return b.prioridad - a.prioridad;
      return b.fecha_inicio.localeCompare(a.fecha_inicio);
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

    // 3. Fallback to user default or config official entry
    return {
      hora_entrada: usuario.hora_entrada || config.hora_entrada_oficial || '07:30',
      hora_salida: usuario.hora_salida || config.hora_salida_oficial || '15:30',
    };
  };

  const registrarAsistencia = (usuarioId: number) => {
    const today = new Date();
    const fecha = today.toISOString().split('T')[0];
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const seconds = String(today.getSeconds()).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    // Check if duplicate today
    const existe = attendances.find(a => a.usuario_id === usuarioId && a.fecha === fecha);
    if (existe) {
      return { ok: false, message: 'Ya habías registrado tu asistencia el día de hoy.' };
    }

    // Check laborable
    const pyDay = (today.getDay() + 6) % 7;
    if (!config.dias_laborables.includes(pyDay)) {
      return { ok: false, message: 'Hoy no es un día laborable configurado.' };
    }

    const targetUser = users.find(u => u.id === usuarioId);
    if (!targetUser) {
      return { ok: false, message: 'Usuario no encontrado.' };
    }

    const { hora_entrada } = getHorarioDeUsuario(targetUser, fecha);
    const [entryH, entryM] = hora_entrada.split(':').map(Number);
    const [curH, curM] = currentTimeStr.split(':').map(Number);
    const entryMinutesTotal = entryH * 60 + entryM;
    const currentMinutesTotal = curH * 60 + curM;

    const retraso = Math.max(0, currentMinutesTotal - entryMinutesTotal);
    const estado = retraso > 0 ? 'Tarde' : 'A tiempo';

    const newAttendance: AsistenciaDiaria = {
      id: Date.now(),
      usuario_id: usuarioId,
      fecha,
      hora_registro: `${fecha}T${hours}:${minutes}:${seconds}`,
      estado,
      minutos_retraso: retraso,
      registrada_manualmente: false,
    };

    setAttendances(prev => [newAttendance, ...prev]);
    const hora_str = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    return {
      ok: true,
      message: 'Asistencia registrada correctamente.',
      estado,
      hora: hora_str,
    };
  };

  const registrarAsistenciaManual = (usuarioId: number, fecha: string, hora: string) => {
    const existe = attendances.find(a => a.usuario_id === usuarioId && a.fecha === fecha);
    if (existe) {
      return { ok: false, message: 'Ya existe un registro para esa persona y fecha.' };
    }

    const targetUser = users.find(u => u.id === usuarioId);
    if (!targetUser) return { ok: false, message: 'Usuario no encontrado' };

    const { hora_entrada } = getHorarioDeUsuario(targetUser, fecha);
    const [entryH, entryM] = hora_entrada.split(':').map(Number);
    const [curH, curM] = hora.split(':').map(Number);
    const entryTotal = entryH * 60 + entryM;
    const curTotal = curH * 60 + curM;
    const retraso = Math.max(0, curTotal - entryTotal);
    const estado = retraso > 0 ? 'Tarde' : 'A tiempo';

    const newRec: AsistenciaDiaria = {
      id: Date.now(),
      usuario_id: usuarioId,
      fecha,
      hora_registro: `${fecha}T${hora}:00`,
      estado,
      minutos_retraso: retraso,
      registrada_manualmente: true,
    };

    setAttendances(prev => [newRec, ...prev]);
    setNotification('Asistencia manual registrada correctamente.', 'success');
    return { ok: true, message: 'Asistencia manual registrada correctamente.' };
  };

  const reportarInasistencia = (data: { usuario_id: number; motivo: string; observaciones?: string; archivo_adjunto?: string }) => {
    const fecha = new Date().toISOString().split('T')[0];
    const newRec: AsistenciaDiaria = {
      id: Date.now(),
      usuario_id: data.usuario_id,
      fecha,
      hora_registro: new Date().toISOString(),
      estado: 'Inasistencia Reportada',
      minutos_retraso: 0,
      motivo: data.motivo,
      observaciones: data.observaciones,
      archivo_adjunto: data.archivo_adjunto,
    };

    setAttendances(prev => [newRec, ...prev]);
    setNotification('Inasistencia reportada correctamente.', 'success');
  };

  const aprobarInasistencia = (asistenciaId: number) => {
    setAttendances(prev =>
      prev.map(a => (a.id === asistenciaId ? { ...a, estado: 'Inasistencia Aprobada' } : a))
    );
    setNotification('La justificación fue aprobada correctamente.', 'success');
  };

  const rechazarInasistencia = (asistenciaId: number) => {
    setAttendances(prev =>
      prev.map(a => (a.id === asistenciaId ? { ...a, estado: 'Inasistencia Rechazada' } : a))
    );
    setNotification('La justificación fue rechazada.', 'warning');
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
    const limit = user?.limite_permisos ?? config.limite_permisos;
    const used = permissions.filter(p => p.usuario_id === data.usuario_id && p.estado !== 'Rechazado').length;

    if (used >= limit) {
      setNotification(`Has alcanzado el límite de ${limit} permisos institucionales.`, 'warning');
      return { ok: false, message: `Límite alcanzado (${limit})` };
    }

    const newPermiso: Permiso = {
      id: Date.now(),
      usuario_id: data.usuario_id,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin,
      motivo: data.motivo,
      observaciones: data.observaciones,
      archivo_adjunto: data.archivo_adjunto,
      estado: 'Pendiente',
      creado_en: new Date().toISOString(),
    };

    setPermissions(prev => [newPermiso, ...prev]);
    setNotification('Solicitud de permiso enviada. No generará inasistencia mientras esté pendiente.', 'success');
    return { ok: true, message: 'Permiso enviado con éxito.' };
  };

  const resolverPermiso = (permisoId: number, accion: 'aprobar' | 'rechazar') => {
    setPermissions(prev =>
      prev.map(p => (p.id === permisoId ? { ...p, estado: accion === 'aprobar' ? 'Aprobado' : 'Rechazado' } : p))
    );
    setNotification(`Permiso ${accion === 'aprobar' ? 'aprobado' : 'rechazado'} correctamente.`, 'success');
  };

  const crearUsuario = (data: Omit<Usuario, 'id'>) => {
    const existe = users.find(u => u.correo.toLowerCase() === data.correo.toLowerCase());
    if (existe) {
      setNotification('El correo electrónico institucional ya existe.', 'danger');
      return { ok: false, message: 'Correo ya existente' };
    }

    const tempPassword = `Constancia${Math.floor(1000 + Math.random() * 9000)}!`;
    const newUser: Usuario = {
      ...data,
      id: Date.now(),
      password: tempPassword,
    };

    setUsers(prev => [...prev, newUser]);
    setNotification(`Personal creado con éxito. Contraseña provisional: ${tempPassword}`, 'success');
    return { ok: true, message: 'Usuario creado', password: tempPassword };
  };

  const editarUsuario = (id: number, data: Partial<Usuario>) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...data } : u)));
    if (currentUser?.id === id) {
      setCurrentUser(prev => (prev ? { ...prev, ...data } : null));
    }
    setNotification('Personal actualizado correctamente.', 'success');
  };

  const eliminarUsuario = (id: number) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    setAttendances(prev => prev.filter(a => a.usuario_id !== id));
    setPersonalSchedules(prev => prev.filter(s => s.usuario_id !== id));
    setClasses(prev => prev.filter(c => c.usuario_id !== id));
    setPermissions(prev => prev.filter(p => p.usuario_id !== id));
    setNotification('Personal eliminado del sistema.', 'danger');
  };

  const actualizarConfiguracion = (data: Partial<Configuracion>) => {
    setConfig(prev => ({ ...prev, ...data }));
    setNotification('Configuración institucional actualizada con éxito.', 'success');
  };

  const crearEvento = (evento: Omit<Evento, 'id'>) => {
    const newEv: Evento = { ...evento, id: Date.now() };
    setEvents(prev => [...prev, newEv]);
    setNotification('Actividad publicada en la agenda académica.', 'success');
  };

  const editarEvento = (id: number, updated: Partial<Evento>) => {
    setEvents(prev => prev.map(e => (e.id === id ? { ...e, ...updated } : e)));
    setNotification('Actividad modificada correctamente.', 'success');
  };

  const eliminarEvento = (id: number) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setNotification('Actividad eliminada del calendario.', 'info');
  };

  const guardarHorarioPersonal = (
    usuarioId: number,
    jornadas: { dia_semana: number; hora_entrada: string; hora_salida: string }[]
  ) => {
    setPersonalSchedules(prev => {
      const rest = prev.filter(p => p.usuario_id !== usuarioId);
      const added = jornadas
        .filter(j => j.hora_entrada && j.hora_salida)
        .map((j, idx) => ({
          id: Date.now() + idx,
          usuario_id: usuarioId,
          dia_semana: j.dia_semana,
          hora_entrada: j.hora_entrada,
          hora_salida: j.hora_salida,
        }));
      return [...rest, ...added];
    });
    const user = users.find(u => u.id === usuarioId);
    setNotification(`Horario individual de ${user?.nombre} ${user?.apellido} actualizado.`, 'success');
  };

  const guardarClasesDocente = (
    usuarioId: number,
    curso: string,
    clasesDocente: Omit<ClaseHorario, 'id' | 'usuario_id' | 'curso'>[]
  ) => {
    setClasses(prev => {
      const rest = prev.filter(c => c.usuario_id !== usuarioId);
      const added = clasesDocente
        .filter(c => c.nombre.trim() && c.hora_inicio && c.hora_fin)
        .map((c, idx) => ({
          id: Date.now() + idx,
          usuario_id: usuarioId,
          curso: curso || 'General',
          nombre: c.nombre,
          tipo: c.tipo,
          dia_semana: c.dia_semana,
          hora_inicio: c.hora_inicio,
          hora_fin: c.hora_fin,
          aula: c.aula,
        }));
      return [...rest, ...added];
    });
    const user = users.find(u => u.id === usuarioId);
    setNotification(`Clases asignadas a ${user?.nombre} ${user?.apellido}.`, 'success');
  };

  const crearPlantilla = (
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

    const newTemplate: PlantillaHorario = {
      id: Date.now(),
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      activa: true,
      detalles: validDetails,
    };

    setTemplates(prev => [...prev, newTemplate]);
    setNotification('Plantilla de horario creada correctamente.', 'success');
    return { ok: true, message: 'Plantilla creada' };
  };

  const alternarPlantilla = (plantillaId: number) => {
    setTemplates(prev =>
      prev.map(t => (t.id === plantillaId ? { ...t, activa: !t.activa } : t))
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
    const newAsig: AsignacionHorario = {
      id: Date.now(),
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
    setNotification('Horario asignado correctamente.', 'success');
  };

  const eliminarAsignacion = (asignacionId: number) => {
    setAssignments(prev => prev.filter(a => a.id !== asignacionId));
    setNotification('Asignación eliminada.', 'success');
  };

  const resetToDefaults = () => {
    localStorage.removeItem(`${STORAGE_KEY}_users`);
    localStorage.removeItem(`${STORAGE_KEY}_currentUser`);
    localStorage.removeItem(`${STORAGE_KEY}_events`);
    localStorage.removeItem(`${STORAGE_KEY}_attendances`);
    localStorage.removeItem(`${STORAGE_KEY}_config`);
    localStorage.removeItem(`${STORAGE_KEY}_personalSchedules`);
    localStorage.removeItem(`${STORAGE_KEY}_templates`);
    localStorage.removeItem(`${STORAGE_KEY}_assignments`);
    localStorage.removeItem(`${STORAGE_KEY}_classes`);
    localStorage.removeItem(`${STORAGE_KEY}_permissions`);

    setUsers(SEED_USERS);
    setCurrentUser(SEED_USERS[0]);
    setEvents(SEED_EVENTS);
    setAttendances(SEED_ATTENDANCES);
    setConfig(SEED_CONFIG);
    setPersonalSchedules(SEED_PERSONAL_SCHEDULES);
    setTemplates(SEED_TEMPLATES);
    setAssignments(SEED_ASSIGNMENTS);
    setClasses(SEED_CLASSES);
    setPermissions(SEED_PERMISOS);

    setNotification('Datos restablecidos a los valores predeterminados del sistema.', 'info');
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
        activeNotification,
        login,
        logout,
        switchUser,
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
