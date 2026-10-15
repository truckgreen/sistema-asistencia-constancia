import React from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Sparkles,
  QrCode,
  UserPlus,
  CalendarPlus,
  CheckCircle2,
  Database,
  ArrowRight
} from 'lucide-react';

interface PaginaVaciaViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const PaginaVaciaView: React.FC<PaginaVaciaViewProps> = ({ onNavigate }) => {
  const {
    cargarDatosDemostracion,
    vaciarRegistros,
    attendances,
    primaryColor,
    accentColor,
  } = useApp();

  const isEmpty = attendances.length === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Banner de Presentación para el Jurado */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-200/60 text-amber-900 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-amber-950">
              Modo Página Vacía / Sistema en Blanco
            </h4>
            <p className="text-xs text-amber-800">
              Ideal para demostrar al Jurado cómo inicia la aplicación desde cero en una instalación nueva.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEmpty ? (
            <button
              onClick={vaciarRegistros}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              Vaciar Asistencias Ahora
            </button>
          ) : (
            <button
              onClick={cargarDatosDemostracion}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              Restaurar Datos Demo
            </button>
          )}
        </div>
      </div>

      {/* Main Empty State Canvas Card */}
      <div className="bg-white rounded-3xl p-10 sm:p-14 border border-slate-200 shadow-xl text-center relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500" />

        {/* Central Logo */}
        <div className="w-28 h-28 mx-auto mb-6 rounded-full bg-white p-2 border-2 border-slate-200 shadow-lg flex items-center justify-center">
          <img
            src="/img/logo.png"
            alt="Logo U.E. La Constancia"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/img/logoo.png';
            }}
          />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
          Página Vacía / Sistema Inicial en Blanco
        </h2>
        <p className="text-sm text-slate-500 max-w-lg mx-auto mt-2 leading-relaxed">
          Instancia de producción limpia para la <strong>U.E. "La Constancia"</strong>. No existen registros de asistencia ni solicitudes activas. El sistema se encuentra a la espera del primer ingreso o escaneo QR.
        </p>

        {/* Status indicator badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-800 mt-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Base de datos sincronizada y lista para operar</span>
        </div>

        {/* Next step prompt cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 text-left">
          <button
            onClick={() => onNavigate('qr_station')}
            className="p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md bg-slate-50/60 hover:bg-white transition group text-slate-700 cursor-pointer"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3 shadow-sm group-hover:scale-105 transition-transform"
              style={{ backgroundColor: primaryColor }}
            >
              <QrCode className="w-5 h-5" />
            </div>
            <div className="font-extrabold text-sm text-slate-800 group-hover:text-amber-700 transition-colors">
              1. Probar Escáner QR
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Abrir la estación de portería para marcar el primer registro del día.
            </p>
          </button>

          <button
            onClick={() => onNavigate('usuarios')}
            className="p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md bg-slate-50/60 hover:bg-white transition group text-slate-700 cursor-pointer"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3 shadow-sm group-hover:scale-105 transition-transform"
              style={{ backgroundColor: accentColor }}
            >
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="font-extrabold text-sm text-slate-800 group-hover:text-amber-700 transition-colors">
              2. Gestión de Personal
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Registrar nuevos docentes, obreros o personal administrativo.
            </p>
          </button>

          <button
            onClick={() => onNavigate('director')}
            className="p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md bg-slate-50/60 hover:bg-white transition group text-slate-700 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="font-extrabold text-sm text-slate-800 group-hover:text-amber-700 transition-colors">
              3. Panel Directivo
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ver la consola ejecutiva con métricas e indicadores en tiempo real.
            </p>
          </button>
        </div>

        {/* Quick action to populate */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center">
          <button
            onClick={() => {
              cargarDatosDemostracion();
              onNavigate('director');
            }}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>¿Deseas volver a cargar los datos de ejemplo de la tesis? Haz clic aquí</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
