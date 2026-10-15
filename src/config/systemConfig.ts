import { Usuario, Configuracion, RolUsuario } from '../types';

/**
 * =========================================================================
 * CONFIGURACIÓN CENTRALIZADA DEL SISTEMA (FÁCIL DE MODIFICAR)
 * =========================================================================
 * Edite aquí los valores por defecto, credenciales del administrador
 * y parámetros institucionales en caso de requerir cambios.
 */

// Identificación institucional
export const INSTITUTION_CONFIG = {
  name: 'U.E. "La Constancia"',
  shortName: 'La Constancia',
  subName: 'U.E. Sistema Integral',
  description: 'Sistema de Control de Asistencias & Agenda del Personal',
};

// Usuario Directivo / Administrador inicial
// Cambie aquí el correo y la contraseña según sea necesario
export const DEFAULT_ADMIN_USER: Usuario = {
  id: 1,
  nombre: "Director",
  apellido: "General",
  correo: "admin@institucion.edu",
  password: "admin",
  telefono: "0412-0000000",
  hora_entrada: "07:30",
  hora_salida: "15:30",
  limite_permisos: 3,
  rol: "directivo" as RolUsuario,
  departamento: "Dirección General",
};

// Parámetros por defecto de la jornada y puntualidad
export const DEFAULT_SYSTEM_CONFIG: Configuracion = {
  hora_entrada_oficial: "07:30",
  hora_salida_oficial: "15:30",
  dias_laborables: [0, 1, 2, 3, 4], // 0=Lunes a 4=Viernes
  limite_permisos: 3,
};

// Clave de almacenamiento local para persistencia limpia
export const STORAGE_KEY = 'sistema_asistencia_la_constancia_v2';
