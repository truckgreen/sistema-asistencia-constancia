import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Evento, Usuario } from '../types';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  FileHeart,
  QrCode,
  FileSpreadsheet,
  Inbox,
  CalendarCheck,
  Edit3,
  Cake,
  Calendar,
  Clock,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

interface DirectorDashboardProps {
  onNavigate: (view: string, params?: any) => void;
}

export const DirectorDashboard: React.FC<DirectorDashboardProps> = ({ onNavigate }) => {
  const {
    users,
    attendances,
    events,
    permissions,
    aprobarInasistencia,
    rechazarInasistencia,
    resolverPermiso,
    registrarAsistenciaManual,
    crearEvento,
    editarEvento,
    eliminarEvento,
  } = useApp();

  const todayStr = '2026-10-15'; // Base system date
  const today = new Date(todayStr + 'T12:00:00');

  // Manual attendance form state
  const [manualUser, setManualUser] = useState<string>('');
  const [manualDate, setManualDate] = useState<string>(todayStr);
  const [manualTime, setManualTime] = useState<string>('07:30');

  // Filter teacher in calendar
  const [teacherFilter, setTeacherFilter] = useState<string>('todos');
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);

  // Event modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);
  const [eventForm, setEventForm] = useState({
    titulo: '',
    tipo: 'clase' as 'clase' | 'feriado' | 'institucional',
    profesor_id: '' as string,
    fecha_inicio: '',
    fecha_fin: '',
  });

  // Calculate Metrics
  const registrosHoy = useMemo(
    () => attendances.filter(a => a.fecha === todayStr),
    [attendances, todayStr]
  );
  const aTiempo = useMemo(
    () => registrosHoy.filter(a => a.estado === 'A tiempo'),
    [registrosHoy]
  );
  const conRetraso = useMemo(
    () => registrosHoy.filter(a => a.estado === 'Tarde'),
    [registrosHoy]
  );
  const solicitudesPendientes = useMemo(
    () => registrosHoy.filter(a => a.estado === 'Inasistencia Reportada'),
    [registrosHoy]
  );
  const inasistenciasAprobadas = useMemo(
    () => registrosHoy.filter(a => a.estado === 'Inasistencia Aprobada'),
    [registrosHoy]
  );
  const inasistenciasRechazadas = useMemo(
    () => registrosHoy.filter(a => a.estado === 'Inasistencia Rechazada'),
    [registrosHoy]
  );

  const permisosPendientes = useMemo(
    () => permissions.filter(p => p.estado === 'Pendiente'),
    [permissions]
  );

  // Cumpleañeros hoy (month & day match)
  const cumpleaneros = useMemo(() => {
    return users.filter(u => {
      if (!u.fecha_nacimiento) return false;
      const bDate = new Date(u.fecha_nacimiento + 'T12:00:00');
      return bDate.getMonth() === today.getMonth() && bDate.getDate() === today.getDate();
    });
  }, [users, today]);

  // Próximas actividades (next 7 days non-class events)
  const proximasActividades = useMemo(() => {
    const start = new Date(todayStr + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 14);

    return events
      .filter(e => {
        if (e.tipo === 'clase') return false;
        const eDate = new Date(e.fecha_inicio);
        return eDate >= start && eDate <= end;
      })
      .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())
      .slice(0, 6);
  }, [events, todayStr]);

  // Filtered Events for Calendar
  const filteredEvents = useMemo(() => {
    if (teacherFilter === 'todos') return events;
    const profId = Number(teacherFilter);
    return events.filter(e => e.tipo !== 'clase' || e.profesor_id === profId);
  }, [events, teacherFilter]);

  // Handle Manual Attendance Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUser || !manualDate || !manualTime) return;
    registrarAsistenciaManual(Number(manualUser), manualDate, manualTime);
    setManualUser('');
  };

  // Open Edit / Create Event Modal
  const openEditModal = (event: Evento) => {
    setSelectedEvent(event);
    setEventForm({
      titulo: event.titulo,
      tipo: event.tipo,
      profesor_id: event.profesor_id ? String(event.profesor_id) : '',
      fecha_inicio: event.fecha_inicio,
      fecha_fin: event.fecha_fin,
    });
    setModalOpen(true);
  };

  const openNewEventModal = () => {
    setSelectedEvent(null);
    setEventForm({
      titulo: '',
      tipo: 'clase',
      profesor_id: users.find(u => u.rol === 'personal')?.id ? String(users.find(u => u.rol === 'personal')?.id) : '',
      fecha_inicio: `${todayStr}T08:00`,
      fecha_fin: `${todayStr}T09:30`,
    });
    setModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const profId = eventForm.tipo === 'clase' && eventForm.profesor_id ? Number(eventForm.profesor_id) : null;

    if (selectedEvent) {
      editarEvento(selectedEvent.id, {
        titulo: eventForm.titulo,
        tipo: eventForm.tipo,
        profesor_id: profId,
        fecha_inicio: eventForm.fecha_inicio,
        fecha_fin: eventForm.fecha_fin,
      });
    } else {
      crearEvento({
        titulo: eventForm.titulo,
        tipo: eventForm.tipo,
        profesor_id: profId,
        fecha_inicio: eventForm.fecha_inicio,
        fecha_fin: eventForm.fecha_fin,
      });
    }
    setModalOpen(false);
  };

  // Days for current week in calendar
  const weekDays = useMemo(() => {
    const base = new Date(todayStr + 'T12:00:00');
    // adjust to Monday of current week
    const day = (base.getDay() + 6) % 7;
    const monday = new Date(base);
    monday.setDate(base.getDate() - day + currentWeekOffset * 7);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      days.push({
        date: d,
        iso,
        name: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][i],
        shortName: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i],
        isToday: iso === todayStr,
      });
    }
    return days;
  }, [todayStr, currentWeekOffset]);

  const timeSlots = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            Consola Ejecutiva del Directivo
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Vista rápida del estado escolar, asistencia y justificaciones de la jornada institucional
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('qr_station')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            Desplegar QR de Entrada
          </button>
          <button
            onClick={() => onNavigate('reporte')}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            Ver Libro de Asistencia
          </button>
          <button
            onClick={() => onNavigate('solicitudes')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Inbox className="w-4 h-4" />
            Justificaciones & Permisos
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Today */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Registros del día
            </span>
            <span className="text-3xl font-extrabold text-slate-800">{registrosHoy.length}</span>
            <p className="text-[11px] text-slate-500 mt-2">
              Marcaciones en 15/10/2026
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* On Time */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              A tiempo
            </span>
            <span className="text-3xl font-extrabold text-emerald-600">{aTiempo.length}</span>
            <p className="text-[11px] text-slate-500 mt-2">
              Personal con ingreso puntual
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Late */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Con retraso
            </span>
            <span className="text-3xl font-extrabold text-amber-500">{conRetraso.length}</span>
            <p className="text-[11px] text-slate-500 mt-2">
              Ingresos fuera del horario oficial
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Justifications */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Justificaciones
            </span>
            <span className="text-3xl font-extrabold text-indigo-600">{solicitudesPendientes.length}</span>
            <p className="text-[11px] text-slate-500 mt-2">
              Solicitudes pendientes por revisar
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileHeart className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (Quick Management) & Right Column (Visual Calendar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Management Cards (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Card: Gestión de Justificaciones */}
          <div className="bg-white rounded-2xl border-l-4 border-l-amber-500 border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-amber-50/80 border-b border-amber-100 flex items-center justify-between">
              <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                <FileHeart className="w-4 h-4 text-amber-600" />
                Gestión de Justificaciones
              </span>
              <span className="text-[11px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                {solicitudesPendientes.length}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {solicitudesPendientes.length > 0 ? (
                solicitudesPendientes.map(solicitud => {
                  const user = users.find(u => u.id === solicitud.usuario_id);
                  return (
                    <div key={solicitud.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <div className="font-bold text-slate-800">
                        {user ? `${user.apellido}, ${user.nombre}` : `Usuario #${solicitud.usuario_id}`}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5 capitalize">
                        Motivo: {solicitud.motivo || 'Sin motivo registrado'}
                      </div>
                      {solicitud.observaciones && (
                        <div className="text-slate-600 text-[11px] italic mt-1 bg-white p-2 rounded border border-slate-100">
                          "{solicitud.observaciones}"
                        </div>
                      )}
                      <div className="flex gap-2 mt-2.5">
                        <button
                          onClick={() => aprobarInasistencia(solicitud.id)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => rechazarInasistencia(solicitud.id)}
                          className="flex-1 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 font-bold rounded-lg text-[11px] transition cursor-pointer"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  No hay solicitudes pendientes.
                </div>
              )}

              <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 flex items-center justify-between">
                <span>{inasistenciasAprobadas.length} aprobadas hoy</span>
                <span>{inasistenciasRechazadas.length} rechazadas hoy</span>
              </div>
            </div>
          </div>

          {/* Card: Permisos Pendientes */}
          <div className="bg-white rounded-2xl border-l-4 border-l-blue-500 border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between">
              <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-blue-600" />
                Permisos Pendientes
              </span>
              <span className="text-[11px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                {permisosPendientes.length}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {permisosPendientes.length > 0 ? (
                permisosPendientes.map(permiso => {
                  const user = users.find(u => u.id === permiso.usuario_id);
                  return (
                    <div key={permiso.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <div className="font-bold text-slate-800">
                        {user ? `${user.apellido}, ${user.nombre}` : `Usuario #${permiso.usuario_id}`}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        {permiso.fecha_inicio} al {permiso.fecha_fin} · <span className="font-semibold capitalize">{permiso.motivo}</span>
                      </div>
                      {permiso.observaciones && (
                        <div className="text-[11px] text-slate-500 mt-1 italic">
                          "{permiso.observaciones}"
                        </div>
                      )}
                      <div className="flex gap-2 mt-2.5">
                        <button
                          onClick={() => resolverPermiso(permiso.id, 'aprobar')}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => resolverPermiso(permiso.id, 'rechazar')}
                          className="flex-1 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 font-bold rounded-lg text-[11px] transition cursor-pointer"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">
                  No hay permisos pendientes.
                </div>
              )}
            </div>
          </div>

          {/* Card: Registro Manual */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-amber-400" />
                Registro Manual de Asistencia
              </span>
            </div>
            <form onSubmit={handleManualSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Funcionario</label>
                <select
                  value={manualUser}
                  onChange={e => setManualUser(e.target.value)}
                  required
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="">Seleccione personal...</option>
                  {users.filter(u => u.rol !== 'directivo').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.apellido}, {u.nombre} ({u.rol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={e => setManualDate(e.target.value)}
                    required
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Hora</label>
                  <input
                    type="time"
                    value={manualTime}
                    onChange={e => setManualTime(e.target.value)}
                    required
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition cursor-pointer mt-2"
              >
                Guardar Asistencia Manual
              </button>
            </form>
          </div>

          {/* Card: Cumpleaños Hoy */}
          <div className="bg-white rounded-2xl border-l-4 border-l-amber-400 border border-slate-100 shadow-sm p-4">
            <h3 className="font-bold text-xs text-amber-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Cake className="w-4 h-4 text-amber-500" />
              Cumpleaños Hoy
            </h3>
            {cumpleaneros.length > 0 ? (
              <div className="space-y-1.5">
                {cumpleaneros.map(c => (
                  <div key={c.id} className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🎉</span> {c.nombre} {c.apellido}
                    <span className="text-[10px] text-slate-400 font-normal">({c.departamento || c.rol})</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400">Sin cumpleaños hoy.</div>
            )}
          </div>

          {/* Card: Próximas Actividades */}
          <div className="bg-white rounded-2xl border-l-4 border-l-indigo-400 border border-slate-100 shadow-sm p-4">
            <h3 className="font-bold text-xs text-indigo-950 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Próximas Actividades Institucionales
            </h3>
            {proximasActividades.length > 0 ? (
              <div className="space-y-2">
                {proximasActividades.map(act => (
                  <div key={act.id} className="text-xs border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                    <div className="font-bold text-slate-800 flex items-center gap-1">
                      <span className="text-indigo-600 font-mono text-[11px]">
                        {new Date(act.fecha_inicio).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                      </span>
                      <span>·</span>
                      <span>{act.titulo}</span>
                    </div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">
                      {act.tipo}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400">Sin actividades próximas.</div>
            )}
          </div>

        </div>

        {/* Right Column: Visor de Actividades / Interactive Calendar (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          
          {/* Calendar Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-700" />
                Visor de Actividades & Agenda
              </h2>
              <p className="text-xs text-slate-400">
                Visualice cátedras, feriados y consejos institucionales
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Teacher Filter */}
              <div className="relative">
                <select
                  value={teacherFilter}
                  onChange={e => setTeacherFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700 focus:outline-none"
                >
                  <option value="todos">Visualizar Agenda Completa</option>
                  {users.filter(u => u.rol === 'personal').map(p => (
                    <option key={p.id} value={p.id}>
                      {p.apellido}, {p.nombre} (Docente)
                    </option>
                  ))}
                </select>
              </div>

              {/* Add event button */}
              <button
                onClick={openNewEventModal}
                className="px-3 py-1.5 bg-[#0C5528] hover:bg-[#072e19] text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agendar
              </button>
            </div>
          </div>

          {/* Navigation & View switcher */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentWeekOffset(0)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Hoy
              </button>
              <button
                onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                title="Semana siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs font-bold text-slate-700">
              Semana del {weekDays[0].name} {weekDays[0].date.getDate()}/{weekDays[0].date.getMonth() + 1} al {weekDays[4].name} {weekDays[4].date.getDate()}/{weekDays[4].date.getMonth() + 1}
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Clase
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Institucional
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Feriado
              </span>
            </div>
          </div>

          {/* Weekly Interactive Matrix Calendar */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto bg-slate-50">
            <div className="min-w-[650px]">
              {/* Header Days */}
              <div className="grid grid-cols-6 border-b border-slate-200 bg-white">
                <div className="p-2.5 text-center text-[11px] font-bold text-slate-400 border-r border-slate-200">
                  HORA
                </div>
                {weekDays.slice(0, 5).map(day => (
                  <div
                    key={day.iso}
                    className={`p-2.5 text-center border-r border-slate-200 last:border-0 ${
                      day.isToday ? 'bg-emerald-50/80 font-extrabold text-emerald-800' : 'text-slate-700'
                    }`}
                  >
                    <div className="text-xs uppercase">{day.name}</div>
                    <div className={`text-[11px] ${day.isToday ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      {day.date.getDate()} oct
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Slots & Events */}
              <div className="divide-y divide-slate-200 bg-white">
                {timeSlots.map(time => (
                  <div key={time} className="grid grid-cols-6 min-h-[56px]">
                    {/* Hour Column */}
                    <div className="p-2 text-center text-xs font-mono text-slate-400 bg-slate-50/50 border-r border-slate-200 flex items-center justify-center">
                      {time}
                    </div>

                    {/* Day Cells */}
                    {weekDays.slice(0, 5).map(day => {
                      const eventsInSlot = filteredEvents.filter(e => {
                        const start = e.fecha_inicio;
                        return start.startsWith(day.iso) && start.includes(time.substring(0, 2));
                      });

                      return (
                        <div
                          key={day.iso}
                          className="p-1 border-r border-slate-200 last:border-0 relative hover:bg-slate-50/80 transition"
                        >
                          {eventsInSlot.map(ev => {
                            const isClass = ev.tipo === 'clase';
                            const isFeriado = ev.tipo === 'feriado';
                            const teacher = ev.profesor_id ? users.find(u => u.id === ev.profesor_id) : null;

                            return (
                              <button
                                key={ev.id}
                                onClick={() => openEditModal(ev)}
                                className={`w-full text-left p-1.5 rounded-lg mb-1 shadow-sm transition text-xs font-semibold cursor-pointer ${
                                  isClass
                                    ? 'bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200'
                                    : isFeriado
                                    ? 'bg-red-100 text-red-900 border border-red-200 hover:bg-red-200'
                                    : 'bg-amber-100 text-amber-900 border border-amber-200 hover:bg-amber-200'
                                }`}
                              >
                                <div className="truncate font-bold">{ev.titulo}</div>
                                {teacher && (
                                  <div className="text-[10px] text-blue-800/80 truncate">
                                    Prof. {teacher.apellido}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Modal: Crear / Editar Evento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-[#0C5528] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-300" />
                {selectedEvent ? 'Reajustar Actividad' : 'Agendar Nueva Actividad'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-white/80 hover:text-white text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Título de la Actividad</label>
                <input
                  type="text"
                  value={eventForm.titulo}
                  onChange={e => setEventForm(prev => ({ ...prev, titulo: e.target.value }))}
                  required
                  placeholder="Ej: Física de 5to Año, Consejo Docente"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C5528]/20 focus:border-[#0C5528]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Naturaleza</label>
                <select
                  value={eventForm.tipo}
                  onChange={e => setEventForm(prev => ({ ...prev, tipo: e.target.value as any }))}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="clase">Clase Ordinaria Académica</option>
                  <option value="feriado">Feriado Obligatorio</option>
                  <option value="institucional">Reunión de Personal / Evento</option>
                </select>
              </div>

              {eventForm.tipo === 'clase' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Docente Responsable</label>
                  <select
                    value={eventForm.profesor_id}
                    onChange={e => setEventForm(prev => ({ ...prev, profesor_id: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="">Seleccione docente...</option>
                    {users.filter(u => u.rol === 'personal').map(p => (
                      <option key={p.id} value={p.id}>
                        {p.apellido}, {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Inicio</label>
                  <input
                    type="datetime-local"
                    value={eventForm.fecha_inicio}
                    onChange={e => setEventForm(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                    required
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Cierre</label>
                  <input
                    type="datetime-local"
                    value={eventForm.fecha_fin}
                    onChange={e => setEventForm(prev => ({ ...prev, fecha_fin: e.target.value }))}
                    required
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-2">
                {selectedEvent ? (
                  <button
                    type="button"
                    onClick={() => {
                      eliminarEvento(selectedEvent.id);
                      setModalOpen(false);
                    }}
                    className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                ) : <span />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-[#0C5528] hover:bg-[#072e19] text-white rounded-xl shadow-md transition cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
