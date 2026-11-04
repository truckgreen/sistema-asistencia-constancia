import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Clock,
  QrCode,
  CalendarCheck,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Paperclip,
  Calendar,
  Sparkles,
  UserCheck,
  FileText,
  ScanLine,
  X,
  Camera,
  CameraOff,
  UploadCloud,
  IdCard,
  Printer
} from 'lucide-react';
import {
  generateQRCodeUrl,
  getStaffQRPayload,
  scanQRFromVideo,
  scanQRFromFile,
  playScanSuccessSound
} from '../utils/qrHelper';

export const PersonalDashboard: React.FC = () => {
  const {
    currentUser,
    attendances,
    events,
    classes,
    permissions,
    config,
    registrarAsistencia,
    reportarInasistencia,
    solicitarPermiso,
  } = useApp();

  const user = currentUser;
  const userId = user?.id || 1;
  const todayIso = new Date().toISOString().split('T')[0];

  // Permiso form state
  const [permisoStart, setPermisoStart] = useState(todayIso);
  const [permisoEnd, setPermisoEnd] = useState(todayIso);
  const [permisoMotivo, setPermisoMotivo] = useState('salud');
  const [permisoObs, setPermisoObs] = useState('');
  const [permisoFile, setPermisoFile] = useState('');

  // Inasistencia form state
  const [inasistenciaMotivo, setInasistenciaMotivo] = useState('salud');
  const [inasistenciaObs, setInasistenciaObs] = useState('');
  const [inasistenciaFile, setInasistenciaFile] = useState('');

  // Personal attendances
  const misRegistros = useMemo(() => {
    return attendances
      .filter(a => a.usuario_id === userId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [attendances, userId]);

  // Permissions count used
  const permisosUsados = useMemo(() => {
    return permissions.filter(p => p.usuario_id === userId && p.estado !== 'Rechazado').length;
  }, [permissions, userId]);

  const maxPermisos = user?.limite_permisos ?? config.limite_permisos;

  // Personal events (classes assigned + public institutional events + holidays)
  const misEventos = useMemo(() => {
    return events.filter(e => e.tipo !== 'clase' || e.profesor_id === userId);
  }, [events, userId]);

  // Modals state
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrModalTab, setQrModalTab] = useState<'scan' | 'carnet'>('scan');
  const [personalQRUrl, setPersonalQRUrl] = useState<string>('');
  const [showPermisoModal, setShowPermisoModal] = useState(false);
  const [showInasistenciaModal, setShowInasistenciaModal] = useState(false);

  // Camera & Scan state
  const [isCamActive, setIsCamActive] = useState<boolean>(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ ok: boolean; message: string; estado?: string; hora?: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Generate user's personal QR code
  useEffect(() => {
    if (user) {
      const payload = getStaffQRPayload(user.id, `${user.nombre} ${user.apellido}`, user.rol);
      generateQRCodeUrl(payload).then(setPersonalQRUrl);
    }
  }, [user]);

  // Camera handlers
  const startCamera = async () => {
    setCamError(null);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCamActive(true);
        startScanning();
      }
    } catch (err: any) {
      console.error('Camera error in PersonalDashboard:', err);
      setCamError('No se pudo acceder a la cámara. Puede pulsar "Registrar con 1 Clic" o subir una foto del código.');
      setIsCamActive(false);
    }
  };

  const stopCamera = () => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCamActive(false);
  };

  const startScanning = () => {
    const loop = () => {
      if (videoRef.current && canvasRef.current) {
        const decoded = scanQRFromVideo(videoRef.current, canvasRef.current);
        if (decoded) {
          playScanSuccessSound();
          const res = registrarAsistencia(userId, true);
          setScanResult(res);
          stopCamera();
          return;
        }
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
  };

  const handleScanAttendance = () => {
    playScanSuccessSound();
    const res = registrarAsistencia(userId, true);
    setScanResult(res);
    stopCamera();
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const decoded = await scanQRFromFile(file);
      if (decoded) {
        playScanSuccessSound();
        const res = registrarAsistencia(userId, true);
        setScanResult(res);
      } else {
        setScanResult({
          ok: false,
          message: 'No se detectó un código QR legible en la imagen seleccionada.',
        });
      }
    } catch {
      setScanResult({ ok: false, message: 'Error procesando la imagen.' });
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleSendPermiso = (e: React.FormEvent) => {
    e.preventDefault();
    solicitarPermiso({
      usuario_id: userId,
      fecha_inicio: permisoStart,
      fecha_fin: permisoEnd,
      motivo: permisoMotivo,
      observaciones: permisoObs,
      archivo_adjunto: permisoFile || 'constancia_adjunta.pdf',
    });
    setShowPermisoModal(false);
    setPermisoObs('');
  };

  const handleSendInasistencia = (e: React.FormEvent) => {
    e.preventDefault();
    reportarInasistencia({
      usuario_id: userId,
      motivo: inasistenciaMotivo,
      observaciones: inasistenciaObs,
      archivo_adjunto: inasistenciaFile || 'justificante_medico.pdf',
    });
    setShowInasistenciaModal(false);
    setInasistenciaObs('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            Mi Cronograma & Registro de Asistencia
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Planificación académica, marcaje de entrada y gestión individual de justificaciones
          </p>
        </div>

        {/* Quick Action Header Card */}
        <div className="bg-white rounded-2xl p-2.5 border border-slate-100 shadow-sm flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setScanResult(null);
              setShowQRModal(true);
            }}
            className="px-3.5 py-2 bg-gradient-to-r from-[#0C5528] to-emerald-700 hover:from-[#072e19] hover:to-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-amber-300" />
            Registrar Asistencia
          </button>

          <button
            onClick={() => setShowPermisoModal(true)}
            className="px-3 py-2 border border-amber-300 bg-amber-50/70 hover:bg-amber-100/70 text-amber-900 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4 text-amber-600" />
            Solicitar Permiso
          </button>

          <button
            onClick={() => setShowInasistenciaModal(true)}
            className="px-3 py-2 border border-red-200 bg-red-50/70 hover:bg-red-100/70 text-red-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-red-600" />
            Reportar Inasistencia
          </button>
        </div>
      </div>

      {/* Main Grid: Left Column Calendar & Right Column History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Agenda & Assigned Classes (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                Mi Calendario y Horario Académico
              </h2>
              <p className="text-xs text-slate-400">
                Cátedras asignadas, reuniones de departamento y feriados
              </p>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Jornada: {user?.hora_entrada || '07:00'} - {user?.hora_salida || '13:00'}
            </span>
          </div>

          {/* List of upcoming activities for this teacher */}
          <div className="space-y-2.5">
            {misEventos.slice(0, 8).map(ev => {
              const isClass = ev.tipo === 'clase';
              const isFeriado = ev.tipo === 'feriado';
              return (
                <div
                  key={ev.id}
                  className={`p-3.5 rounded-2xl border transition text-xs flex items-center justify-between gap-3 ${
                    isClass
                      ? 'bg-blue-50/60 border-blue-200/80 text-blue-950'
                      : isFeriado
                      ? 'bg-red-50/60 border-red-200/80 text-red-950'
                      : 'bg-amber-50/60 border-amber-200/80 text-amber-950'
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isClass ? 'bg-blue-600' : isFeriado ? 'bg-red-600' : 'bg-amber-500'
                        }`}
                      />
                      {ev.titulo}
                    </div>
                    <div className="text-[11px] opacity-75 font-mono mt-0.5">
                      {ev.fecha_inicio.replace('T', ' ')} a {ev.fecha_fin.split('T')[1] || ev.fecha_fin}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      isClass
                        ? 'bg-blue-200 text-blue-900'
                        : isFeriado
                        ? 'bg-red-200 text-red-900'
                        : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    {ev.tipo}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Attendance History (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                Mi Historial de Asistencia
              </h2>
              <p className="text-xs text-slate-400">
                Registro de marcaciones del mes en curso
              </p>
            </div>
            <span className="text-xs text-slate-400 font-bold">
              {misRegistros.length} entradas
            </span>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100">
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Hora</th>
                  <th className="py-2.5 px-3 text-right">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {misRegistros.map(reg => {
                  const timeFormatted = reg.hora_registro
                    ? new Date(reg.hora_registro).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                      })
                    : '--:--:--';

                  return (
                    <tr key={reg.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {reg.fecha}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {timeFormatted}
                        {reg.minutos_retraso > 0 && (
                          <span className="block text-[10px] text-amber-600 font-bold">
                            +{reg.minutos_retraso} min
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {reg.estado === 'A tiempo' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            A Tiempo
                          </span>
                        ) : reg.estado === 'Tarde' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Con Retraso
                          </span>
                        ) : reg.estado === 'Inasistencia Reportada' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Pendiente
                          </span>
                        ) : reg.estado === 'Inasistencia Aprobada' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Aprobada
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-800 border border-red-200">
                            {reg.estado}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Hidden helper canvas for personal dashboard scanning */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileRef}
        onChange={handleFileScan}
        accept="image/*"
        className="hidden"
      />

      {/* Modal: Registrar Asistencia & Carnet Digital */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-[#0C5528] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-300" />
                Control de Asistencia con Código QR
              </h3>
              <button
                onClick={() => {
                  stopCamera();
                  setShowQRModal(false);
                }}
                className="text-white/80 hover:text-white text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setQrModalTab('scan');
                }}
                className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  qrModalTab === 'scan'
                    ? 'bg-white border-b-2 border-[#0C5528] text-[#0C5528]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ScanLine className="w-3.5 h-3.5" />
                Escanear Portería
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setQrModalTab('carnet');
                }}
                className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  qrModalTab === 'carnet'
                    ? 'bg-white border-b-2 border-[#0C5528] text-[#0C5528]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <IdCard className="w-3.5 h-3.5" />
                Mi Carnet Digital QR
              </button>
            </div>

            <div className="p-5 text-center space-y-4">
              {qrModalTab === 'scan' ? (
                <>
                  {/* Camera / Scanner Frame */}
                  <div className="relative w-full max-w-xs mx-auto h-56 bg-slate-950 rounded-2xl overflow-hidden border-2 border-emerald-500/70 shadow-inner flex items-center justify-center">
                    <video
                      ref={videoRef}
                      className={`w-full h-full object-cover ${isCamActive ? 'block' : 'hidden'}`}
                      autoPlay
                      muted
                      playsInline
                    />

                    {!isCamActive && (
                      <div className="p-4 text-center space-y-2 z-10">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center mx-auto">
                          <Camera className="w-6 h-6" />
                        </div>
                        <p className="text-xs text-slate-300">
                          Active la cámara para escanear el QR institucional de portería
                        </p>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                        >
                          Encender Cámara
                        </button>
                      </div>
                    )}

                    {isCamActive && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-36 h-36 border-2 border-emerald-400 rounded-xl relative flex items-center justify-center">
                          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-bounce" />
                        </div>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="absolute top-2 right-2 pointer-events-auto px-2 py-1 bg-black/60 text-white text-[10px] rounded-lg cursor-pointer"
                        >
                          Apagar
                        </button>
                      </div>
                    )}
                  </div>

                  {camError && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs text-left">
                      {camError}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleScanAttendance}
                      className="w-full py-2.5 bg-[#0C5528] hover:bg-[#072e19] text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <CheckCircle2 className="w-4 h-4 text-amber-300" />
                      Registrar Asistencia Inmediata (1 Clic)
                    </button>

                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      Subir foto o archivo con QR
                    </button>
                  </div>
                </>
              ) : (
                /* Tab 2: Carnet Digital */
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50/60 border-2 border-emerald-300 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                      Credencial Digital Institucional
                    </span>
                    <div className="text-sm font-extrabold text-slate-900">
                      {user?.nombre} {user?.apellido}
                    </div>
                    <div className="text-xs text-slate-500 capitalize">
                      {user?.rol === 'personal' ? 'Docente' : user?.rol} · {user?.departamento || 'Institucional'}
                    </div>

                    <div className="my-3 p-3 bg-white rounded-xl inline-block border border-slate-200 shadow-xs">
                      {personalQRUrl ? (
                        <img
                          src={personalQRUrl}
                          alt="QR Personal"
                          className="w-40 h-40 mx-auto object-contain"
                        />
                      ) : (
                        <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-400">
                          Generando QR...
                        </div>
                      )}
                      <div className="text-[10px] font-mono text-slate-500 mt-1">
                        ID: #{user?.id}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Muestre este código al escáner de portería al ingresar a la institución
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir Mi Carnet
                  </button>
                </div>
              )}

              {/* Scan result notification */}
              {scanResult && (
                <div
                  className={`p-3 rounded-xl text-xs text-left flex items-start gap-2 ${
                    scanResult.ok
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border border-amber-200 text-amber-900'
                  }`}
                >
                  {scanResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">{scanResult.message}</div>
                    {scanResult.estado && (
                      <div className="text-[11px] opacity-80 mt-0.5">
                        Estatus: <strong>{scanResult.estado}</strong> · Hora:{' '}
                        {scanResult.hora}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Solicitar Permiso */}
      {showPermisoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-amber-500 text-slate-950 px-6 py-4 flex items-center justify-between font-bold">
              <h3 className="text-sm flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-slate-950" />
                Solicitar Permiso Institucional
              </h3>
              <button
                onClick={() => setShowPermisoModal(false)}
                className="text-slate-900/80 hover:text-slate-950 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSendPermiso} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center justify-between">
                <span>Permisos utilizados este período:</span>
                <span className="font-bold text-xs bg-amber-200 px-2 py-0.5 rounded">
                  {permisosUsados} / {maxPermisos}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Desde</label>
                  <input
                    type="date"
                    value={permisoStart}
                    onChange={e => setPermisoStart(e.target.value)}
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={permisoEnd}
                    onChange={e => setPermisoEnd(e.target.value)}
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Motivo</label>
                <select
                  value={permisoMotivo}
                  onChange={e => setPermisoMotivo(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="salud">Cita Médica / Salud</option>
                  <option value="personal">Asunto Personal Justificado</option>
                  <option value="emergencia">Emergencia Familiar</option>
                  <option value="otro">Otro Motivo</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Detalles de la Solicitud</label>
                <textarea
                  value={permisoObs}
                  onChange={e => setPermisoObs(e.target.value)}
                  rows={3}
                  placeholder="Explique las circunstancias del permiso requerido..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Adjuntar Justificante (PDF / Imagen)</label>
                <input
                  type="text"
                  value={permisoFile}
                  onChange={e => setPermisoFile(e.target.value)}
                  placeholder="Nombre de archivo adjunto (ej. constancia_medica.pdf)"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                  Enviar Solicitud al Directivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reportar Inasistencia */}
      {showInasistenciaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between font-bold">
              <h3 className="text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 text-white" />
                Justificar Inasistencia de Hoy
              </h3>
              <button
                onClick={() => setShowInasistenciaModal(false)}
                className="text-white/80 hover:text-white text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSendInasistencia} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Motivo Principal</label>
                <select
                  value={inasistenciaMotivo}
                  onChange={e => setInasistenciaMotivo(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="salud">Cita Médica / Reposo</option>
                  <option value="personal">Asunto Personal de Fuerza Mayor</option>
                  <option value="emergencia">Emergencia Familiar</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Detalles / Observaciones</label>
                <textarea
                  value={inasistenciaObs}
                  onChange={e => setInasistenciaObs(e.target.value)}
                  rows={3}
                  placeholder="Detalle brevemente las razones..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Adjuntar Justificante (PDF / Imagen)</label>
                <input
                  type="text"
                  value={inasistenciaFile}
                  onChange={e => setInasistenciaFile(e.target.value)}
                  placeholder="Ej. constancia_medica_octubre.pdf"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                  Enviar Justificación de Inasistencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
