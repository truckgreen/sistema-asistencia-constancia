import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { INSTITUTION_CONFIG } from '../config/systemConfig';
import { RolUsuario } from '../types';
import {
  GraduationCap,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  BookOpen,
  Briefcase,
  Wrench,
  Shield,
  ShieldCheck,
  Mail,
} from 'lucide-react';

const ROLE_TABS: {
  id: RolUsuario;
  label: string;
  description: string;
  placeholder: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'directivo',
    label: 'Dirección',
    description: 'Panel directivo, reportes, personal y parámetros.',
    placeholder: 'admin o admin@institucion.edu',
    icon: Shield,
  },
  {
    id: 'personal',
    label: 'Profesor',
    description: 'Asistencia diaria, horarios y solicitud de permisos.',
    placeholder: 'carlos.silva o carlos.silva@institucion.edu',
    icon: BookOpen,
  },
  {
    id: 'administrativo',
    label: 'Administrativo',
    description: 'Control de jornada administrativa y permisos.',
    placeholder: 'elena.mendoza o elena.mendoza@institucion.edu',
    icon: Briefcase,
  },
  {
    id: 'obrero',
    label: 'Obrero',
    description: 'Registro de jornada operativa y justificaciones.',
    placeholder: 'juan.perez o juan.perez@institucion.edu',
    icon: Wrench,
  },
];

