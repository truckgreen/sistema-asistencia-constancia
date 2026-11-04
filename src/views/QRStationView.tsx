import React, { useState, useEffect, useRef } from 'react';
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
  Database,
  Camera,
  CameraOff,
  UploadCloud,
  IdCard,
  X,
  Volume2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import {
  generateQRCodeUrl,
  getStationQRPayload,
  getStaffQRPayload,
  parseScannedQR,
  scanQRFromVideo,
  scanQRFromFile,
  playScanSuccessSound
} from '../utils/qrHelper';
import { INSTITUTION_CONFIG } from '../config/systemConfig';

interface QRStationViewProps {
  onNavigate: (view: string, params?: any) => void;
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

  // Simulated offline toggle
  const [forceSimulatedOffline, setForceSimulatedOffline] = useState(false);
  const effectiveOnline = realIsOnline && !forceSimulatedOffline;

  // Station and QR state
  const [stationQRUrl, setStationQRUrl] = useState<string>('');
  const [selectedUserToScan, setSelectedUserToScan] = useState<number>(currentUser?.id || users[0]?.id || 1);
  const [scanResult, setScanResult] = useState<{
    ok: boolean;
    message: string;
    estado?: string;
    hora?: string;
    yaRegistrado?: boolean;
    usuario?: { nombre: string; apellido: string; rol: string; departamento?: string };
  } | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Camera Scanner State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanningCooldown, setIsScanningCooldown] = useState<boolean>(false);
  const [lastScannedPayload, setLastScannedPayload] = useState<string>('');

  // Staff Cards Modal
  const [showStaffCardsModal, setShowStaffCardsModal] = useState<boolean>(false);
  const [staffQRCodes, setStaffQRCodes] = useState<Record<number, string>>({});

  // Refs for video & canvas
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Generate Station Institutional QR Code
  useEffect(() => {
    generateQRCodeUrl(getStationQRPayload()).then(url => {
      setStationQRUrl(url);
    });
  }, []);

  // Generate QR codes for all staff for modal view
  useEffect(() => {
    async function loadAllCards() {
      const map: Record<number, string> = {};
      for (const u of users) {
        const payload = getStaffQRPayload(u.id, `${u.nombre} ${u.apellido}`, u.rol);
        const url = await generateQRCodeUrl(payload);
        map[u.id] = url;
      }
      setStaffQRCodes(map);
    }
    loadAllCards();
  }, [users]);

  // Official live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Process a detected QR code string
  const handleProcessScannedCode = (decodedText: string) => {
    if (isScanningCooldown) return;
    setLastScannedPayload(decodedText);

    const parsed = parseScannedQR(decodedText, users);

    let targetUserId: number;

    if (parsed.type === 'user' && parsed.userId) {
      targetUserId = parsed.userId;
    } else if (parsed.type === 'station') {
      // Scanned the station QR code: attribute to selected user or current user
      targetUserId = selectedUserToScan || currentUser?.id || users[0]?.id || 1;
    } else {
      // Attempt to find user by string inside
      const match = users.find(
        u =>
          decodedText.includes(String(u.id)) ||
          decodedText.toLowerCase().includes(u.correo.toLowerCase()) ||
          decodedText.toLowerCase().includes(u.nombre.toLowerCase())
      );
      if (match) {
        targetUserId = match.id;
      } else {
        targetUserId = selectedUserToScan || 1;
      }
    }

    const targetUser = users.find(u => u.id === targetUserId);
    if (!targetUser) {
      setScanResult({
        ok: false,
        message: `Código QR escaneado no coincide con ningún funcionario registrado: "${decodedText.slice(0, 30)}..."`,
      });
      return;
    }

    // Play pleasant audio chime
    playScanSuccessSound();

    if (!effectiveOnline) {
      // Offline mode
      const now = new Date();
      const hora_str = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const record: OfflineScanRecord = {
        id: Date.now(),
        usuario_id: targetUserId,
        nombre_completo: `${targetUser.nombre} ${targetUser.apellido}`,
        timestamp: now.toISOString(),
        hora_str,
      };

      setOfflineQueue(prev => [record, ...prev]);
      setScanResult({
        ok: true,
        message: `[MODO OFFLINE] Marcación de ${targetUser.nombre} ${targetUser.apellido} guardada localmente en portería.`,
        estado: 'Guardado Offline',
        hora: hora_str,
        usuario: targetUser,
      });
    } else {
      // Online mode: register in attendance book
      const res = registrarAsistencia(targetUserId, true);
      setScanResult({
        ...res,
        usuario: targetUser,
      });
    }

    // Set cooldown to prevent immediate repeated scanning
    setIsScanningCooldown(true);
    setTimeout(() => {
      setIsScanningCooldown(false);
    }, 2800);
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      stopCamera();
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        startScanningLoop();
      }
    } catch (err: any) {
      console.error('Error opening camera:', err);
      let errorText = 'No se pudo acceder a la cámara.';
      if (err.name === 'NotAllowedError') {
        errorText = 'Permiso denegado para usar la cámara. Puede habilitarlo en la configuración del navegador o usar el escáner alternativo.';
      } else if (err.name === 'NotFoundError') {
        errorText = 'No se encontró ningún dispositivo de cámara en este equipo.';
      } else if (err.name === 'NotReadableError') {
        errorText = 'La cámara está siendo usada por otra aplicación.';
      }
      setCameraError(errorText);
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Continuous Frame Scanning Loop
  const startScanningLoop = () => {
    const scanFrame = () => {
      if (!isCameraActive && !videoRef.current) return;

      if (videoRef.current && canvasRef.current && !isScanningCooldown) {
        const decoded = scanQRFromVideo(videoRef.current, canvasRef.current);
        if (decoded) {
          handleProcessScannedCode(decoded);
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // Toggle Camera Facing
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      setTimeout(() => startCamera(), 100);
    }
  };

  // Handle Image File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const decoded = await scanQRFromFile(file);
      if (decoded) {
        handleProcessScannedCode(decoded);
      } else {
        setScanResult({
          ok: false,
          message: 'No se detectó ningún código QR legible en la imagen seleccionada.',
        });
      }
    } catch {
      setScanResult({
        ok: false,
        message: 'Error al procesar el archivo de imagen.',
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger file dialog
  const triggerImagePicker = () => {
    fileInputRef.current?.click();
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Offline queue syncing
  const handleSyncQueue = () => {
    if (offlineQueue.length === 0) return;

    let syncCount = 0;
    offlineQueue.forEach(item => {
      registrarAsistencia(item.usuario_id, true);
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

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Respaldo_Porteria_Offline_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      {/* Hidden helper canvas for QR frame extraction */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      <div className="bg-white rounded-3xl shadow-xl border-t-4 border-t-[#0C5528] border-x border-b border-slate-100 p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Top Header */}
        <div className="pb-4 border-b border-slate-100 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#0C5528] flex items-center justify-center mx-auto mb-3 shadow-inner">
            <QrCode className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Estación de Escaneo y Registro de Asistencia
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {INSTITUTION_CONFIG.name} · Control de Portería & Validación Automática
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

        {/* Live Clock & Punctuality Indicator */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-amber-300 font-mono text-sm font-bold shadow-md mb-6">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Hora Oficial: {currentTime || '07:30:00 AM'}</span>
        </div>

        {/* =========================================================================
            SCANNER SECTION (LIVE CAMERA SCANNER + IMAGE SCANNER)
           ========================================================================= */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 mb-6 shadow-2xl relative overflow-hidden border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-left">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ScanLine className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">
                  Escáner Óptico de Códigos QR
                </h3>
                <p className="text-[11px] text-slate-400">
                  Detecta carnets del personal o el QR institucional en tiempo real
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              {isCameraActive && (
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
                  title="Cambiar entre cámara trasera y delantera"
                >
                  Voltear cámara
                </button>
              )}
              <button
                type="button"
                onClick={triggerImagePicker}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                title="Subir foto o archivo con QR"
              >
                <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                Subir foto QR
              </button>
            </div>
          </div>

          {/* Camera Viewport / Stream Container */}
          <div className="relative w-full max-w-sm mx-auto h-64 sm:h-72 bg-slate-950 rounded-2xl overflow-hidden border-2 border-emerald-500/60 shadow-inner flex items-center justify-center">
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              autoPlay
              muted
              playsInline
            />

            {/* Camera Inactive State View */}
            {!isCameraActive && (
              <div className="text-center p-6 space-y-3 z-10">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Cámara Lista para Escanear</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                    Active la cámara de su laptop, tablet o teléfono para leer carnets de llegada al instante.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="py-2.5 px-5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-900/40 transition cursor-pointer inline-flex items-center gap-2"
                >
                  <Camera className="w-4 h-4 text-emerald-200" />
                  Activar Cámara de Portería
                </button>
              </div>
            )}

            {/* Scanning Overlay (Active when camera is running) */}
            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Dark Vignette Mask */}
                <div className="absolute inset-0 bg-slate-950/40" />

                {/* Target Scanning Window */}
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 border-2 border-emerald-400 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl">
                  {/* Corner Markers */}
                  <div className="absolute top-1 left-1 w-5 h-5 border-t-4 border-l-4 border-amber-400 rounded-tl" />
                  <div className="absolute top-1 right-1 w-5 h-5 border-t-4 border-r-4 border-amber-400 rounded-tr" />
                  <div className="absolute bottom-1 left-1 w-5 h-5 border-b-4 border-l-4 border-amber-400 rounded-bl" />
                  <div className="absolute bottom-1 right-1 w-5 h-5 border-b-4 border-r-4 border-amber-400 rounded-br" />

                  {/* Animated Scanning Laser */}
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-bounce shadow-md shadow-emerald-400" />

                  {isScanningCooldown && (
                    <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-1" />
                      <span className="text-xs font-bold text-white">¡QR Procesado!</span>
                      <span className="text-[10px] text-emerald-300">Listo para el siguiente</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stop camera button overlay */}
            {isCameraActive && (
              <button
                type="button"
                onClick={stopCamera}
                className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer backdrop-blur-xs"
              >
                <CameraOff className="w-3.5 h-3.5 text-red-400" />
                Detener
              </button>
            )}
          </div>

          {/* Camera Error Message */}
          {cameraError && (
            <div className="mt-3 p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Helper caption */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-emerald-400" />
              Emite sonido de confirmación al validar
            </span>
            <span>Compatible con teléfonos, tablets y webcams</span>
          </div>
        </div>

        {/* =========================================================================
            LIVE SCAN RESULT BANNER (PROMINENT CONFIRMATION)
           ========================================================================= */}
        {scanResult && (
          <div
            className={`p-4 rounded-2xl text-left border shadow-lg mb-6 transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
              scanResult.ok
                ? scanResult.estado === 'Tarde'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-red-50 border-red-300 text-red-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  scanResult.ok
                    ? scanResult.estado === 'Tarde'
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-emerald-200 text-emerald-900'
                    : 'bg-red-200 text-red-900'
                }`}
              >
                {scanResult.ok ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <ShieldAlert className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-extrabold text-sm text-slate-900">
                    {scanResult.ok ? 'Marcación Validada Exitosamente' : 'Aviso de Marcación'}
                  </h4>
                  {scanResult.estado && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        scanResult.estado === 'A tiempo'
                          ? 'bg-emerald-200 text-emerald-900'
                          : scanResult.estado === 'Tarde'
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {scanResult.estado}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-700 mt-0.5 font-medium">
                  {scanResult.message}
                </p>

                {scanResult.usuario && (
                  <div className="mt-2 pt-2 border-t border-black/10 flex flex-wrap items-center justify-between text-xs text-slate-600">
                    <div>
                      <strong>Funcionario:</strong> {scanResult.usuario.nombre}{' '}
                      {scanResult.usuario.apellido} ({scanResult.usuario.rol})
                    </div>
                    <div>
                      <strong>Hora oficial asentada:</strong> {scanResult.hora}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ONE-CLICK MANUAL TEST SCANNER & CARNET HUB
           ========================================================================= */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 mb-6 text-left space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <UserCheck className="w-4 h-4 text-[#0C5528]" />
                Validación Rápida de Entrada por Funcionario
              </h3>
              <p className="text-[11px] text-slate-500">
                Seleccione cualquier miembro del personal para registrar su asistencia con 1 clic
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowStaffCardsModal(true)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
            >
              <IdCard className="w-3.5 h-3.5 text-[#DF5C12]" />
              Ver Carnets con QR ({users.length})
            </button>
          </div>

          {/* Quick Select and Register */}
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedUserToScan}
              onChange={e => setSelectedUserToScan(Number(e.target.value))}
              className="text-xs p-2.5 bg-white border border-slate-200 rounded-xl flex-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.apellido}, {u.nombre} · {u.rol === 'personal' ? 'Docente' : u.rol} (
                  {u.departamento || 'Institucional'})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const userObj = users.find(u => u.id === selectedUserToScan);
                if (userObj) {
                  const payload = getStaffQRPayload(
                    userObj.id,
                    `${userObj.nombre} ${userObj.apellido}`,
                    userObj.rol
                  );
                  handleProcessScannedCode(payload);
                }
              }}
              className="px-4 py-2.5 bg-[#0C5528] hover:bg-[#072e19] text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
              Validar Llegada
            </button>
          </div>

          {/* Quick Staff Badges for 1-click Test */}
          <div className="pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Marcación instantánea con 1 toque:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {users.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserToScan(u.id);
                    const payload = getStaffQRPayload(
                      u.id,
                      `${u.nombre} ${u.apellido}`,
                      u.rol
                    );
                    handleProcessScannedCode(payload);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-[11px] font-semibold text-slate-700 hover:text-emerald-900 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {u.nombre} {u.apellido}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================================
            INSTITUTIONAL QR CODE DISPLAY (FOR SCANNING VIA MOBILE PHONE)
           ========================================================================= */}
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl max-w-md mx-auto mb-6 text-center">
          <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">
            Código QR Institucional de Portería
          </span>
          <p className="text-[11px] text-slate-500 mb-4">
            Los profesores y funcionarios pueden apuntar su teléfono a este código para registrar su llegada
          </p>

          <div className="p-4 bg-white inline-block rounded-2xl border-2 border-emerald-600 shadow-md mx-auto relative group">
            {stationQRUrl ? (
              <img
                src={stationQRUrl}
                alt="QR Portería La Constancia"
                className="w-56 h-56 mx-auto object-contain"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                Generando QR...
              </div>
            )}
            <div className="mt-2 text-[10px] font-mono font-bold text-[#0C5528]">
              ESTACIÓN: PORTERÍA PRINCIPAL
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" /> Imprimir QR de Portería
            </button>
          </div>
        </div>

        {/* Offline Queue Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-md mx-auto mb-6 text-left space-y-3">
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

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => onNavigate('director')}
            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a Consola
          </button>
          <button
            onClick={() => onNavigate('reporte', { tipo_registro: 'asistencias' })}
            className="px-5 py-2 bg-[#0C5528] hover:bg-[#072e19] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" /> Ver Libro de Asistencias
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODAL: CARNETS DIGITALES DEL PERSONAL CON QR
         ========================================================================= */}
      {showStaffCardsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="bg-[#0C5528] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <IdCard className="w-5 h-5 text-amber-300" />
                  Carnets Escolares y Códigos QR del Personal
                </h3>
                <p className="text-xs text-emerald-200">
                  Puede escanear directamente estos códigos desde la cámara o imprimirlos
                </p>
              </div>
              <button
                onClick={() => setShowStaffCardsModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Cards Grid */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {users.map(u => {
                const qrUrl = staffQRCodes[u.id];
                return (
                  <div
                    key={u.id}
                    className="bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-2xl p-4 shadow-sm hover:shadow-md transition text-center relative group"
                  >
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-[#0C5528]">
                      ID #{u.id}
                    </span>

                    <div className="text-xs font-extrabold text-slate-800 leading-tight mt-1">
                      {u.nombre} {u.apellido}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {u.rol === 'personal' ? 'Docente' : u.rol} · {u.departamento || 'Institucional'}
                    </div>

                    <div className="my-3 p-2 bg-slate-50 rounded-xl inline-block border border-slate-100">
                      {qrUrl ? (
                        <img
                          src={qrUrl}
                          alt={`QR ${u.nombre}`}
                          className="w-28 h-28 mx-auto object-contain"
                        />
                      ) : (
                        <div className="w-28 h-28 flex items-center justify-center text-xs text-slate-400">
                          Cargando...
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const payload = getStaffQRPayload(
                          u.id,
                          `${u.nombre} ${u.apellido}`,
                          u.rol
                        );
                        handleProcessScannedCode(payload);
                        setShowStaffCardsModal(false);
                      }}
                      className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#0C5528] font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Escanear este carnet
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {users.length} funcionarios con credencial digital QR activa
              </span>
              <button
                type="button"
                onClick={() => setShowStaffCardsModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
