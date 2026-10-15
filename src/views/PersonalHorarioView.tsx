import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  CalendarRange,
  GraduationCap,
  Clock,
  BookOpen,
  Layers,
  MapPin
} from 'lucide-react';

export const PersonalHorarioView: React.FC = () => {
  const { currentUser, assignments, templates, classes } = useApp();
  const user = currentUser;
  const userId = user?.id || 2;

  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // User's active assigned templates
  const userAssignments = useMemo(() => {
    return assignments.filter(a => a.usuario_id === userId);
  }, [assignments, userId]);

  // User's classes grouped by course
  const classesByCourse = useMemo(() => {
    const userClasses = classes.filter(c => c.usuario_id === userId);
    const groups: { [curso: string]: typeof userClasses } = {};

    userClasses.forEach(c => {
      const course = c.curso?.trim() || 'Sin curso asignado';
      if (!groups[course]) groups[course] = [];
      groups[course].push(c);
    });

    // sort classes inside each course by day and hour
    Object.keys(groups).forEach(course => {
      groups[course].sort((a, b) => {
        if (a.dia_semana !== b.dia_semana) return a.dia_semana - b.dia_semana;
        return a.hora_inicio.localeCompare(b.hora_inicio);
      });
    });

    return groups;
  }, [classes, userId]);

  const courseNames = Object.keys(classesByCourse);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <CalendarRange className="w-6 h-6 text-[#0C5528]" />
          Mis Clases y Horario Escolar
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Prof. {user?.nombre} {user?.apellido} · {user?.departamento || 'Docente'}
        </p>
      </div>

      {/* Section 1: Assigned Plantillas */}
      <div className="space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-700" />
          Plantilla de Jornada Asignada
        </h2>

        {userAssignments.length > 0 ? (
          userAssignments.map(asig => {
            const template = templates.find(t => t.id === asig.plantilla_id);
            if (!template) return null;

            return (
              <div key={asig.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">{template.nombre}</h3>
                    <p className="text-xs text-slate-400">
                      Vigente desde {asig.fecha_inicio} {asig.fecha_fin ? `hasta ${asig.fecha_fin}` : '(Indefinido)'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Oficial
                  </span>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                        <th className="py-2 px-3">Día</th>
                        <th className="py-2 px-3">Hora Entrada</th>
                        <th className="py-2 px-3">Hora Salida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {template.detalles.map(d => (
                        <tr key={d.dia_semana} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {dayNames[d.dia_semana]}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">{d.hora_entrada}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{d.hora_salida}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Su jornada activa configurada corresponde a: <strong>{user?.hora_entrada || '07:00'} - {user?.hora_salida || '13:00'}</strong> (Lunes a Viernes).
            </span>
          </div>
        )}
      </div>

      {/* Section 2: Mis Horarios Por Grado */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              Mis Horarios por Grado y Cátedra
            </h2>
            <p className="text-xs text-slate-400">
              Cada curso aparece separado para facilitar la consulta pedagógica
            </p>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
            {courseNames.length} grado(s)
          </span>
        </div>

        {courseNames.length > 0 ? (
          courseNames.map(course => {
            const courseClasses = classesByCourse[course];
            return (
              <div key={course} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-amber-500" />
                    {course}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {courseClasses.length} clase(s) programada(s)
                  </span>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100">
                        <th className="py-2.5 px-3">Día</th>
                        <th className="py-2.5 px-3">Materia / Asignación</th>
                        <th className="py-2.5 px-3">Horario</th>
                        <th className="py-2.5 px-3">Aula</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {courseClasses.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-semibold text-slate-700">
                            {dayNames[item.dia_semana]}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900">{item.nombre}</span>
                            {item.tipo === 'receso' && (
                              <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold border border-amber-200">
                                Receso
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                            {item.hora_inicio} - {item.hora_fin}
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {item.aula ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" /> {item.aula}
                              </span>
                            ) : (
                              'Sin aula asignada'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 bg-white rounded-3xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
            Todavía no tienes clases asignadas por grado.
          </div>
        )}
      </div>
    </div>
  );
};
