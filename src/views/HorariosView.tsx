import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Usuario, ClaseHorario, PlantillaHorario } from '../types';
import {
  Clock,
  Calendar,
  BookOpen,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  CheckCircle2,
  Layers,
  ArrowRight,
  Sun,
  X
} from 'lucide-react';

interface HorariosViewProps {
  onNavigate: (view: string) => void;
  initialUsuarioId?: number;
}

export const HorariosView: React.FC<HorariosViewProps> = ({ initialUsuarioId }) => {
  const {
    users,
    personalSchedules,
    templates,
    assignments,
    classes,
    guardarHorarioPersonal,
    guardarClasesDocente,
    crearPlantilla,
    asignarPlantilla,
    eliminarAsignacion,
  } = useApp();

  const personalUsers = useMemo(() => users.filter(u => u.rol !== 'directivo'), [users]);
  const roles = useMemo(() => Array.from(new Set(personalUsers.map(u => u.rol).filter(Boolean))), [personalUsers]);
  const departamentos = useMemo(() => Array.from(new Set(personalUsers.map(u => u.departamento).filter(Boolean))), [personalUsers]);

  const [selectedUserId, setSelectedUserId] = useState<number>(initialUsuarioId || personalUsers[0]?.id || users[0]?.id || 1);

  const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);

  // Personal schedule state (7 days, 0..6)
  const [jornadas, setJornadas] = useState<{ [day: number]: { entrada: string; salida: string } }>(() => {
    const map: { [day: number]: { entrada: string; salida: string } } = {};
    for (let d = 0; d < 7; d++) {
      const match = personalSchedules.find(p => p.usuario_id === selectedUserId && p.dia_semana === d);
      map[d] = {
        entrada: match?.hora_entrada || (d < 5 ? '07:00' : ''),
        salida: match?.hora_salida || (d < 5 ? '13:00' : ''),
      };
    }
    return map;
  });

  // Update schedule state when selected user changes
  React.useEffect(() => {
    const map: { [day: number]: { entrada: string; salida: string } } = {};
    for (let d = 0; d < 7; d++) {
      const match = personalSchedules.find(p => p.usuario_id === selectedUserId && p.dia_semana === d);
      map[d] = {
        entrada: match?.hora_entrada || (d < 5 ? selectedUser?.hora_entrada || '07:00' : ''),
        salida: match?.hora_salida || (d < 5 ? selectedUser?.hora_salida || '13:00' : ''),
      };
    }
    setJornadas(map);

    // Classes for selected teacher
    const teacherClasses = classes.filter(c => c.usuario_id === selectedUserId);
    if (teacherClasses.length > 0) {
      setCourseName(teacherClasses[0].curso || "Segundo Grado 'A'");
      setEditableClasses(
        teacherClasses.map(c => ({
          nombre: c.nombre,
          dia_semana: c.dia_semana,
          hora_inicio: c.hora_inicio,
          hora_fin: c.hora_fin,
          aula: c.aula || '',
          tipo: c.tipo,
        }))
      );
    } else {
      setCourseName("");
      setEditableClasses([]);
    }
  }, [selectedUserId, selectedUser, personalSchedules, classes]);

  // Classes editing state
  const [courseName, setCourseName] = useState<string>("");
  const [editableClasses, setEditableClasses] = useState<
    {
      nombre: string;
      dia_semana: number;
      hora_inicio: string;
      hora_fin: string;
      aula: string;
      tipo: 'clase' | 'receso';
    }[]
  >([]);

  // Horario Escolar Modal State
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // New Template form state
  const [templateName, setTemplateName] = useState<string>('');
  const [templateDesc, setTemplateDesc] = useState<string>('');
  const [templateDays, setTemplateDays] = useState<{ [day: number]: { entrada: string; salida: string } }>({
    0: { entrada: '07:00', salida: '13:00' },
    1: { entrada: '07:00', salida: '13:00' },
    2: { entrada: '07:00', salida: '13:00' },
    3: { entrada: '07:00', salida: '13:00' },
    4: { entrada: '07:00', salida: '13:00' },
    5: { entrada: '', salida: '' },
    6: { entrada: '', salida: '' },
  });

  // Assign template form state
  const [assignTemplateId, setAssignTemplateId] = useState<number>(templates[0]?.id || 1);
  const [assignTargetType, setAssignTargetType] = useState<'rol' | 'departamento' | 'usuario'>('rol');
  const [assignRole, setAssignRole] = useState<string>(roles[0] || 'personal');
  const [assignDept, setAssignDept] = useState<string>(departamentos[0] || 'Ciencias');
  const [assignUser, setAssignUser] = useState<number>(personalUsers[0]?.id || users[0]?.id || 1);
  const [assignStart, setAssignStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assignEnd, setAssignEnd] = useState<string>('');

  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const dayShorts = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Apply quick morning preset (07:00 - 13:00 Mon-Fri)
  const applyMorningPreset = () => {
    setJornadas(prev => {
      const next = { ...prev };
      for (let i = 0; i < 5; i++) {
        next[i] = { entrada: '07:00', salida: '13:00' };
      }
      return next;
    });
  };

  const handleSavePersonalSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    const array = Object.entries(jornadas).map(([dayStr, times]) => ({
      dia_semana: Number(dayStr),
      hora_entrada: times.entrada,
      hora_salida: times.salida,
    }));
    guardarHorarioPersonal(selectedUserId, array);
  };

  const handleAddClassRow = () => {
    setEditableClasses(prev => [
      ...prev,
      { nombre: '', dia_semana: 0, hora_inicio: '07:00', hora_fin: '08:00', aula: '', tipo: 'clase' },
    ]);
  };

  const handleRemoveClassRow = (index: number) => {
    setEditableClasses(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveClasses = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    guardarClasesDocente(selectedUserId, courseName, editableClasses);
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const details = Object.entries(templateDays)
      .filter(([_, val]) => val.entrada && val.salida)
      .map(([dayStr, val]) => ({
        dia_semana: Number(dayStr),
        hora_entrada: val.entrada,
        hora_salida: val.salida,
      }));

    const res = crearPlantilla(templateName, templateDesc, details);
    if (res.ok) {
      setTemplateName('');
      setTemplateDesc('');
    }
  };

  const handleAssignTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    asignarPlantilla({
      plantilla_id: assignTemplateId,
      usuario_id: assignTargetType === 'usuario' ? assignUser : null,
      rol: assignTargetType === 'rol' ? assignRole : null,
      departamento: assignTargetType === 'departamento' ? assignDept : null,
      fecha_inicio: assignStart,
      fecha_fin: assignEnd || null,
      prioridad: assignTargetType === 'usuario' ? 30 : assignTargetType === 'departamento' ? 20 : 10,
    });
  };

  // Grouped classes for the retro printable view
  const blocksForPrint = useMemo(() => {
    const list = [...editableClasses].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    // unique blocks
    const uniqueBlocks: { start: string; end: string }[] = [];
    list.forEach(c => {
      if (!uniqueBlocks.some(b => b.start === c.hora_inicio && b.end === c.hora_fin)) {
        uniqueBlocks.push({ start: c.hora_inicio, end: c.hora_fin });
      }
    });
    return uniqueBlocks.sort((a, b) => a.start.localeCompare(b.start));
  }, [editableClasses]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <Clock className="w-6 h-6 text-[#0C5528]" />
          Gestión de Horarios & Cátedras
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Configura jornadas individuales, plantillas reutilizables y clases docentes por grado
        </p>
      </div>

      {/* Main Card: Horario Por Persona */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
        
        {/* Person Selector Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-500" />
              Horario Individual por Funcionario
            </h2>
            <p className="text-xs text-slate-400">
              Personalice la jornada semanal y materias asignadas a cada docente
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(Number(e.target.value))}
              className="text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 text-slate-800"
            >
              {personalUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.apellido}, {u.nombre} ({u.rol.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedUser ? (
          <div className="space-y-6">
            
            {/* Split row: Schedule Editor & Visual Matrix Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Form Editor (7 cols) */}
              <form onSubmit={handleSavePersonalSchedule} className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Jornada Semanal ({selectedUser.nombre} {selectedUser.apellido})
                  </span>
                  <button
                    type="button"
                    onClick={applyMorningPreset}
                    className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1"
                  >
                    <Sun className="w-3 h-3 text-amber-500" />
                    Aplicar 07:00 - 13:00 (L-V)
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-emerald-50/70 text-emerald-950 font-bold uppercase text-[11px]">
                        <th className="py-2.5 px-3">Día</th>
                        <th className="py-2.5 px-3">Hora Entrada</th>
                        <th className="py-2.5 px-3">Hora Salida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dayNames.map((name, idx) => (
                        <tr key={name} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {name}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="time"
                              value={jornadas[idx]?.entrada || ''}
                              onChange={e =>
                                setJornadas(prev => ({
                                  ...prev,
                                  [idx]: { ...prev[idx], entrada: e.target.value },
                                }))
                              }
                              className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none w-32 font-mono"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="time"
                              value={jornadas[idx]?.salida || ''}
                              onChange={e =>
                                setJornadas(prev => ({
                                  ...prev,
                                  [idx]: { ...prev[idx], salida: e.target.value },
                                }))
                              }
                              className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none w-32 font-mono"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-4 bg-[#0C5528] hover:bg-[#072e19] text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  Guardar Horario Individual
                </button>
              </form>

              {/* Right Column: Visual Preview Matrix (5 cols) */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Vista Previa Matricial
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {selectedUser.nombre} {selectedUser.apellido}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    Jornada Activa
                  </span>
                </div>

                {/* Grid Hour x Days Matrix */}
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs">
                  <div className="grid grid-cols-8 gap-1 text-center">
                    <div className="h-6"></div>
                    {dayShorts.map(d => (
                      <div key={d} className="h-6 bg-[#0C5528] text-white text-[10px] font-bold flex items-center justify-center rounded">
                        {d}
                      </div>
                    ))}

                    {[7, 8, 9, 10, 11, 12, 13, 14, 15].map(hour => {
                      const hourStr = `${String(hour).padStart(2, '0')}:00`;
                      return (
                        <React.Fragment key={hour}>
                          <div className="h-5 text-[10px] text-slate-400 font-mono flex items-center justify-center bg-slate-50 rounded">
                            {hourStr}
                          </div>
                          {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                            const entry = jornadas[dayIndex]?.entrada;
                            const exit = jornadas[dayIndex]?.salida;
                            const active = entry && exit && entry <= hourStr && exit > hourStr;
                            return (
                              <div
                                key={dayIndex}
                                className={`h-5 rounded border transition-colors ${
                                  active
                                    ? 'bg-[#DF5C12] border-[#DF5C12]'
                                    : 'bg-white border-slate-100'
                                }`}
                              />
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-tight">
                  Las celdas coloreadas en naranja representan los bloques horarios cubiertos por el docente en la semana.
                </p>
              </div>

            </div>

            {/* Classes Section: Clases Asignadas al Docente */}
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-700" />
                    Cátedras y Clases Asignadas al Docente
                  </h3>
                  <p className="text-xs text-slate-400">
                    Defina las materias, horas, aulas y recreos correspondientes
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddClassRow}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-700" /> Agregar Clase
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-300" /> Generar Horario Escolar
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveClasses} className="space-y-4">
                <div className="max-w-xs">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Curso / Grado del Horario
                  </label>
                  <input
                    type="text"
                    value={courseName}
                    onChange={e => setCourseName(e.target.value)}
                    required
                    placeholder="Ej. Segundo Grado 'A'"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-semibold text-slate-800"
                  />
                </div>

                {/* Class Rows */}
                <div className="space-y-2">
                  {editableClasses.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl items-end text-xs"
                    >
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Día</label>
                        <select
                          value={item.dia_semana}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setEditableClasses(prev =>
                              prev.map((c, i) => (i === idx ? { ...c, dia_semana: val } : c))
                            );
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:outline-none"
                        >
                          {dayNames.map((n, i) => (
                            <option key={n} value={i}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Materia / Cátedra</label>
                        <input
                          type="text"
                          value={item.nombre}
                          onChange={e => {
                            const val = e.target.value;
                            setEditableClasses(prev =>
                              prev.map((c, i) => (i === idx ? { ...c, nombre: val } : c))
                            );
                          }}
                          placeholder="Ej. Matemática"
                          required
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Entrada</label>
                        <input
                          type="time"
                          value={item.hora_inicio}
                          onChange={e => {
                            const val = e.target.value;
                            setEditableClasses(prev =>
                              prev.map((c, i) => (i === idx ? { ...c, hora_inicio: val } : c))
                            );
                          }}
                          required
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:outline-none font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Salida</label>
                        <input
                          type="time"
                          value={item.hora_fin}
                          onChange={e => {
                            const val = e.target.value;
                            setEditableClasses(prev =>
                              prev.map((c, i) => (i === idx ? { ...c, hora_fin: val } : c))
                            );
                          }}
                          required
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:outline-none font-mono"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Aula</label>
                        <input
                          type="text"
                          value={item.aula}
                          onChange={e => {
                            const val = e.target.value;
                            setEditableClasses(prev =>
                              prev.map((c, i) => (i === idx ? { ...c, aula: val } : c))
                            );
                          }}
                          placeholder="Aula 4"
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Tipo</label>
                        <select
                          value={item.tipo}
                          onChange={e => {
                            const val = e.target.value as any;
                            setEditableClasses(prev =>
                              prev.map((c, i) => (i === idx ? { ...c, tipo: val } : c))
                            );
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:outline-none"
                        >
                          <option value="clase">Clase</option>
                          <option value="receso">Receso</option>
                        </select>
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveClassRow(idx)}
                          className="p-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                          title="Quitar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Asignar Clases al Docente
                </button>
              </form>
            </div>

          </div>
        ) : null}

      </div>

      {/* Templates & Assignments Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Nueva Plantilla Form (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              Nueva Plantilla de Horario
            </h2>
            <p className="text-xs text-slate-400">
              Crea una plantilla semanal reutilizable para varios cargos
            </p>
          </div>

          <form onSubmit={handleCreateTemplate} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">Nombre de la Plantilla</label>
              <input
                type="text"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="Ej. Jornada Turno Mañana"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Descripción</label>
              <input
                type="text"
                value={templateDesc}
                onChange={e => setTemplateDesc(e.target.value)}
                placeholder="Descripción institucional opcional"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="block font-bold text-slate-500 uppercase text-[10px]">
                Definición por Días
              </span>
              {dayNames.map((name, idx) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="w-20 text-[11px] font-semibold text-slate-700">{name}</span>
                  <input
                    type="time"
                    value={templateDays[idx]?.entrada || ''}
                    onChange={e =>
                      setTemplateDays(prev => ({
                        ...prev,
                        [idx]: { ...prev[idx], entrada: e.target.value },
                      }))
                    }
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono w-24"
                  />
                  <input
                    type="time"
                    value={templateDays[idx]?.salida || ''}
                    onChange={e =>
                      setTemplateDays(prev => ({
                        ...prev,
                        [idx]: { ...prev[idx], salida: e.target.value },
                      }))
                    }
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono w-24"
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition cursor-pointer mt-2"
            >
              Crear Plantilla
            </button>
          </form>
        </div>

        {/* Asignar Plantilla & Asignaciones Vigentes (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Asignar Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                Asignar Plantilla de Horario
              </h2>
              <p className="text-xs text-slate-400">
                Aplica una jornada a un rol, departamento o usuario individual
              </p>
            </div>

            <form onSubmit={handleAssignTemplate} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Plantilla</label>
                  <select
                    value={assignTemplateId}
                    onChange={e => setAssignTemplateId(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Aplicar a</label>
                  <select
                    value={assignTargetType}
                    onChange={e => setAssignTargetType(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="rol">Rol Estructural</option>
                    <option value="departamento">Departamento</option>
                    <option value="usuario">Empleado Específico</option>
                  </select>
                </div>
              </div>

              {/* Target dynamic input */}
              {assignTargetType === 'rol' && (
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Rol</label>
                  <select
                    value={assignRole}
                    onChange={e => setAssignRole(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl capitalize"
                  >
                    {roles.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {assignTargetType === 'departamento' && (
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Departamento</label>
                  <select
                    value={assignDept}
                    onChange={e => setAssignDept(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {departamentos.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {assignTargetType === 'usuario' && (
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Empleado</label>
                  <select
                    value={assignUser}
                    onChange={e => setAssignUser(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {personalUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.apellido}, {u.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Vigencia Desde</label>
                  <input
                    type="date"
                    value={assignStart}
                    onChange={e => setAssignStart(e.target.value)}
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Hasta (opcional)</label>
                  <input
                    type="date"
                    value={assignEnd}
                    onChange={e => setAssignEnd(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition cursor-pointer"
              >
                Guardar Asignación
              </button>
            </form>
          </div>

          {/* Asignaciones Vigentes Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-extrabold text-sm text-slate-900 mb-3">
              Asignaciones Vigentes en el Sistema
            </h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2 px-3">Plantilla</th>
                    <th className="py-2 px-3">Destino</th>
                    <th className="py-2 px-3">Vigencia</th>
                    <th className="py-2 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.map(asig => {
                    const template = templates.find(t => t.id === asig.plantilla_id);
                    const user = asig.usuario_id ? users.find(u => u.id === asig.usuario_id) : null;
                    return (
                      <tr key={asig.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {template?.nombre || `Plantilla #${asig.plantilla_id}`}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {user
                            ? `${user.nombre} ${user.apellido}`
                            : asig.departamento
                            ? `Dpto: ${asig.departamento}`
                            : `Rol: ${asig.rol}`}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {asig.fecha_inicio} {asig.fecha_fin ? `a ${asig.fecha_fin}` : '(Indefinido)'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => eliminarAsignacion(asig.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Eliminar asignación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* Modal: Horario Escolar Imprimible (Replicating horario_escolar.html) */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-[#eef2f1] rounded-3xl shadow-2xl max-w-4xl w-full p-6 relative max-h-[95vh] overflow-y-auto">
            {/* Modal Controls */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-300">
              <span className="text-xs font-bold uppercase text-slate-600">
                Vista de Impresión Oficial - Horario Escolar
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#276475] hover:bg-[#1a4a58] text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Vintage Academic Schedule Layout */}
            <div className="school-schedule-print bg-white p-8 rounded-2xl border-4 border-dashed border-[#276475] shadow-lg text-[#173744]">
              {/* Top Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4 mb-6 border-b-2 border-slate-200 pb-4">
                <div className="text-xs font-bold uppercase text-[#246274]">
                  U.E. "La Constancia"
                  <span className="block text-amber-800 text-sm font-semibold capitalize">Sistema de Asistencia</span>
                </div>
                <div className="text-center">
                  <h1 className="text-2xl font-serif font-extrabold italic uppercase text-[#173744]">
                    Horario Escolar
                  </h1>
                  <span className="text-sm font-bold text-[#b06a23]">{courseName}</span>
                </div>
                <div className="text-right sm:text-center p-2 border-2 border-slate-600 rounded-lg text-xs">
                  Docente Titular
                  <strong className="block text-sm font-bold text-slate-900">
                    Prof. {selectedUser?.nombre} {selectedUser?.apellido}
                  </strong>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-[#75421c] text-center text-xs">
                  <thead>
                    <tr className="bg-[#f58b25] text-[#24170c] font-bold uppercase">
                      <th className="border-2 border-[#75421c] p-2.5 w-12">N°</th>
                      <th className="border-2 border-[#75421c] p-2.5 w-28">HORA</th>
                      <th className="border-2 border-[#75421c] p-2.5">LUNES</th>
                      <th className="border-2 border-[#75421c] p-2.5">MARTES</th>
                      <th className="border-2 border-[#75421c] p-2.5">MIÉRCOLES</th>
                      <th className="border-2 border-[#75421c] p-2.5">JUEVES</th>
                      <th className="border-2 border-[#75421c] p-2.5">VIERNES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Ingreso */}
                    <tr className="bg-[#ffd29f] font-bold text-sm">
                      <td colSpan={2} className="border-2 border-[#75421c] p-2">
                        Ingreso
                      </td>
                      <td colSpan={5} className="border-2 border-[#75421c] p-2">
                        {blocksForPrint[0]?.start || '07:00'}
                      </td>
                    </tr>

                    {/* Periods */}
                    {blocksForPrint.map((b, idx) => {
                      const isRecess = editableClasses.some(
                        c => c.hora_inicio === b.start && c.hora_fin === b.end && c.tipo === 'receso'
                      );

                      if (isRecess) {
                        return (
                          <tr key={idx} className="bg-[#fffca8] font-bold">
                            <td colSpan={2} className="border-2 border-[#75421c] p-2.5">
                              {b.start} - {b.end}
                            </td>
                            <td colSpan={5} className="border-2 border-[#75421c] p-2.5 tracking-widest text-[#75421c]">
                              RECREO / RECESO
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={idx} className="h-12">
                          <td className="border-2 border-[#75421c] p-2 font-bold bg-slate-50">
                            {idx + 1}°
                          </td>
                          <td className="border-2 border-[#75421c] p-2 font-mono whitespace-nowrap font-semibold">
                            {b.start} - {b.end}
                          </td>
                          {[0, 1, 2, 3, 4].map(day => {
                            const c = editableClasses.find(
                              cl => cl.dia_semana === day && cl.hora_inicio === b.start && cl.hora_fin === b.end
                            );
                            return (
                              <td key={day} className="border-2 border-[#75421c] p-2">
                                {c ? (
                                  <div>
                                    <div className="font-bold text-slate-900">{c.nombre}</div>
                                    {c.aula && (
                                      <small className="block text-[10px] text-amber-900">({c.aula})</small>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {/* Salida */}
                    <tr className="bg-[#ffd29f] font-bold text-sm">
                      <td colSpan={2} className="border-2 border-[#75421c] p-2">
                        Salida
                      </td>
                      <td colSpan={5} className="border-2 border-[#75421c] p-2">
                        {blocksForPrint[blocksForPrint.length - 1]?.end || '13:00'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Note */}
              <div className="mt-4 p-3 bg-[#ffd83d]/40 border border-[#d0a400] rounded-xl text-xs text-slate-800">
                <strong>Nota Institucional:</strong> Se exige puntualidad estricta respetando los horarios de ingreso y
                salida fijados. El personal debe registrar su llegada a través del código QR institucional en portería.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
