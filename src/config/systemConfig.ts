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
  password: "director123",
  telefono: "0412-0000000",
  hora_entrada: "07:30",
  hora_salida: "15:30",
  limite_permisos: 3,
  rol: "directivo" as RolUsuario,
  departamento: "Dirección General",
};

// Personal institucional predeterminado con credenciales iniciales
export const DEFAULT_INITIAL_USERS: Usuario[] = [
  DEFAULT_ADMIN_USER,
  {
    id: 2,
    nombre: "Carlos",
    apellido: "Silva",
    correo: "carlos.silva@institucion.edu",
    password: "carlos123",
    telefono: "0414-1112233",
    hora_entrada: "07:30",
    hora_salida: "15:30",
    limite_permisos: 3,
    rol: "personal" as RolUsuario,
    departamento: "Matemáticas y Ciencias",
  },
  {
    id: 3,
    nombre: "María",
    apellido: "González",
    correo: "maria.gonzalez@institucion.edu",
    password: "maria123",
    telefono: "0416-2223344",
    hora_entrada: "07:30",
    hora_salida: "15:30",
    limite_permisos: 3,
    rol: "personal" as RolUsuario,
    departamento: "Lengua y Literatura",
  },
  {
    id: 4,
    nombre: "Juan",
    apellido: "Pérez",
    correo: "juan.perez@institucion.edu",
    password: "juan123",
    telefono: "0424-3334455",
    hora_entrada: "07:00",
    hora_salida: "15:00",
    limite_permisos: 3,
    rol: "obrero" as RolUsuario,
    departamento: "Mantenimiento y Portería",
  },
  {
    id: 5,
    nombre: "Elena",
    apellido: "Mendoza",
    correo: "elena.mendoza@institucion.edu",
    password: "elena123",
    telefono: "0412-5556677",
    hora_entrada: "07:30",
    hora_salida: "15:30",
    limite_permisos: 3,
    rol: "administrativo" as RolUsuario,
    departamento: "Control de Estudios y Secretaría",
  },
];

// Parámetros por defecto de la jornada y puntualidad
export const DEFAULT_SYSTEM_CONFIG: Configuracion = {
  hora_entrada_oficial: "07:30",
  hora_salida_oficial: "15:30",
  dias_laborables: [0, 1, 2, 3, 4], // 0=Lunes a 4=Viernes
  limite_permisos: 3,
};

// Clave de almacenamiento local para persistencia limpia
export const STORAGE_KEY = 'sistema_asistencia_la_constancia_v2';
