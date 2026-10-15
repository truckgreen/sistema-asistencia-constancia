export type RolUsuario = 'directivo' | 'personal' | 'administrativo' | 'obrero';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  password?: string;
  telefono?: string;
  fecha_nacimiento?: string; // YYYY-MM-DD
  hora_entrada?: string; // HH:MM
  hora_salida?: string; // HH:MM
  limite_permisos?: number;
  rol: RolUsuario;
  departamento?: string;
}

export type TipoEvento = 'clase' | 'feriado' | 'institucional';

export interface Evento {
  id: number;
  titulo: string;
  fecha_inicio: string; // ISO string or YYYY-MM-DDTHH:mm
  fecha_fin: string; // ISO string or YYYY-MM-DDTHH:mm
  tipo: TipoEvento;
  profesor_id?: number | null;
}

export type EstadoAsistencia = 
  | 'A tiempo'
  | 'Tarde'
  | 'Ausente'
  | 'Inasistencia Reportada'
  | 'Inasistencia Aprobada'
  | 'Inasistencia Rechazada';

export interface AsistenciaDiaria {
  id: number;
  usuario_id: number;
  fecha: string; // YYYY-MM-DD
  hora_registro: string; // ISO string
  estado: EstadoAsistencia;
  minutos_retraso: number;
  registrada_manualmente?: boolean;
  motivo?: string;
  observaciones?: string;
  archivo_adjunto?: string;
}

export interface Configuracion {
  id?: number;
  hora_entrada_oficial: string; // HH:MM
  hora_salida_oficial?: string; // HH:MM
  dias_laborables: number[]; // 0=Lun ... 6=Dom
  limite_permisos: number;
}

export interface HorarioPersonal {
  id: number;
  usuario_id: number;
  dia_semana: number; // 0=Lunes...6=Domingo
  hora_entrada: string;
  hora_salida: string;
}

export interface DetallePlantillaHorario {
  dia_semana: number;
  hora_entrada: string;
  hora_salida: string;
}

export interface PlantillaHorario {
  id: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  detalles: DetallePlantillaHorario[];
}

export interface AsignacionHorario {
  id: number;
  plantilla_id: number;
  usuario_id?: number | null;
  rol?: string | null;
  departamento?: string | null;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin?: string | null; // YYYY-MM-DD
  prioridad: number;
  creada_en: string;
}

export interface ClaseHorario {
  id: number;
  usuario_id: number;
  curso: string;
  nombre: string;
  tipo: 'clase' | 'receso';
  dia_semana: number; // 0=Lunes...6=Domingo
  hora_inicio: string;
  hora_fin: string;
  aula?: string;
}

export type EstadoPermiso = 'Pendiente' | 'Aprobado' | 'Rechazado';

export interface Permiso {
  id: number;
  usuario_id: number;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string; // YYYY-MM-DD
  motivo: string;
  observaciones?: string;
  archivo_adjunto?: string;
  estado: EstadoPermiso;
  creado_en: string;
}
