import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Usuario, RolUsuario } from '../types';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  X,
  Search,
  Key
} from 'lucide-react';

export const UsuariosView: React.FC = () => {
  const { users, crearUsuario, editarUsuario, eliminarUsuario } = useApp();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');

  // New User Form State
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [rol, setRol] = useState<RolUsuario>('personal');
  const [departamento, setDepartamento] = useState('');
  const [horaEntrada, setHoraEntrada] = useState('07:30');
  const [horaSalida, setHoraSalida] = useState('15:30');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editForm, setEditForm] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    rol: 'personal' as RolUsuario,
    departamento: '',
    hora_entrada: '07:30',
    hora_salida: '15:30',
  });

  const staffList = users.filter(u => u.rol !== 'directivo');

  const filteredStaff = staffList.filter(u => {
    if (roleFilter !== 'todos' && u.rol !== roleFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const full = `${u.nombre} ${u.apellido}`.toLowerCase();
      const mail = u.correo.toLowerCase();
      const dept = (u.departamento || '').toLowerCase();
      return full.includes(term) || mail.includes(term) || dept.includes(term);
    }
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !apellido.trim() || !correo.trim()) return;

    const res = crearUsuario({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      correo: correo.trim(),
      telefono: telefono.trim() || undefined,
      fecha_nacimiento: fechaNacimiento || undefined,
      rol,
      departamento: departamento.trim() || undefined,
      hora_entrada: horaEntrada,
      hora_salida: horaSalida,
      limite_permisos: 3,
    });

    if (res.ok) {
      setNombre('');
      setApellido('');
      setCorreo('');
      setTelefono('');
      setFechaNacimiento('');
      setDepartamento('');
    }
  };

  const openEditModal = (u: Usuario) => {
    setEditingUser(u);
    setEditForm({
      nombre: u.nombre,
      apellido: u.apellido,
      telefono: u.telefono || '',
      rol: u.rol,
      departamento: u.departamento || '',
      hora_entrada: u.hora_entrada || '07:30',
      hora_salida: u.hora_salida || '15:30',
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    editarUsuario(editingUser.id, {
      nombre: editForm.nombre,
      apellido: editForm.apellido,
      telefono: editForm.telefono || undefined,
      rol: editForm.rol,
      departamento: editForm.departamento || undefined,
      hora_entrada: editForm.hora_entrada,
      hora_salida: editForm.hora_salida,
    });
    setEditingUser(null);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-[#0C5528]" />
          Gestión del Talento Humano
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Registro administrativo de fichas de personal, credenciales institucionales y roles
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form: Incorporar Nuevo Funcionario (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border-l-4 border-l-emerald-600 border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              Incorporar Nuevo Funcionario
            </h2>
            <p className="text-xs text-slate-400">
              Crea la ficha y genera automáticamente credenciales de acceso
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Nombres</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Juan Carlos"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Apellidos</label>
                <input
                  type="text"
                  value={apellido}
                  onChange={e => setApellido(e.target.value)}
                  placeholder="Ej. Pérez Márquez"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                placeholder="usuario@constancia.edu"
                required
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  placeholder="0414-1234567"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={fechaNacimiento}
                  onChange={e => setFechaNacimiento(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Rol Estructural / Cargo</label>
              <select
                value={rol}
                onChange={e => setRol(e.target.value as RolUsuario)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-semibold text-slate-800"
              >
                <option value="personal">Personal Docente (Profesor)</option>
                <option value="administrativo">Personal Administrativo</option>
                <option value="obrero">Personal Obrero / Operativo</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Departamento</label>
              <input
                type="text"
                value={departamento}
                onChange={e => setDepartamento(e.target.value)}
                placeholder="Ej. Ciencias, Control de Estudios, Mantenimiento"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Hora Entrada</label>
                <input
                  type="time"
                  value={horaEntrada}
                  onChange={e => setHoraEntrada(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Hora Salida</label>
                <input
                  type="time"
                  value={horaSalida}
                  onChange={e => setHoraSalida(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 mt-3"
            >
              <Key className="w-4 h-4 text-amber-300" />
              Registrar y Generar Credenciales
            </button>
          </form>
        </div>

        {/* Table: Nómina Activa de Personal (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700" />
                Nómina Activa de Personal
              </h2>
              <span className="text-xs text-slate-400">
                {filteredStaff.length} empleado(s) registrado(s)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="todos">Todos los Roles</option>
                <option value="personal">Docentes</option>
                <option value="administrativo">Administrativos</option>
                <option value="obrero">Obreros</option>
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, correo o departamento..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                  <th className="py-2.5 px-3">Funcionario</th>
                  <th className="py-2.5 px-3">Contacto</th>
                  <th className="py-2.5 px-3">Rol & Departamento</th>
                  <th className="py-2.5 px-3">Jornada</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">
                        {p.apellido}, {p.nombre}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.correo}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-600 font-mono">{p.telefono || 'Sin teléfono'}</div>
                      {p.fecha_nacimiento && (
                        <div className="text-[10px] text-slate-400">
                          Nac: {p.fecha_nacimiento}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          p.rol === 'personal'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.rol === 'administrativo'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.rol}
                      </span>
                      {p.departamento && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{p.departamento}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {p.hora_entrada || '07:30'} - {p.hora_salida || '15:30'}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Editar funcionario"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Seguro que deseas eliminar a ${p.nombre} ${p.apellido}?`)) {
                              eliminarUsuario(p.id);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Eliminar funcionario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Editar Funcionario */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-[#0C5528] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-300" />
                Editar Funcionario
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-white/80 hover:text-white text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={editForm.nombre}
                    onChange={e => setEditForm(prev => ({ ...prev, nombre: e.target.value }))}
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Apellido</label>
                  <input
                    type="text"
                    value={editForm.apellido}
                    onChange={e => setEditForm(prev => ({ ...prev, apellido: e.target.value }))}
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={editForm.telefono}
                  onChange={e => setEditForm(prev => ({ ...prev, telefono: e.target.value }))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Rol Estructural</label>
                <select
                  value={editForm.rol}
                  onChange={e => setEditForm(prev => ({ ...prev, rol: e.target.value as any }))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="personal">Personal Docente (Profesor)</option>
                  <option value="administrativo">Personal Administrativo</option>
                  <option value="obrero">Personal Obrero / Operativo</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Departamento</label>
                <input
                  type="text"
                  value={editForm.departamento}
                  onChange={e => setEditForm(prev => ({ ...prev, departamento: e.target.value }))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Hora Entrada</label>
                  <input
                    type="time"
                    value={editForm.hora_entrada}
                    onChange={e => setEditForm(prev => ({ ...prev, hora_entrada: e.target.value }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Hora Salida</label>
                  <input
                    type="time"
                    value={editForm.hora_salida}
                    onChange={e => setEditForm(prev => ({ ...prev, hora_salida: e.target.value }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0C5528] text-white rounded-xl font-bold cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
