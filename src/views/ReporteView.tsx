import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AsistenciaDiaria } from '../types';
import {
  FileSpreadsheet,
  Filter,
  ArrowLeft,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileHeart,
  Paperclip,
  Search,
  Eye,
  Calendar,
  UserCheck
} from 'lucide-react';

interface ReporteViewProps {
  onNavigate: (view: string) => void;
  initialTipoRegistro?: string;
}

export const ReporteView: React.FC<ReporteViewProps> = ({ onNavigate, initialTipoRegistro = 'todos' }) => {
  const { attendances, users } = useApp();

  const [rolFiltro, setRolFiltro] = useState<string>('todos');
  const [usuarioIdFiltro, setUsuarioIdFiltro] = useState<string>('todos');
  const [tipoRegistro, setTipoRegistro] = useState<string>(initialTipoRegistro);
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected justification for modal
  const [selectedJustification, setSelectedJustification] = useState<AsistenciaDiaria | null>(null);

  // Filter attendances
  const filteredAttendances = useMemo(() => {
    return attendances.filter(item => {
      const user = users.find(u => u.id === item.usuario_id);
      if (!user) return false;

      // Filter by role
      if (rolFiltro !== 'todos' && user.rol !== rolFiltro) return false;

      // Filter by user
      if (usuarioIdFiltro !== 'todos' && String(item.usuario_id) !== usuarioIdFiltro) return false;

      // Filter by record type
      const isInasistencia = [
        'Ausente',
        'Inasistencia Reportada',
        'Inasistencia Aprobada',
        'Inasistencia Rechazada',
      ].includes(item.estado);

      if (tipoRegistro === 'inasistencias' && !isInasistencia) return false;
      if (tipoRegistro === 'asistencias' && isInasistencia) return false;

      // Filter by date range
      if (fechaInicio && item.fecha < fechaInicio) return false;
      if (fechaFin && item.fecha > fechaFin) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const fullName = `${user.nombre} ${user.apellido}`.toLowerCase();
        const email = user.correo.toLowerCase();
        if (!fullName.includes(term) && !email.includes(term)) return false;
      }

      return true;
    });
  }, [attendances, users, rolFiltro, usuarioIdFiltro, tipoRegistro, fechaInicio, fechaFin, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Fecha', 'Funcionario', 'Correo', 'Rol', 'Hora Registro', 'Retraso (min)', 'Estatus', 'Motivo'];
    const rows = filteredAttendances.map(item => {
      const u = users.find(usr => usr.id === item.usuario_id);
      return [
        item.fecha,
        u ? `"${u.apellido}, ${u.nombre}"` : 'Desconocido',
        u ? u.correo : '',
        u ? u.rol : '',
        item.hora_registro ? item.hora_registro.split('T')[1] || item.hora_registro : '',
        item.minutos_retraso,
        `"${item.estado}"`,
        item.motivo ? `"${item.motivo}"` : '',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Libro_Asistencia_Constancia_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'A tiempo':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> A Tiempo
          </span>
        );
      case 'Tarde':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Con Retraso
          </span>
        );
      case 'Inasistencia Reportada':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" /> Pendiente
          </span>
        );
      case 'Inasistencia Aprobada':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aprobada
          </span>
        );
      case 'Inasistencia Rechazada':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            Rechazada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
            {estado}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-[#0C5528]" />
            {tipoRegistro === 'inasistencias'
              ? 'Libro Digital de Justificaciones de Inasistencias'
              : tipoRegistro === 'asistencias'
              ? 'Libro Digital de Asistencias'
              : 'Libro Digital de Asistencia & Auditoría'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Auditoría cronológica estricta con respaldo normativo escolar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('director')}
            className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Consola Principal
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-300" /> Imprimir
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-emerald-700" /> Filtros Operativos de Búsqueda
          </span>
          <span className="text-xs text-slate-400">
            {filteredAttendances.length} registro(s) encontrado(s)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Rol */}
          <div>
            <label className="block font-bold text-slate-600 mb-1">Rol Estructural</label>
            <select
              value={rolFiltro}
              onChange={e => setRolFiltro(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="todos">Todos los Roles</option>
              <option value="personal">Docente</option>
              <option value="administrativo">Administrativo</option>
              <option value="obrero">Obrero</option>
            </select>
          </div>

          {/* Funcionario */}
          <div>
            <label className="block font-bold text-slate-600 mb-1">Funcionario</label>
            <select
              value={usuarioIdFiltro}
              onChange={e => setUsuarioIdFiltro(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="todos">Todos los Funcionarios</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.apellido}, {u.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo Registro */}
          <div>
            <label className="block font-bold text-slate-600 mb-1">Tipo de Registro</label>
            <select
              value={tipoRegistro}
              onChange={e => setTipoRegistro(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="todos">Asistencias e Inasistencias</option>
              <option value="asistencias">Solo Asistencias</option>
              <option value="inasistencias">Solo Inasistencias</option>
            </select>
          </div>

          {/* Fecha Inicio */}
          <div>
            <label className="block font-bold text-slate-600 mb-1">Desde</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label className="block font-bold text-slate-600 mb-1">Hasta</label>
            <input
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>
        </div>

        {/* Search bar */}
        <div className="relative pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 mt-0.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o correo del funcionario..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-700"
          />
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0C5528] text-white font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Fecha de Jornada</th>
                <th className="py-3.5 px-4">Funcionario / Empleado</th>
                <th className="py-3.5 px-4">Estampado de Tiempo</th>
                <th className="py-3.5 px-4 text-center">Retraso</th>
                <th className="py-3.5 px-4 text-center">Estatus Operativo</th>
                <th className="py-3.5 px-4 text-right">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAttendances.length > 0 ? (
                filteredAttendances.map(registro => {
                  const user = users.find(u => u.id === registro.usuario_id);
                  const timeFormatted = registro.hora_registro
                    ? new Date(registro.hora_registro).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                      })
                    : '--:--:--';

                  const dateParts = registro.fecha.split('-');
                  const dateFormatted = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

                  return (
                    <tr key={registro.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {dateFormatted}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {user ? `${user.apellido}, ${user.nombre}` : `Usuario #${registro.usuario_id}`}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {user?.correo} · <span className="uppercase font-semibold">{user?.rol}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600">
                        <Clock className="w-3.5 h-3.5 inline text-slate-400 mr-1" />
                        {timeFormatted}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {registro.minutos_retraso > 0 ? (
                          <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            +{registro.minutos_retraso} min
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {getStatusBadge(registro.estado)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {registro.motivo || registro.observaciones || registro.archivo_adjunto ? (
                          <button
                            onClick={() => setSelectedJustification(registro)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                            title="Ver detalles de justificación"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <FileHeart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No se encontraron registros de asistencia con los criterios seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Detalles de Justificación */}
      {selectedJustification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FileHeart className="w-4 h-4 text-amber-400" />
                Detalles de Justificación
              </h3>
              <button
                onClick={() => setSelectedJustification(null)}
                className="text-white/80 hover:text-white text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs text-slate-700">
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase">Funcionario</span>
                <span className="font-bold text-sm text-slate-900">
                  {(() => {
                    const u = users.find(usr => usr.id === selectedJustification.usuario_id);
                    return u ? `${u.apellido}, ${u.nombre} (${u.correo})` : '';
                  })()}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase">Fecha del Reporte</span>
                <span className="font-semibold">{selectedJustification.fecha}</span>
              </div>

              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase">Motivo</span>
                <span className="font-bold capitalize text-slate-800">
                  {selectedJustification.motivo || 'No especificado'}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase">Observaciones</span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-slate-600 leading-relaxed">
                  {selectedJustification.observaciones || 'Sin observaciones adicionales registradas.'}
                </div>
              </div>

              {selectedJustification.archivo_adjunto && (
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Documento Adjunto
                  </span>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                    <span className="flex items-center gap-2 text-amber-900 font-medium">
                      <Paperclip className="w-4 h-4 text-amber-600" />
                      {selectedJustification.archivo_adjunto}
                    </span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
                      Constancia Verificada
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedJustification(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
