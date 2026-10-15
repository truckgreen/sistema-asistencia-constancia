import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TipoEvento } from '../types';
import {
  CalendarPlus,
  Calendar,
  CloudCheck,
  CheckCircle2,
  Trash2,
  BookOpen,
  Flag,
  Users
} from 'lucide-react';

export const PlanificacionView: React.FC = () => {
  const { events, users, crearEvento, eliminarEvento } = useApp();

  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoEvento>('clase');
  const [profesorId, setProfesorId] = useState<string>(
    users.find(u => u.rol === 'personal')?.id ? String(users.find(u => u.rol === 'personal')?.id) : ''
  );
  const [fechaInicio, setFechaInicio] = useState('2026-10-16T08:00');
  const [fechaFin, setFechaFin] = useState('2026-10-16T10:00');

  const teachers = users.filter(u => u.rol === 'personal');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !fechaInicio || !fechaFin) return;

    crearEvento({
      titulo: titulo.trim(),
      tipo,
      profesor_id: tipo === 'clase' && profesorId ? Number(profesorId) : null,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    });

    setTitulo('');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <CalendarPlus className="w-6 h-6 text-[#0C5528]" />
          Planificación & Agenda Académica
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Carga de actividades pedagógicas, cátedras institucionales y efemérides
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Card (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border-l-4 border-l-blue-600 border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Agendar Nueva Actividad
            </h2>
            <p className="text-xs text-slate-400">
              Indexa la actividad en el calendario de profesores y estudiantes
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Nombre de la Asignación / Cátedra / Reunión
              </label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ej: Física de 5to Año, Consejo General de Profesores"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Tipo de Actividad</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value as TipoEvento)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="clase">Clase Académica Ordinaria</option>
                <option value="feriado">Día Feriado Obligatorio</option>
                <option value="institucional">Evento / Reunión Administrativa</option>
              </select>
            </div>

            {tipo === 'clase' && (
              <div>
                <label className="block font-bold text-slate-600 mb-1">Docente Titular Responsable</label>
                <select
                  value={profesorId}
                  onChange={e => setProfesorId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Seleccione docente...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.apellido}, {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Fecha y Hora de Inicio</label>
                <input
                  type="datetime-local"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Fecha y Hora de Cierre</label>
                <input
                  type="datetime-local"
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 mt-3"
            >
              <CloudCheck className="w-4 h-4 text-blue-200" />
              Publicar e Indexar en Calendario
            </button>
          </form>
        </div>

        {/* Existing Activities List (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Catálogo de Actividades Indexadas
              </h2>
              <span className="text-xs text-slate-400">
                {events.length} actividad(es) agendada(s)
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {events.map(ev => {
              const teacher = ev.profesor_id ? users.find(u => u.id === ev.profesor_id) : null;
              return (
                <div
                  key={ev.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          ev.tipo === 'clase'
                            ? 'bg-blue-500'
                            : ev.tipo === 'feriado'
                            ? 'bg-red-500'
                            : 'bg-amber-400'
                        }`}
                      />
                      {ev.titulo}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {ev.fecha_inicio.replace('T', ' ')} a {ev.fecha_fin.split('T')[1] || ev.fecha_fin}
                    </div>
                    {teacher && (
                      <div className="text-[11px] text-blue-700 font-medium">
                        Prof. {teacher.nombre} {teacher.apellido}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        ev.tipo === 'clase'
                          ? 'bg-blue-100 text-blue-800'
                          : ev.tipo === 'feriado'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ev.tipo}
                    </span>
                    <button
                      onClick={() => eliminarEvento(ev.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Eliminar actividad"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
