import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Mail, KeyRound, ArrowRight, Sparkles } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, users } = useApp();
  const [correo, setCorreo] = useState('director@institucion.edu');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const success = login(correo, password);
    if (!success) {
      setErrorMsg('Credenciales de acceso inválidas.');
    }
  };

  const handleQuickSelect = (email: string, pass: string) => {
    setCorreo(email);
    setPassword(pass);
    login(email, pass);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-gradient-to-br from-[#DF5C12] via-[#f58b25] to-[#0C5528] overflow-hidden">
      {/* Background Decorative Circles */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl p-8 relative z-10 transition-all">
        {/* Top Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-[#DF5C12] flex items-center justify-center mx-auto mb-4 shadow-inner">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            U.E. "La Constancia"
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Sistema de Control de Asistencias & Agenda del Personal
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Correo Electrónico Institucional
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                placeholder="usuario@constancia.edu"
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DF5C12]/20 focus:border-[#DF5C12] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Contraseña de Seguridad
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DF5C12]/20 focus:border-[#DF5C12] transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-[#DF5C12] to-[#c64803] hover:from-[#c64803] hover:to-[#a73b00] text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            Validar Acceso
          </button>
        </form>

        {/* Quick Test Demo Logins */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Accesos de prueba rápidos
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickSelect('director@institucion.edu', 'admin123')}
              className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-amber-900 text-left transition cursor-pointer"
            >
              <div className="font-bold">Director General</div>
              <div className="text-[10px] text-amber-700">director@institucion.edu</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect('carlos.mendoza@institucion.edu', 'password123')}
              className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-900 text-left transition cursor-pointer"
            >
              <div className="font-bold">Prof. Carlos Mendoza</div>
              <div className="text-[10px] text-emerald-700">Docente de Ciencias</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
