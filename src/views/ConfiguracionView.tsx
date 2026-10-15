import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  Clock,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const ConfiguracionView: React.FC = () => {
  const { config, actualizarConfiguracion, resetToDefaults } = useApp();

  const [horaEntrada, setHoraEntrada] = useState(config.hora_entrada_oficial);
  const [horaSalida, setHoraSalida] = useState(config.hora_salida_oficial || '15:30');
  const [diasLaborables, setDiasLaborables] = useState<number[]>(config.dias_laborables);
  const [limitePermisos, setLimitePermisos] = useState<number>(config.limite_permisos);

  const days = [
    { num: 0, label: 'Lun' },
    { num: 1, label: 'Mar' },
    { num: 2, label: 'Mié' },
    { num: 3, label: 'Jue' },
    { num: 4, label: 'Vie' },
    { num: 5, label: 'Sáb' },
    { num: 6, label: 'Dom' },
  ];

  const handleToggleDay = (dayNum: number) => {
    setDiasLaborables(prev =>
      prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum].sort()
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    actualizarConfiguracion({
      hora_entrada_oficial: horaEntrada,
      hora_salida_oficial: horaSalida,
      dias_laborables: diasLaborables,
      limite_permisos: Number(limitePermisos),
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#0C5528]" />
          Parámetros del Sistema
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Ajustes operacionales de control de entrada, días hábiles y puntualidad oficial
        </p>
      </div>

      <div className="bg-white rounded-3xl border-l-4 border-l-amber-500 border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="pb-4 border-b border-slate-100">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Configuración de Jornada Oficial
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Establezca las reglas institucionales para el cálculo automático de puntualidad
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Hora Oficial de Entrada Límite
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="time"
                value={horaEntrada}
                onChange={e => setHoraEntrada(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60 text-amber-900">
              * Todo escaneo de QR de asistencia ejecutado por el personal que pase de esta hora establecida, será clasificado por el sistema automáticamente con el estatus de <strong>"Con Retraso"</strong>, registrando los minutos exactos excedidos.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Hora de Salida Referencial
            </label>
            <input
              type="time"
              value={horaSalida}
              onChange={e => setHoraSalida(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Días Laborables Semanales
            </label>
            <div className="flex flex-wrap gap-2">
              {days.map(d => {
                const active = diasLaborables.includes(d.num);
                return (
                  <button
                    key={d.num}
                    type="button"
                    onClick={() => handleToggleDay(d.num)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      active
                        ? 'bg-[#0C5528] text-white border-[#0C5528] shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Límite de Permisos por Persona
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={limitePermisos}
              onChange={e => setLimitePermisos(Number(e.target.value))}
              required
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Cantidad máxima de solicitudes de permiso justificadas permitidas por año escolar.
            </span>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={resetToDefaults}
              className="px-3.5 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Valores por Defecto
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" /> Fijar Parámetros de Puntualidad
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
