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
} from '../types';
import {
  DEFAULT_ADMIN_USER,
  DEFAULT_SYSTEM_CONFIG,
  STORAGE_KEY,
} from '../config/systemConfig';

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

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always start with empty data / clean single admin user
  const [users, setUsers] = useState<Usuario[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_users`);
      return saved ? JSON.parse(saved) : [DEFAULT_ADMIN_USER];
    } catch {
      return [DEFAULT_ADMIN_USER];
    }
  });

  // User must explicitly log in when entering the system
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_currentUser`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Empty initial events
  const [events, setEvents] = useState<Evento[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_events`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Empty initial attendances
  const [attendances, setAttendances] = useState<AsistenciaDiaria[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_attendances`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // System configuration
  const [config, setConfig] = useState<Configuracion>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_config`);
      return saved ? JSON.parse(saved) : DEFAULT_SYSTEM_CONFIG;
    } catch {
      return DEFAULT_SYSTEM_CONFIG;
    }
  });

  // Empty initial schedules
  const [personalSchedules, setPersonalSchedules] = useState<HorarioPersonal[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_personalSchedules`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Empty initial templates
  const [templates, setTemplates] = useState<PlantillaHorario[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_templates`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Empty initial assignments
  const [assignments, setAssignments] = useState<AsignacionHorario[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_assignments`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Empty initial classes
  const [classes, setClasses] = useState<ClaseHorario[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_classes`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Empty initial permissions
  const [permissions, setPermissions] = useState<Permiso[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_permissions`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
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
    const cleanMail = correo.trim().toLowerCase();
    const cleanPass = password?.trim() || '';

    // Search in current users list
    let user = users.find(u => u.correo.toLowerCase() === cleanMail);

    // Fallback check against default admin user in case user changed email in form
    if (!user && cleanMail === DEFAULT_ADMIN_USER.correo.toLowerCase()) {
      user = DEFAULT_ADMIN_USER;
    }

    if (user) {
      // Validate password
      if (!user.password || user.password === cleanPass) {
        setCurrentUser(user);
        setNotification(`Bienvenido al sistema, ${user.nombre} ${user.apellido}`, 'success');
        return true;
      }
    }

    setNotification('Credenciales de acceso incorrectas.', 'danger');
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setNotification('Sesión cerrada correctamente.', 'info');
  };

  const switchUser = (id: number) => {
    const u = users.find(user => user.id === id);
    if (u) {
      setCurrentUser(u);
    }
  };

  const getHorarioDeUsuario = (usuario: Usuario, fechaStr: string): { hora_entrada: string; hora_salida: string } => {
    const date = new Date(fechaStr + 'T00:00:00');
    // JS: 0=Sun, 1=Mon... Standard: 0=Mon, 6=Sun
    const pyDay = (date.getDay() + 6) % 7;

    // 1. Horario personal específico
    const personal = personalSchedules.find(h => h.usuario_id === usuario.id && h.dia_semana === pyDay);
    if (personal) {
      return { hora_entrada: personal.hora_entrada, hora_salida: personal.hora_salida };
    }

    // 2. Asignaciones de plantillas
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

    // 3. Horario por defecto del funcionario o del sistema
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
    const currentTimeStr = `${hours}:${minutes}`;

    // Validar si ya registró hoy
    const existe = attendances.find(a => a.usuario_id === usuarioId && a.fecha === fecha);
    if (existe) {
      return { ok: false, message: 'Ya se encuentra registrada la asistencia para el día de hoy.' };
    }

    const usuario = users.find(u => u.id === usuarioId);
    if (!usuario) {
      return { ok: false, message: 'Usuario no encontrado en el sistema.' };
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

    const nuevaAsistencia: AsistenciaDiaria = {
      id: Date.now(),
      usuario_id: usuarioId,
      fecha,
      hora_registro: today.toISOString(),
      estado,
      minutos_retraso,
      registrada_manualmente: false,
    };

    setAttendances(prev => [nuevaAsistencia, ...prev]);

    return {
      ok: true,
      message: `Asistencia de ${usuario.nombre} ${usuario.apellido} asentada (${estado}).`,
      estado,
      hora: currentTimeStr,
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

    const nueva: AsistenciaDiaria = {
      id: Date.now(),
      usuario_id: usuarioId,
      fecha,
      hora_registro: `${fecha}T${hora}:00`,
      estado,
      minutos_retraso,
      registrada_manualmente: true,
    };

    setAttendances(prev => [nueva, ...prev]);
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
    const user = users.find(u => u.id === data.usuario_id);

    const nueva: AsistenciaDiaria = {
      id: Date.now(),
      usuario_id: data.usuario_id,
      fecha: today,
      hora_registro: new Date().toISOString(),
      estado: 'Inasistencia Reportada',
      minutos_retraso: 0,
      motivo: data.motivo,
      observaciones: data.observaciones,
      archivo_adjunto: data.archivo_adjunto,
    };

    setAttendances(prev => [nueva, ...prev]);
    setNotification(`Inasistencia de ${user?.nombre} ${user?.apellido} enviada a revisión.`, 'info');
  };

  const aprobarInasistencia = (asistenciaId: number) => {
    setAttendances(prev =>
      prev.map(a => (a.id === asistenciaId ? { ...a, estado: 'Inasistencia Aprobada' } : a))
    );
    setNotification('Justificativo aprobado satisfactoriamente.', 'success');
  };

  const rechazarInasistencia = (asistenciaId: number) => {
    setAttendances(prev =>
      prev.map(a => (a.id === asistenciaId ? { ...a, estado: 'Inasistencia Rechazada' } : a))
    );
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

    const nuevo: Permiso = {
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

    setPermissions(prev => [nuevo, ...prev]);
    setNotification('Solicitud de permiso enviada a la Dirección.', 'success');
    return { ok: true, message: 'Solicitud registrada' };
  };

  const resolverPermiso = (permisoId: number, accion: 'aprobar' | 'rechazar') => {
    setPermissions(prev =>
      prev.map(p =>
        p.id === permisoId
          ? { ...p, estado: accion === 'aprobar' ? 'Aprobado' : 'Rechazado' }
          : p
      )
    );
    setNotification(
      accion === 'aprobar' ? 'Permiso aprobado con éxito.' : 'Permiso rechazado.',
      accion === 'aprobar' ? 'success' : 'info'
    );
  };

  const crearUsuario = (data: Omit<Usuario, 'id'>) => {
    const cleanMail = data.correo.trim().toLowerCase();
    if (users.some(u => u.correo.toLowerCase() === cleanMail)) {
      setNotification('Ya existe un funcionario registrado con ese correo electrónico.', 'warning');
      return { ok: false, message: 'Correo ya registrado' };
    }

    const defaultPass = `${data.nombre.toLowerCase().replace(/\s+/g, '')}123`;
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;

    const nuevo: Usuario = {
      ...data,
      id: newId,
      correo: cleanMail,
      password: data.password || defaultPass,
    };

    setUsers(prev => [...prev, nuevo]);
    setNotification(`Funcionario ${nuevo.nombre} ${nuevo.apellido} registrado exitosamente.`, 'success');
    return { ok: true, message: 'Usuario creado', password: nuevo.password };
  };

  const editarUsuario = (id: number, data: Partial<Usuario>) => {
    setUsers(prev =>
      prev.map(u => {
        if (u.id === id) {
          const updated = { ...u, ...data };
          if (currentUser?.id === id) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );
    setNotification('Datos del funcionario actualizados correctamente.', 'success');
  };

  const eliminarUsuario = (id: number) => {
    if (id === currentUser?.id) {
      setNotification('No puedes eliminar tu propia cuenta en sesión activa.', 'danger');
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== id));
    setNotification('Funcionario retirado de la nómina.', 'info');
  };

  const actualizarConfiguracion = (data: Partial<Configuracion>) => {
    setConfig(prev => ({ ...prev, ...data }));
    setNotification('Parámetros de puntualidad y horarios actualizados.', 'success');
  };

  const crearEvento = (evento: Omit<Evento, 'id'>) => {
    const nuevo: Evento = {
      ...evento,
      id: Date.now(),
    };
    setEvents(prev => [...prev, nuevo]);
    setNotification('Actividad añadida a la agenda escolar.', 'success');
  };

  const editarEvento = (id: number, evento: Partial<Evento>) => {
    setEvents(prev => prev.map(e => (e.id === id ? { ...e, ...evento } : e)));
    setNotification('Actividad actualizada en la agenda.', 'success');
  };

  const eliminarEvento = (id: number) => {
    setEvents(prev => prev.filter(e => e.id !== id));
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
    const user = users.find(u => u.id === usuarioId);
    setNotification(`Clases asignadas a ${user?.nombre || 'Docente'}.`, 'success');
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
    // Clear storage keys
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

    // Reset to clean empty states
    setUsers([DEFAULT_ADMIN_USER]);
    setCurrentUser(null);
    setEvents([]);
    setAttendances([]);
    setConfig(DEFAULT_SYSTEM_CONFIG);
    setPersonalSchedules([]);
    setTemplates([]);
    setAssignments([]);
    setClasses([]);
    setPermissions([]);

    setNotification('Sistema restablecido con base limpia de datos.', 'info');
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
