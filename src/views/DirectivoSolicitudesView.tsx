import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Inbox,
  ArrowLeft,
  FileHeart,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Paperclip,
  Clock,
  Filter
} from 'lucide-react';

interface DirectivoSolicitudesViewProps {
  onNavigate: (view: string) => void;
}

export const DirectivoSolicitudesView: React.FC<DirectivoSolicitudesViewProps> = ({ onNavigate }) => {
  const {
    attendances,
    permissions,
    users,
    aprobarInasistencia,
    rechazarInasistencia,
    resolverPermiso,
  } = useApp();

  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'justificaciones' | 'permisos'>('todos');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos');

  // Filter Justificaciones (Inasistencias)
  const justificaciones = useMemo(() => {
    return attendances.filter(a => {
      const isJust = [
        'Inasistencia Reportada',
        'Inasistencia Aprobada',
        'Inasistencia Rechazada',
        'Ausente',
      ].includes(a.estado);

      if (!isJust) return false;

      if (estadoFiltro === 'Pendiente' || estadoFiltro === 'Inasistencia Reportada') {
        return a.estado === 'Inasistencia Reportada';
      }
      if (estadoFiltro === 'Aprobado') {
        return a.estado === 'Inasistencia Aprobada';
      }
      if (estadoFiltro === 'Rechazado') {
        return a.estado === 'Inasistencia Rechazada';
      }
      return true;
    });
  }, [attendances, estadoFiltro]);

  // Filter Permisos
  const permisosFiltrados = useMemo(() => {
    return permissions.filter(p => {
      if (estadoFiltro === 'Pendiente' || estadoFiltro === 'Inasistencia Reportada') {
        return p.estado === 'Pendiente';
      }
      if (estadoFiltro === 'Aprobado') {
        return p.estado === 'Aprobado';
      }
      if (estadoFiltro === 'Rechazado') {
        return p.estado === 'Rechazado';
      }
      return true;
    });
  }, [permissions, estadoFiltro]);

  return (
    <div className="space-y-6">
      {/* Title & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Inbox className="w-6 h-6 text-amber-600" />
            Justificaciones y Permisos
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Consulta, revisa y resuelve formalmente las solicitudes del personal
          </p>
        </div>

        <button
          onClick={() => onNavigate('director')}
          className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Resumen Directivo
        </button>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-end">
        <div className="w-full sm:w-1/2">
          <label className="block text-xs font-bold text-slate-500 mb-1">Mostrar</label>
          <select
            value={tipoFiltro}
            onChange={e => setTipoFiltro(e.target.value as any)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
          >
            <option value="todos">Justificaciones y permisos</option>
            <option value="justificaciones">Solo justificaciones de inasistencia</option>
            <option value="permisos">Solo permisos del personal</option>
          </select>
        </div>

        <div className="w-full sm:w-1/2">
          <label className="block text-xs font-bold text-slate-500 mb-1">Estado</label>
          <select
            value={estadoFiltro}
            onChange={e => setEstadoFiltro(e.target.value)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
          >
            <option value="todos">Todos los estados</option>
            <option value="Pendiente">Pendientes de revisión</option>
            <option value="Aprobado">Aprobados</option>
            <option value="Rechazado">Rechazados</option>
          </select>
        </div>
      </div>

      {/* Section 1: Justificaciones de Inasistencia */}
      {(tipoFiltro === 'todos' || tipoFiltro === 'justificaciones') && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
              <FileHeart className="w-4 h-4 text-amber-600" />
              Justificaciones de Inasistencia
            </h2>
            <span className="text-xs bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
              {justificaciones.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase text-[11px]">
                  <th className="py-3 px-4">Persona</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Motivo & Observaciones</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {justificaciones.length > 0 ? (
                  justificaciones.map(item => {
                    const user = users.find(u => u.id === item.usuario_id);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 block font-bold">
                            {user ? `${user.apellido}, ${user.nombre}` : `Usuario #${item.usuario_id}`}
                          </strong>
                          <span className="text-[11px] text-slate-400 font-mono">{user?.correo}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                          {item.fecha}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 capitalize">{item.motivo || 'Sin motivo'}</div>
                          {item.observaciones && (
                            <div className="text-[11px] text-slate-500 italic mt-0.5">
                              {item.observaciones}
                            </div>
                          )}
                          {item.archivo_adjunto && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Paperclip className="w-3 h-3" /> {item.archivo_adjunto}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {item.estado === 'Inasistencia Reportada' ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Pendiente
                            </span>
                          ) : item.estado === 'Inasistencia Aprobada' ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Aprobada
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                              Rechazada
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {item.estado === 'Inasistencia Reportada' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => aprobarInasistencia(item.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-sm"
                                title="Aprobar justificación"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
                              </button>
                              <button
                                onClick={() => rechazarInasistencia(item.id)}
                                className="px-2.5 py-1 border border-red-300 text-red-600 hover:bg-red-50 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                                title="Rechazar justificación"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Rechazar
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Resuelto</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No hay justificaciones para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Permisos del Personal */}
      {(tipoFiltro === 'todos' || tipoFiltro === 'permisos') && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-blue-950 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-blue-600" />
              Permisos Solicitados por el Personal
            </h2>
            <span className="text-xs bg-blue-200 text-blue-900 px-2.5 py-0.5 rounded-full font-bold">
              {permisosFiltrados.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase text-[11px]">
                  <th className="py-3 px-4">Persona</th>
                  <th className="py-3 px-4">Período de Ausencia</th>
                  <th className="py-3 px-4">Motivo & Observaciones</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permisosFiltrados.length > 0 ? (
                  permisosFiltrados.map(permiso => {
                    const user = users.find(u => u.id === permiso.usuario_id);
                    return (
                      <tr key={permiso.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 block font-bold">
                            {user ? `${user.apellido}, ${user.nombre}` : `Usuario #${permiso.usuario_id}`}
                          </strong>
                          <span className="text-[11px] text-slate-400 font-mono">{user?.correo}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                          {permiso.fecha_inicio} al {permiso.fecha_fin}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 capitalize">{permiso.motivo}</div>
                          {permiso.observaciones && (
                            <div className="text-[11px] text-slate-500 italic mt-0.5">
                              {permiso.observaciones}
                            </div>
                          )}
                          {permiso.archivo_adjunto && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              <Paperclip className="w-3 h-3" /> {permiso.archivo_adjunto}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {permiso.estado === 'Pendiente' ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Pendiente
                            </span>
                          ) : permiso.estado === 'Aprobado' ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Aprobado
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                              Rechazado
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {permiso.estado === 'Pendiente' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => resolverPermiso(permiso.id, 'aprobar')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-sm"
                                title="Aprobar permiso"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
                              </button>
                              <button
                                onClick={() => resolverPermiso(permiso.id, 'rechazar')}
                                className="px-2.5 py-1 border border-red-300 text-red-600 hover:bg-red-50 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                                title="Rechazar permiso"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Rechazar
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Resuelto</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No hay permisos solicitados para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
