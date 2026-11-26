import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Usuario, RolUsuario } from '../types';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Search,
  Key,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

function generateReadablePassword(seed?: string): string {
  const cleanSeed = (seed || 'constancia')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 6);
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${cleanSeed || 'clave'}${digits}`;
}

export const UsuariosView: React.FC = () => {
  const {
    users,
    currentUser,
    sessionPasswords,
    crearUsuario,
    editarUsuario,
    eliminarUsuario,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');

  // New User Form State
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [rol, setRol] = useState<RolUsuario>('personal');
  const [departamento, setDepartamento] = useState('');
  const [horaEntrada, setHoraEntrada] = useState('07:30');
  const [horaSalida, setHoraSalida] = useState('15:30');

  // Visible passwords per row in table
  const [visibleRowPasswords, setVisibleRowPasswords] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Latest created/updated credential highlight banner
  const [recentCredential, setRecentCredential] = useState<{
    nombreCompleto: string;
    correo: string;
    password: string;
  } | null>(null);
  const [showRecentPass, setShowRecentPass] = useState(true);

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
    password: '',
  });
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Dedicated Change Password Modal State
  const [passwordModalUser, setPasswordModalUser] = useState<Usuario | null>(null);
  const [modalPassword, setModalPassword] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const staffList = users;

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

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(prev => (prev === id ? null : prev)), 1800);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !apellido.trim() || !correo.trim()) return;

    const cleanNombre = nombre.trim();
    const cleanApellido = apellido.trim();
    const cleanCorreo = correo.trim();

    const res = await crearUsuario({
      nombre: cleanNombre,
      apellido: cleanApellido,
      correo: cleanCorreo,
      password: newPassword.trim() || undefined,
      telefono: telefono.trim() || undefined,
      fecha_nacimiento: fechaNacimiento || undefined,
      rol,
      departamento: departamento.trim() || undefined,
      hora_entrada: horaEntrada,
      hora_salida: horaSalida,
      limite_permisos: 3,
    });

    if (res.ok) {
      if (res.password) {
        setRecentCredential({
          nombreCompleto: `${cleanNombre} ${cleanApellido}`,
          correo: cleanCorreo,
          password: res.password,
        });
        setShowRecentPass(true);
      }
      setNombre('');
      setApellido('');
      setCorreo('');
      setNewPassword('');
      setTelefono('');
      setFechaNacimiento('');
      setDepartamento('');
    }
  };

  const openEditModal = (u: Usuario) => {
    setEditingUser(u);
    setShowEditPassword(false);
    setEditForm({
      nombre: u.nombre,
      apellido: u.apellido,
      telefono: u.telefono || '',
      rol: u.rol,
      departamento: u.departamento || '',
      hora_entrada: u.hora_entrada || '07:30',
      hora_salida: u.hora_salida || '15:30',
      password: sessionPasswords[u.id] || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const updatedPass = editForm.password.trim();
    const res = await editarUsuario(editingUser.id, {
      nombre: editForm.nombre,
      apellido: editForm.apellido,
      telefono: editForm.telefono || undefined,
      rol: editForm.rol,
      departamento: editForm.departamento || undefined,
      hora_entrada: editForm.hora_entrada,
      hora_salida: editForm.hora_salida,
      ...(updatedPass ? { password: updatedPass } : {}),
    });
    if (res.ok && updatedPass) {
      setRecentCredential({
        nombreCompleto: `${editForm.nombre} ${editForm.apellido}`,
        correo: editingUser.correo,
        password: updatedPass,
      });
      setShowRecentPass(true);
    }
    setEditingUser(null);
  };

  const openPasswordModal = (u: Usuario) => {
    setPasswordModalUser(u);
    setModalPassword(sessionPasswords[u.id] || '');
    setShowModalPassword(true);
  };

  const handleSavePasswordModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || modalPassword.trim().length < 4) return;
    const cleanPass = modalPassword.trim();
    const res = await editarUsuario(passwordModalUser.id, { password: cleanPass });
    if (res.ok) {
      setRecentCredential({
        nombreCompleto: `${passwordModalUser.nombre} ${passwordModalUser.apellido}`,
        correo: passwordModalUser.correo,
        password: cleanPass,
      });
      setShowRecentPass(true);
      setVisibleRowPasswords(prev => ({ ...prev, [passwordModalUser.id]: true }));
      setPasswordModalUser(null);
    }
  };

  const getRoleBadge = (r: RolUsuario) => {
    switch (r) {
      case 'directivo':
        return { label: 'Dirección', cls: 'bg-purple-100 text-purple-800' };
      case 'personal':
        return { label: 'Profesor', cls: 'bg-emerald-100 text-emerald-800' };
      case 'administrativo':
        return { label: 'Administrativo', cls: 'bg-blue-100 text-blue-800' };
      case 'obrero':
        return { label: 'Obrero', cls: 'bg-amber-100 text-amber-800' };
    }
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
          Registro administrativo de fichas de personal, gestión de contraseñas institucionales y roles
        </p>
      </div>

      {/* Credential Confirmation Card */}
      {recentCredential && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0C5528] text-amber-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-1">
              <div className="font-extrabold text-emerald-950">
                Credencial lista para {recentCredential.nombreCompleto}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-emerald-900">
                <span>
                  Correo: <strong className="font-mono">{recentCredential.correo}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  Contraseña:{' '}
                  <strong className="font-mono bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    {showRecentPass ? recentCredential.password : '••••••••'}
                  </strong>
                  <button
                    type="button"
                    onClick={() => setShowRecentPass(v => !v)}
                    className="p-1 rounded-md hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                    title={showRecentPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showRecentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(recentCredential.password, -1)}
                    className="p-1 rounded-md hover:bg-emerald-100 text-emerald-700 cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                    title="Copiar contraseña"
                  >
                    {copiedId === -1 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === -1 ? 'Copiada' : 'Copiar'}
                  </button>
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRecentCredential(null)}
            className="self-end sm:self-center p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg cursor-pointer"
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form: Incorporar Nuevo Funcionario (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border-l-4 border-l-emerald-600 border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              Incorporar Nuevo Funcionario
            </h2>
            <p className="text-xs text-slate-400">
              Crea la ficha y define o genera su contraseña de acceso
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
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0C5528]"
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
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0C5528]"
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
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0C5528]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-600">Contraseña de Acceso</label>
                <button
                  type="button"
                  onClick={() => {
                    setNewPassword(generateReadablePassword(nombre));
                    setShowNewPassword(true);
                  }}
                  className="text-[11px] font-bold text-[#0C5528] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Generar clave
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Opcional (mín. 4 caracteres)"
                  minLength={4}
                  className="w-full p-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0C5528] font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Si la dejas vacía se asignará una automáticamente y podrás verla al guardar.
              </span>
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
                <option value="personal">Profesor / Personal Docente</option>
                <option value="administrativo">Personal Administrativo</option>
                <option value="obrero">Personal Obrero / Operativo</option>
                <option value="directivo">Dirección / Directivo</option>
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
              Registrar y Guardar Credenciales
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
                {filteredStaff.length} funcionario(s) registrado(s)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="todos">Todos los Roles</option>
                <option value="personal">Profesores</option>
                <option value="administrativo">Administrativos</option>
                <option value="obrero">Obreros</option>
                <option value="directivo">Dirección</option>
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
                  <th className="py-2.5 px-3">Rol & Depto</th>
                  <th className="py-2.5 px-3">Contraseña</th>
                  <th className="py-2.5 px-3">Jornada</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-slate-400">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span className="font-semibold text-slate-600 block">No hay personal registrado en nómina.</span>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Utilice el formulario de la izquierda para dar de alta profesores, administrativos y personal obrero.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map(p => {
                    const badge = getRoleBadge(p.rol);
                    const isVisible = Boolean(visibleRowPasswords[p.id]);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{p.apellido}, {p.nombre}</span>
                            {p.id === currentUser?.id && (
                              <span className="text-[10px] font-semibold text-[#0C5528]">· Sesión actual</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{p.correo}</div>
                          {p.telefono && (
                            <div className="text-[10px] text-slate-400 font-mono">{p.telefono}</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {p.departamento && (
                            <div className="text-[11px] text-slate-500 mt-0.5">{p.departamento}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {sessionPasswords[p.id] ? (
                            <div className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                              <span className="font-mono text-[11px] font-semibold text-slate-800">
                                {isVisible ? sessionPasswords[p.id] : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setVisibleRowPasswords(prev => ({ ...prev, [p.id]: !prev[p.id] }))
                                }
                                className="p-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                                title={isVisible ? 'Ocultar clave' : 'Ver clave'}
                              >
                                {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(sessionPasswords[p.id], p.id)}
                                className="p-0.5 text-slate-500 hover:text-emerald-700 cursor-pointer"
                                title="Copiar clave"
                              >
                                {copiedId === p.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : p.has_password ? (
                            <button
                              type="button"
                              onClick={() => openPasswordModal(p)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0C5528] border border-emerald-200 text-[11px] font-semibold transition cursor-pointer"
                              title="Cambiar contraseña"
                            >
                              <KeyRound className="w-3 h-3" />
                              Cifrada · Cambiar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openPasswordModal(p)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold transition cursor-pointer"
                              title="Asignar contraseña"
                            >
                              <KeyRound className="w-3 h-3" />
                              Poner clave
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {p.hora_entrada || '07:30'} - {p.hora_salida || '15:30'}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openPasswordModal(p)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                              title="Cambiar contraseña"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Editar funcionario"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {p.id !== currentUser?.id && (
                              confirmDeleteId === p.id ? (
                                <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-1.5 py-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      eliminarUsuario(p.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="text-[11px] font-bold text-red-700 hover:underline cursor-pointer px-1"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer px-1"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(p.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                  title="Eliminar funcionario"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Cambiar / Asignar Contraseña */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-[#0C5528] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-300" />
                Gestionar Contraseña
              </h3>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="text-white/80 hover:text-white text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePasswordModal} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="font-bold text-slate-900">
                  {passwordModalUser.nombre} {passwordModalUser.apellido}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">{passwordModalUser.correo}</div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => {
                      setModalPassword(generateReadablePassword(passwordModalUser.nombre));
                      setShowModalPassword(true);
                    }}
                    className="text-[11px] font-bold text-[#0C5528] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Generar aleatoria
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showModalPassword ? 'text' : 'password'}
                    value={modalPassword}
                    onChange={e => setModalPassword(e.target.value)}
                    placeholder="Ingrese la contraseña (mín. 4 caracteres)"
                    minLength={4}
                    required
                    className="w-full p-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:border-[#0C5528]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showModalPassword ? 'Ocultar' : 'Ver'}
                  >
                    {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0C5528] text-white rounded-xl font-bold cursor-pointer"
                >
                  Guardar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  onChange={e => setEditForm(prev => ({ ...prev, rol: e.target.value as RolUsuario }))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="personal">Profesor / Personal Docente</option>
                  <option value="administrativo">Personal Administrativo</option>
                  <option value="obrero">Personal Obrero / Operativo</option>
                  <option value="directivo">Dirección / Directivo</option>
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

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-600">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm(prev => ({
                        ...prev,
                        password: generateReadablePassword(editForm.nombre),
                      }));
                      setShowEditPassword(true);
                    }}
                    className="text-[11px] font-bold text-[#0C5528] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Generar
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editForm.password}
                    onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Asignar o cambiar contraseña"
                    minLength={4}
                    className="w-full p-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
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
