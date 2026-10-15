import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1.5 text-xs font-bold shadow-md transition cursor-pointer"
        title="Instalar App en el dispositivo para portería y uso sin conexión"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-1.5 text-xs font-bold transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-300" />
          <span>Instalar en iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                  Instalar en iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 text-xs text-slate-600 space-y-2 leading-relaxed">
                <p>
                  1. Toca el botón <strong>Compartir</strong> (ícono con flecha hacia arriba) en la barra inferior de Safari.
                </p>
                <p>
                  2. Desliza hacia abajo y selecciona <strong>"Agregar a Inicio"</strong>.
                </p>
                <p className="text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  La app quedará disponible en tu pantalla de inicio como una aplicación nativa para portería sin conexión.
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback button for devices/browsers where prompt is available
  return (
    <button
      onClick={() => {
        alert('Para instalar en esta computadora o teléfono, use la opción del navegador "Instalar aplicación" o "Agregar a pantalla de inicio".');
      }}
      className="hidden sm:flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-1.5 text-xs font-bold transition cursor-pointer"
      title="Instalar App de Portería"
    >
      <Download className="w-3.5 h-3.5 text-amber-300" />
      <span>Instalar PWA</span>
    </button>
  );
};
