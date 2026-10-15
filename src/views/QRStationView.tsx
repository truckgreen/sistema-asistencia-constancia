import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  QrCode,
  ArrowLeft,
  Printer,
  ShieldAlert,
  Clock,
  CheckCircle2,
  ScanLine,
  UserCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  HardDriveDownload,
  Database
} from 'lucide-react';

interface QRStationViewProps {
  onNavigate: (view: string) => void;
}

interface OfflineScanRecord {
  id: number;
  usuario_id: number;
  nombre_completo: string;
  timestamp: string;
  hora_str: string;
}

const OFFLINE_QUEUE_KEY = 'constancia_porteria_offline_queue';

export const QRStationView: React.FC<QRStationViewProps> = ({ onNavigate }) => {
  const { users, currentUser, registrarAsistencia } = useApp();
  const realIsOnline = useOnlineStatus();
  
  // Simulated offline toggle for testing
  const [forceSimulatedOffline, setForceSimulatedOffline] = useState(false);
  const effectiveOnline = realIsOnline && !forceSimulatedOffline;

  const [selectedUserToScan, setSelectedUserToScan] = useState<number>(currentUser?.id || users[0]?.id || 1);
  const [scanResult, setScanResult] = useState<{ ok: boolean; message: string; estado?: string; hora?: string } | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Offline queue state
  const [offlineQueue, setOfflineQueue] = useState<OfflineScanRecord[]>(() => {
    try {
      const saved = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSimulateScan = () => {
    const target = users.find(u => u.id === selectedUserToScan);
    const targetName = target ? `${target.nombre} ${target.apellido}` : `ID #${selectedUserToScan}`;

    if (!effectiveOnline) {
      // Offline mode: save to queue
      const now = new Date();
      const hora_str = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const record: OfflineScanRecord = {
        id: Date.now(),
        usuario_id: selectedUserToScan,
        nombre_completo: targetName,
        timestamp: now.toISOString(),
        hora_str,
      };

      setOfflineQueue(prev => [record, ...prev]);
      setScanResult({
        ok: true,
        message: `[OFFLINE] Marcación de ${targetName} guardada en almacenamiento local de portería.`,
        estado: 'Guardado Localmente',
        hora: hora_str,
      });
      return;
    }

    // Online mode
    const res = registrarAsistencia(selectedUserToScan);
    setScanResult(res);
  };

  const handleSyncQueue = () => {
    if (offlineQueue.length === 0) return;

    let syncCount = 0;
    offlineQueue.forEach(item => {
      registrarAsistencia(item.usuario_id);
      syncCount++;
    });

    setOfflineQueue([]);
    setScanResult({
      ok: true,
      message: `¡Éxito! Se sincronizaron ${syncCount} marcación(es) acumuladas offline con el Libro Digital.`,
      estado: 'Sincronizado',
    });
  };

  const handleExportOfflineBackup = () => {
    if (offlineQueue.length === 0) return;
    const headers = ['ID', 'Funcionario', 'Hora Marcacion', 'Fecha ISO'];
    const rows = offlineQueue.map(item => [
      item.usuario_id,
      `"${item.nombre_completo}"`,
      item.hora_str,
      item.timestamp,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Respaldo_Porteria_Offline_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div className="bg-white rounded-3xl shadow-xl border-t-4 border-t-[#0C5528] border-x border-b border-slate-100 p-8 text-center relative overflow-hidden">
        
        {/* Header */}
        <div className="pb-4 border-b border-slate-100 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#0C5528] flex items-center justify-center mx-auto mb-3 shadow-inner">
            <QrCode className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Estación de Registro de QR
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            U.E. "La Constancia" · Control Centralizado de Asistencias & Portería PWA
          </p>

          {/* Connection Mode Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            {effectiveOnline ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" /> Red Institucional Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                <WifiOff className="w-3.5 h-3.5 text-amber-700" /> Modo Portería Offline Activo
              </span>
            )}

            <button
              onClick={() => setForceSimulatedOffline(!forceSimulatedOffline)}
              className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold transition cursor-pointer"
            >
              {forceSimulatedOffline ? 'Restablecer Conexión' : 'Simular Corte de Internet'}
            </button>
          </div>
        </div>

        {/* Live Clock */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-amber-300 font-mono text-sm font-bold shadow-md mb-6">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Hora Oficial: {currentTime || '07:30:00 AM'}</span>
        </div>

        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          Enfoque la cámara de su dispositivo móvil o use el escáner del personal para validar de forma automática su hora de llegada.
        </p>

        {/* QR Code Presentation Box */}
        <div className="p-6 bg-white inline-block rounded-3xl border-4 border-dashed border-amber-400 shadow-md mx-auto relative group">
          {/* High-quality vector SVG QR matrix */}
          <svg className="w-64 h-64 mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="200" rx="12" fill="white" />
            
            {/* Top-Left Corner Position Marker */}
            <rect x="20" y="20" width="46" height="46" rx="6" fill="#0C5528" />
            <rect x="28" y="28" width="30" height="30" rx="3" fill="white" />
            <rect x="36" y="36" width="14" height="14" rx="2" fill="#0C5528" />

            {/* Top-Right Corner Position Marker */}
            <rect x="134" y="20" width="46" height="46" rx="6" fill="#0C5528" />
            <rect x="142" y="28" width="30" height="30" rx="3" fill="white" />
            <rect x="150" y="36" width="14" height="14" rx="2" fill="#0C5528" />

            {/* Bottom-Left Corner Position Marker */}
            <rect x="20" y="134" width="46" height="46" rx="6" fill="#0C5528" />
            <rect x="28" y="142" width="30" height="30" rx="3" fill="white" />
            <rect x="36" y="150" width="14" height="14" rx="2" fill="#0C5528" />

            {/* Data Grid Elements */}
            <g fill="#17222d">
              <rect x="76" y="22" width="8" height="8" rx="1" />
              <rect x="94" y="22" width="8" height="8" rx="1" />
              <rect x="112" y="22" width="8" height="8" rx="1" />
              <rect x="85" y="32" width="8" height="8" rx="1" />
              <rect x="103" y="32" width="8" height="8" rx="1" />
              <rect x="76" y="42" width="8" height="8" rx="1" />
              <rect x="112" y="42" width="8" height="8" rx="1" />
              
              <rect x="22" y="76" width="8" height="8" rx="1" />
              <rect x="32" y="85" width="8" height="8" rx="1" />
              <rect x="42" y="76" width="8" height="8" rx="1" />
              <rect x="52" y="85" width="8" height="8" rx="1" />

              <rect x="72" y="72" width="12" height="12" rx="2" fill="#DF5C12" />
              <rect x="90" y="72" width="8" height="8" rx="1" />
              <rect x="104" y="72" width="8" height="8" rx="1" />
              <rect x="118" y="72" width="12" height="12" rx="2" fill="#0C5528" />

              <rect x="72" y="90" width="8" height="8" rx="1" />
              <rect x="86" y="90" width="12" height="12" rx="2" fill="#DF5C12" />
              <rect x="104" y="90" width="8" height="8" rx="1" />
              <rect x="118" y="90" width="8" height="8" rx="1" />

              <rect x="72" y="108" width="12" height="12" rx="2" fill="#0C5528" />
              <rect x="90" y="108" width="8" height="8" rx="1" />
              <rect x="104" y="108" width="12" height="12" rx="2" fill="#DF5C12" />
              <rect x="122" y="108" width="8" height="8" rx="1" />

              <rect x="138" y="76" width="8" height="8" rx="1" />
              <rect x="156" y="76" width="8" height="8" rx="1" />
              <rect x="170" y="76" width="8" height="8" rx="1" />
              <rect x="148" y="88" width="8" height="8" rx="1" />
              <rect x="166" y="88" width="8" height="8" rx="1" />

              <rect x="76" y="140" width="8" height="8" rx="1" />
              <rect x="94" y="140" width="8" height="8" rx="1" />
              <rect x="112" y="140" width="8" height="8" rx="1" />
              <rect x="85" y="152" width="8" height="8" rx="1" />
              <rect x="103" y="152" width="8" height="8" rx="1" />
              <rect x="140" y="140" width="8" height="8" rx="1" />
              <rect x="158" y="140" width="8" height="8" rx="1" />
              <rect x="148" y="152" width="8" height="8" rx="1" />
              <rect x="166" y="152" width="8" height="8" rx="1" />
              <rect x="140" y="164" width="8" height="8" rx="1" />
              <rect x="158" y="164" width="8" height="8" rx="1" />
            </g>

            {/* Central Badge */}
            <circle cx="100" cy="100" r="16" fill="white" />
            <circle cx="100" cy="100" r="13" fill="#0C5528" />
            <path d="M94 100 L98 104 L107 95" stroke="#FFD23F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Dynamic Token Notice */}
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3.5 max-w-md mx-auto my-5 text-xs flex items-center gap-2.5 text-left">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            Este token dinámico valida la autenticidad y registra la hora oficial de llegada en el Libro Digital Escolar.
          </span>
        </div>

        {/* Interactive QR Scan Simulator & Offline Queue Hub */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-md mx-auto mb-6 text-left space-y-3">
          <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ScanLine className="w-4 h-4 text-emerald-600" />
              Escáner de Portería
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
              {effectiveOnline ? 'Modo Online' : 'Almacenamiento Local'}
            </span>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedUserToScan}
              onChange={e => setSelectedUserToScan(Number(e.target.value))}
              className="text-xs p-2 bg-white border border-slate-200 rounded-xl flex-1 focus:outline-none"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.apellido}, {u.nombre} ({u.rol})
                </option>
              ))}
            </select>
            <button
              onClick={handleSimulateScan}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5" /> Escanear
            </button>
          </div>

          {/* Scan result banner */}
          {scanResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                scanResult.ok
                  ? 'bg-emerald-100/70 border border-emerald-300 text-emerald-900'
                  : 'bg-amber-100/70 border border-amber-300 text-amber-900'
              }`}
            >
              {scanResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
              )}
              <div>
                <div className="font-bold">{scanResult.message}</div>
                {scanResult.estado && (
                  <div className="text-[11px] opacity-90">
                    Estatus: <strong>{scanResult.estado}</strong> · Hora: {scanResult.hora}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Offline Queue Section */}
          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-600" /> Cola Offline Acumulada:
              </span>
              <span className="bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full font-bold text-[11px]">
                {offlineQueue.length} escaneo(s)
              </span>
            </div>

            {offlineQueue.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSyncQueue}
                  className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Sincronizar Cola al Servidor
                </button>
                <button
                  onClick={handleExportOfflineBackup}
                  className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs transition cursor-pointer"
                  title="Descargar copia de seguridad CSV de los registros locales"
                >
                  <HardDriveDownload className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => onNavigate('director')}
            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a Consola
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-2 bg-[#0C5528] hover:bg-[#072e19] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-amber-300" /> Imprimir QR Institucional
          </button>
        </div>

      </div>
    </div>
  );
};
