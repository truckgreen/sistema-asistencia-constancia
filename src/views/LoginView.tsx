import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Mail, KeyRound, ArrowRight } from 'lucide-react';
import { INSTITUTION_CONFIG } from '../config/systemConfig';

export const LoginView: React.FC = () => {
  const { login } = useApp();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!correo.trim()) {
      setErrorMsg('Por favor ingrese su correo institucional.');
      return;
    }
    const success = login(correo.trim(), password);
    if (!success) {
      setErrorMsg('Credenciales de acceso inválidas. Verifique su correo y contraseña.');
    }
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
            {INSTITUTION_CONFIG.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {INSTITUTION_CONFIG.description}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
            <span>{errorMsg}</span>
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
                placeholder="ejemplo@institucion.edu"
                required
                autoComplete="email"
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
                autoComplete="current-password"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DF5C12]/20 focus:border-[#DF5C12] transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-[#DF5C12] to-[#c64803] hover:from-[#c64803] hover:to-[#a73b00] text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            Ingresar al Sistema
          </button>
        </form>
      </div>
    </div>
  );
};
