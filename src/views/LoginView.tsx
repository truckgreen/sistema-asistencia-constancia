import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, UserCheck, ArrowRight, GraduationCap, Users } from 'lucide-react';
import { INSTITUTION_CONFIG } from '../config/systemConfig';

export const LoginView: React.FC = () => {
  const { users, login } = useApp();
  const [selectedUserId, setSelectedUserId] = useState<number>(users[0]?.id || 1);

  const handleQuickLogin = (userId: number) => {
    login(userId);
  };

  const directivos = users.filter(u => u.rol === 'directivo');
  const personal = users.filter(u => u.rol !== 'directivo');

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-gradient-to-br from-[#DF5C12] via-[#ea7a21] to-[#0C5528] overflow-hidden">
      {/* Decorative Circles */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl p-6 sm:p-8 relative z-10 transition-all">
        {/* Top Header */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-[#DF5C12] flex items-center justify-center mx-auto mb-4 shadow-inner">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {INSTITUTION_CONFIG.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {INSTITUTION_CONFIG.description}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-bold text-emerald-800">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            Acceso Directo Sin Contraseñas
          </div>
        </div>

        {/* Primary Direct Access Button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => handleQuickLogin(users[0]?.id || 1)}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-[#0C5528] to-[#072e19] hover:from-[#0a4621] hover:to-[#041a0e] text-white font-bold rounded-2xl shadow-lg shadow-emerald-950/20 flex items-center justify-between transition cursor-pointer text-sm group"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold">
                <GraduationCap className="w-5 h-5 text-[#072e19]" />
              </div>
              <div>
                <div className="font-extrabold text-white leading-tight">
                  Ingresar como {users[0]?.nombre || 'Director'} {users[0]?.apellido || 'General'}
                </div>
                <div className="text-[11px] text-emerald-200/90 font-medium">
                  Perfil Directivo · Control total y reportes
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-300 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Profile Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Users className="w-3.5 h-3.5 text-slate-500" /> O selecciona tu perfil institucional
            </span>
            <span className="text-slate-400 font-normal">({users.length} miembros)</span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
            {/* Directivos */}
            {directivos.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickLogin(u.id)}
                className="w-full pt-2 first:pt-0 p-2.5 hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 rounded-xl flex items-center justify-between text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0C5528] flex items-center justify-center font-bold text-xs shrink-0">
                    {u.nombre.charAt(0)}{u.apellido.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                      {u.nombre} {u.apellido}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {u.departamento || 'Dirección'}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-[#0C5528] shrink-0">
                  Directivo
                </span>
              </button>
            ))}

            {/* Docentes y Personal */}
            {personal.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickLogin(u.id)}
                className="w-full pt-2 p-2.5 hover:bg-orange-50/70 border border-transparent hover:border-orange-200 rounded-xl flex items-center justify-between text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0">
                    {u.nombre.charAt(0)}{u.apellido.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-[#DF5C12]">
                      {u.nombre} {u.apellido}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {u.departamento || 'Personal Institucional'}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                  u.rol === 'personal'
                    ? 'bg-blue-100 text-blue-800'
                    : u.rol === 'obrero'
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {u.rol === 'personal' ? 'Docente' : u.rol}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Dropdown Alternative */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(Number(e.target.value))}
            className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.apellido}, {u.nombre} ({u.rol})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => handleQuickLogin(selectedUserId)}
            className="px-4 py-2.5 bg-[#DF5C12] hover:bg-[#c64803] text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
          >
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
};
