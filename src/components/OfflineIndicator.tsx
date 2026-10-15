import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, ShieldCheck, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-amber-600 text-white px-4 py-2.5 text-xs font-bold shadow-2xl border border-amber-400 animate-bounce">
      <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
      <WifiOff className="w-4 h-4 text-amber-200" />
      <div>
        <span>Modo Portería Offline Activo</span>
        <span className="block text-[10px] font-normal text-amber-100">
          Los escaneos QR se guardan localmente y se sincronizarán al volver la red.
        </span>
      </div>
    </div>
  );
};
