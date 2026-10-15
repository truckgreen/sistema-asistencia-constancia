import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { LoginView } from './views/LoginView';
import { DirectorDashboard } from './views/DirectorDashboard';
import { QRStationView } from './views/QRStationView';
import { ReporteView } from './views/ReporteView';
import { DirectivoSolicitudesView } from './views/DirectivoSolicitudesView';
import { HorariosView } from './views/HorariosView';
import { PlanificacionView } from './views/PlanificacionView';
import { UsuariosView } from './views/UsuariosView';
import { ConfiguracionView } from './views/ConfiguracionView';
import { PersonalDashboard } from './views/PersonalDashboard';
import { PersonalHorarioView } from './views/PersonalHorarioView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const AppContent: React.FC = () => {
  const { currentUser, activeNotification, clearNotification } = useApp();

  const [currentView, setCurrentView] = useState<string>('director');
  const [navParams, setNavParams] = useState<any>({});

  const handleNavigate = (view: string, params?: any) => {
    setCurrentView(view);
    setNavParams(params || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If not logged in, render Login
  if (!currentUser) {
    return <LoginView />;
  }

  // Choose appropriate view based on role and currentView
  const isDirectivo = currentUser.rol === 'directivo';

  const renderView = () => {
    switch (currentView) {
      case 'director':
        return isDirectivo ? <DirectorDashboard onNavigate={handleNavigate} /> : <PersonalDashboard />;
      case 'personal':
        return <PersonalDashboard />;
      case 'personal_horario':
        return <PersonalHorarioView />;
      case 'qr_station':
        return <QRStationView onNavigate={handleNavigate} />;
      case 'reporte':
        return <ReporteView onNavigate={handleNavigate} initialTipoRegistro={navParams?.tipo_registro || 'todos'} />;
      case 'solicitudes':
        return <DirectivoSolicitudesView onNavigate={handleNavigate} />;
      case 'horarios':
        return <HorariosView onNavigate={handleNavigate} initialUsuarioId={navParams?.usuario_id} />;
      case 'planificacion':
        return <PlanificacionView />;
      case 'usuarios':
        return <UsuariosView />;
      case 'configuracion':
        return <ConfiguracionView />;
      default:
        return isDirectivo ? <DirectorDashboard onNavigate={handleNavigate} /> : <PersonalDashboard />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8f7]">
      <Navbar currentView={currentView} onNavigate={handleNavigate} />

      {/* Global Toast / Notification Bar */}
      {activeNotification && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4 animate-in fade-in slide-in-from-top duration-200">
          <div
            className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm border ${
              activeNotification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : activeNotification.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : activeNotification.type === 'danger'
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {activeNotification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {activeNotification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
              {activeNotification.type === 'danger' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              {activeNotification.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
              <span>{activeNotification.message}</span>
            </div>
            <button
              onClick={clearNotification}
              className="p-1 hover:bg-black/5 rounded-lg transition cursor-pointer text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {renderView()}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-5 border-t border-slate-200 bg-white/60 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>U.E. "La Constancia"</strong> · Sistema de Control de Asistencias & Agenda Escolar
          </div>
          <div className="text-[11px] text-slate-400">
            Ambiente Institucional Oficial · Año Lectivo 2026
          </div>
        </div>
      </footer>
    </div>
  );
};
