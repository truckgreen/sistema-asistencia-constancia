import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';
import { INSTITUTION_CONFIG } from '../config/systemConfig';
import {
  GraduationCap,
  Gauge,
  CalendarDays,
  Clock,
  CalendarPlus,
  Users,
  ClipboardCheck,
  CheckCircle2,
  Inbox,
  FileHeart,
  FileSpreadsheet,
  Settings,
  UserCheck,
  CalendarRange,
  LogOut,
  ChevronDown,
  QrCode
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { currentUser, users, switchUser, logout } = useApp();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const isDirectivo = currentUser?.rol === 'directivo';

  const toggleDropdown = (name: string) => {
    setOpenDropdown(prev => (prev === name ? null : name));
  };

  const handleNav = (view: string, params?: any) => {
    onNavigate(view, params);
    setOpenDropdown(null);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0C5528]/95 backdrop-blur-md border-b border-white/15 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Institution Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNav(isDirectivo ? 'director' : 'personal')}
              className="flex items-center gap-2.5 text-left group transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6 text-[#072e19]" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight block leading-tight text-white group-hover:text-amber-300 transition-colors">
                  {INSTITUTION_CONFIG.shortName}
                </span>
                <span className="text-xs text-emerald-200/90 font-medium block">
                  {INSTITUTION_CONFIG.subName}
                </span>
              </div>
            </button>
          </div>

          {/* Navigation Links for Directivo or Personal */}
          <nav className="hidden lg:flex items-center gap-1">
            {isDirectivo ? (
              <>
                <button
                  onClick={() => handleNav('director')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    currentView === 'director'
                      ? 'bg-amber-400/20 text-amber-300 font-bold'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Gauge className="w-4 h-4 text-amber-300" />
                  Resumen
                </button>

                {/* Dropdown: Organización */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown('organizacion')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer ${
                      ['horarios', 'planificacion', 'usuarios'].includes(currentView)
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-white/90 hover:bg-white/10'
                    }`}
                  >
                    <CalendarDays className="w-4 h-4 text-emerald-300" />
                    Organización
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {openDropdown === 'organizacion' && (
                    <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl py-2 border border-slate-100 text-slate-800 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <button
                        onClick={() => handleNav('horarios')}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-sm flex items-center gap-2.5 transition text-slate-700 hover:text-emerald-800 cursor-pointer"
                      >
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="font-semibold text-xs text-slate-800">Horarios por persona</div>
                          <div className="text-[11px] text-slate-500">Jornadas, plantillas y materias</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleNav('planificacion')}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-sm flex items-center gap-2.5 transition text-slate-700 hover:text-emerald-800 cursor-pointer"
                      >
                        <CalendarPlus className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-semibold text-xs text-slate-800">Planificación</div>
                          <div className="text-[11px] text-slate-500">Agendar cátedras y actividades</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleNav('usuarios')}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-sm flex items-center gap-2.5 transition text-slate-700 hover:text-emerald-800 cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-indigo-600" />
                        <div>
                          <div className="font-semibold text-xs text-slate-800">Personal y departamentos</div>
                          <div className="text-[11px] text-slate-500">Nómina, cargos y fichas</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Dropdown: Control */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown('control')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer ${
                      ['reporte', 'solicitudes'].includes(currentView)
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-white/90 hover:bg-white/10'
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4 text-emerald-300" />
                    Control
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {openDropdown === 'control' && (
                    <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl py-2 border border-slate-100 text-slate-800 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <button
                        onClick={() => handleNav('reporte', { tipo_registro: 'asistencias' })}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-sm flex items-center gap-2.5 transition text-slate-700 hover:text-emerald-800 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="font-semibold text-xs text-slate-800">Asistencias</div>
                          <div className="text-[11px] text-slate-500">Marcaciones diarias y retrasos</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleNav('solicitudes')}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-sm flex items-center gap-2.5 transition text-slate-700 hover:text-emerald-800 cursor-pointer"
                      >
                        <Inbox className="w-4 h-4 text-amber-600" />
                        <div>
                          <div className="font-semibold text-xs text-slate-800">Justificaciones y permisos</div>
                          <div className="text-[11px] text-slate-500">Revisión y aprobación de solicitudes</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleNav('reporte', { tipo_registro: 'inasistencias' })}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-sm flex items-center gap-2.5 transition text-slate-700 hover:text-emerald-800 cursor-pointer"
                      >
                        <FileHeart className="w-4 h-4 text-amber-500" />
                        <div>
                          <div className="font-semibold text-xs text-slate-800">Libro de inasistencias</div>
                          <div className="text-[11px] text-slate-500">Histórico de ausencias reportadas</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleNav('reporte', { tipo_registro: 'todos' })}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-sm flex items-center gap-2.5 transition text-slate-700 hover:text-emerald-800 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-semibold text-xs text-slate-800">Libro completo</div>
                          <div className="text-[11px] text-slate-500">Auditoría global consolidada</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* QR Station Shortcut */}
                <button
                  onClick={() => handleNav('qr_station')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    currentView === 'qr_station'
                      ? 'bg-amber-400/20 text-amber-300 font-bold'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-amber-300" />
                  Estación QR
                </button>

                {/* Parámetros */}
                <button
                  onClick={() => handleNav('configuracion')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer ${
                    currentView === 'configuracion'
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  <Settings className="w-4 h-4 text-emerald-300" />
                  Parámetros
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleNav('personal')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                    currentView === 'personal'
                      ? 'bg-amber-400/20 text-amber-300 font-bold'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-amber-300" />
                  Mi asistencia
                </button>
                <button
                  onClick={() => handleNav('personal_horario')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                    currentView === 'personal_horario'
                      ? 'bg-amber-400/20 text-amber-300 font-bold'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  <CalendarRange className="w-4 h-4 text-emerald-300" />
                  Mis clases y horario
                </button>
              </>
            )}
          </nav>

          {/* Right section: PWA install & User profile with Quick Switcher */}
          <div className="flex items-center gap-3">
            <PWAInstallButton />
            
            {/* User Profile Badge with Quick Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('user_profile')}
                className="flex items-center gap-2.5 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl border border-white/15 transition cursor-pointer text-left"
                title="Cambiar perfil institucional"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold leading-tight text-white flex items-center gap-1">
                    {currentUser?.nombre} {currentUser?.apellido}
                    <ChevronDown className="w-3 h-3 text-emerald-200" />
                  </div>
                  <div className="text-[10px] text-emerald-200 uppercase font-semibold">
                    {currentUser?.rol} {currentUser?.departamento ? `· ${currentUser.departamento}` : ''}
                  </div>
                </div>
              </button>

              {openDropdown === 'user_profile' && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl py-2 border border-slate-100 text-slate-800 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Cambiar de Perfil (Acceso Instantáneo)
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                    {users.map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-xs flex items-center justify-between transition cursor-pointer ${
                          currentUser?.id === u.id ? 'bg-emerald-50/80 font-bold text-[#0C5528]' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-xs text-slate-800">
                            {u.nombre} {u.apellido}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {u.departamento || (u.rol === 'directivo' ? 'Dirección' : 'Personal')}
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          u.rol === 'directivo'
                            ? 'bg-emerald-100 text-[#0C5528]'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {u.rol}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 mt-1 border-t border-slate-100 px-2">
                    <button
                      onClick={() => {
                        logout();
                        setOpenDropdown(null);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 font-medium cursor-pointer transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Salir a pantalla de bienvenida
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