export const LoginView: React.FC = () => {
  const { adminClaimed, isGoogleAuthEnabled, claimAdmin, login, loginWithGoogle } = useApp();

  // Standard Login state
  const [selectedRole, setSelectedRole] = useState<RolUsuario>('directivo');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [suggestedRole, setSuggestedRole] = useState<RolUsuario | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // First-run Director setup state (when adminClaimed === false)
  const [setupNombre, setSetupNombre] = useState('Director');
  const [setupApellido, setSetupApellido] = useState('General');
  const [setupCorreo, setSetupCorreo] = useState('admin@institucion.edu');
  const [setupPassword, setSetupPassword] = useState('');
  const [showSetupPassword, setShowSetupPassword] = useState(false);

  const [logoError, setLogoError] = useState(false);

  const activeTab = ROLE_TABS.find(t => t.id === selectedRole) || ROLE_TABS[0];

  const handleRoleChange = (role: RolUsuario) => {
    setSelectedRole(role);
    setErrorMsg(null);
    setSuggestedRole(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuggestedRole(null);
    setIsSubmitting(true);

    const result = await login(identifier, password, selectedRole);
    setIsSubmitting(false);
    if (!result.ok) {
      setErrorMsg(result.message);
      if (result.suggestedRole) {
        setSuggestedRole(result.suggestedRole);
      }
    }
  };

  const handleClaimAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    const result = await claimAdmin({
      nombre: setupNombre,
      apellido: setupApellido,
      correo: setupCorreo,
      password: setupPassword,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setErrorMsg(result.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuggestedRole(null);
    setIsSubmitting(true);
    const result = await loginWithGoogle();
    setIsSubmitting(false);
    if (!result.ok) {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8f7] flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        {/* Left Brand & Institutional Context Panel */}
        <aside className="lg:col-span-5 bg-[#0C5528] text-white p-8 sm:p-10 flex flex-col justify-between gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 overflow-hidden">
                {!logoError ? (
                  <img
                    src="/img/logo.png"
                    alt={`Escudo ${INSTITUTION_CONFIG.name}`}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                    className="w-9 h-9 object-contain"
                  />
                ) : (
                  <GraduationCap className="w-6 h-6 text-amber-300" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-white">
                  {INSTITUTION_CONFIG.name}
                </div>
                <div className="text-xs text-emerald-100/80">
                  Portal Institucional · Año Lectivo 2026
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h1
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Control de asistencias y gestión escolar
              </h1>
              <p className="text-sm text-emerald-100/85 leading-relaxed">
                {INSTITUTION_CONFIG.description}. Accede con tu usuario institucional y contraseña asignada por la Dirección.
              </p>
            </div>
          </div>

          <div className="border-t border-white/15 pt-6 space-y-3 text-xs text-emerald-100/90">
            <div className="font-semibold text-amber-300">Áreas habilitadas</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-emerald-50/90">
              <div>Dirección · Control y nómina</div>
              <div>Profesor · Clases y asistencia</div>
              <div>Administrativo · Gestión diaria</div>
              <div>Obrero · Turnos y registros</div>
            </div>
          </div>
        </aside>

        {/* Right Form Panel */}
        <section className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            {adminClaimed === false ? (
              /* First-Run Director Setup Form */
              <>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0C5528]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Configuración inicial</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Crear acceso de Dirección
                  </h2>
                  <p className="text-sm text-slate-500">
                    Define el usuario y contraseña del administrador principal para inicializar la base de datos.
                  </p>
                </div>

                <form onSubmit={handleClaimAdminSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="setup-nombre" className="block text-xs font-bold text-slate-700 mb-1">
                        Nombre
                      </label>
                      <input
                        id="setup-nombre"
                        type="text"
                        value={setupNombre}
                        onChange={e => setSetupNombre(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-[#0C5528]"
                      />
                    </div>
                    <div>
                      <label htmlFor="setup-apellido" className="block text-xs font-bold text-slate-700 mb-1">
                        Apellido
                      </label>
                      <input
                        id="setup-apellido"
                        type="text"
                        value={setupApellido}
                        onChange={e => setSetupApellido(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-[#0C5528]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="setup-correo" className="block text-xs font-bold text-slate-700 mb-1">
                      Correo de Dirección
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="setup-correo"
                        type="email"
                        value={setupCorreo}
                        onChange={e => setSetupCorreo(e.target.value)}
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-[#0C5528]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="setup-password" className="block text-xs font-bold text-slate-700 mb-1">
                      Nueva contraseña
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="setup-password"
                        type={showSetupPassword ? 'text' : 'password'}
                        value={setupPassword}
                        onChange={e => setSetupPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        minLength={4}
                        required
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-[#0C5528]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSetupPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showSetupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 bg-[#0C5528] hover:bg-[#094320] disabled:opacity-60 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{isSubmitting ? 'Guardando...' : 'Guardar y entrar como Dirección'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {isGoogleAuthEnabled && (
                  <>
                    <div className="relative flex items-center py-1">
                      <div className="flex-grow border-t border-slate-200" />
                      <span className="shrink mx-3 text-xs text-slate-400">o</span>
                      <div className="flex-grow border-t border-slate-200" />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isSubmitting}
                      className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continuar con Google</span>
                    </button>
                  </>
                )}
              </>
            ) : (
              /* Standard Credentialed Role-Separated Login Form */
              <>
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Iniciar sesión
                  </h2>
                  <p className="text-sm text-slate-500">
                    Selecciona tu rol e ingresa tus credenciales de acceso.
                  </p>
                </div>

                <div className="space-y-2">
                  <div
                    role="tablist"
                    aria-label="Tipo de personal"
                    className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80"
                  >
                    {ROLE_TABS.map(tab => {
                      const Icon = tab.icon;
                      const active = selectedRole === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => handleRoleChange(tab.id)}
                          className={`px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-white text-[#0C5528] shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#DF5C12]' : 'text-slate-400'}`} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 px-0.5">
                    {activeTab.description}
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="login-identifier" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Usuario o correo electrónico
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="login-identifier"
                        type="text"
                        autoComplete="username"
                        value={identifier}
                        onChange={e => {
                          setIdentifier(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder={activeTab.placeholder}
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0C5528] focus:ring-2 focus:ring-[#0C5528]/15 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={e => {
                          setPassword(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="Ingresa tu contraseña"
                        required
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0C5528] focus:ring-2 focus:ring-[#0C5528]/15 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <div
                      role="alert"
                      className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start justify-between gap-2"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                      </div>
                      {suggestedRole && (
                        <button
                          type="button"
                          onClick={() => handleRoleChange(suggestedRole)}
                          className="text-xs font-bold text-red-900 underline hover:no-underline whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Cambiar pestaña
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 bg-[#0C5528] hover:bg-[#094320] disabled:opacity-60 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>{isSubmitting ? 'Verificando...' : `Ingresar como ${activeTab.label}`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {isGoogleAuthEnabled && (
                  <>
                    <div className="relative flex items-center py-1">
                      <div className="flex-grow border-t border-slate-200" />
                      <span className="shrink mx-3 text-xs text-slate-400">o</span>
                      <div className="flex-grow border-t border-slate-200" />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isSubmitting}
                      className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continuar con Google</span>
                    </button>
                  </>
                )}

                <p className="text-xs text-slate-400 text-center pt-1">
                  Si olvidaste tu usuario o contraseña, solicítalos en Dirección o Administración.
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
