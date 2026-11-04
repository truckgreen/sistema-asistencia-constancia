import QRCode from 'qrcode';
import jsQR from 'jsqr';

/**
 * Generates a data URL for a given text using QR Code
 */
export async function generateQRCodeUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0C5528',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

/**
 * Formats a QR code payload for a staff member
 */
export function getStaffQRPayload(userId: number, nombre: string, rol: string): string {
  return JSON.stringify({
    app: 'ue_la_constancia',
    tipo: 'credencial_personal',
    id: userId,
    nombre,
    rol,
    v: 1,
  });
}

/**
 * Formats institutional station QR code payload
 */
export function getStationQRPayload(): string {
  return JSON.stringify({
    app: 'ue_la_constancia',
    tipo: 'estacion_porteria',
    estacion: 'Portería Principal',
    fecha: new Date().toISOString().split('T')[0],
  });
}

/**
 * Parses scanned QR text into an identified user or station
 */
export function parseScannedQR(
  text: string,
  users: Array<{ id: number; nombre: string; apellido: string; correo: string }>
): {
  type: 'user' | 'station' | 'unknown';
  userId?: number;
  userName?: string;
  rawText: string;
} {
  const clean = text.trim();

  // Try JSON parse first
  try {
    const parsed = JSON.parse(clean);
    if (parsed.tipo === 'credencial_personal' && parsed.id) {
      const u = users.find(user => user.id === Number(parsed.id));
      return {
        type: 'user',
        userId: Number(parsed.id),
        userName: u ? `${u.nombre} ${u.apellido}` : parsed.nombre,
        rawText: clean,
      };
    }
    if (parsed.userId) {
      const u = users.find(user => user.id === Number(parsed.userId));
      return {
        type: 'user',
        userId: Number(parsed.userId),
        userName: u ? `${u.nombre} ${u.apellido}` : undefined,
        rawText: clean,
      };
    }
    if (parsed.tipo === 'estacion_porteria') {
      return { type: 'station', rawText: clean };
    }
  } catch {
    // Not JSON, continue with regex patterns
  }

  // Check prefix: constancia:user:123 or user:123 or id:123
  const matchId = clean.match(/(?:constancia:)?(?:user|usuario|id)[:=](\d+)/i);
  if (matchId && matchId[1]) {
    const id = Number(matchId[1]);
    const u = users.find(user => user.id === id);
    return {
      type: 'user',
      userId: id,
      userName: u ? `${u.nombre} ${u.apellido}` : `Usuario #${id}`,
      rawText: clean,
    };
  }

  // Check if text is just a raw numeric ID
  if (/^\d+$/.test(clean)) {
    const id = Number(clean);
    const u = users.find(user => user.id === id);
    if (u) {
      return {
        type: 'user',
        userId: id,
        userName: `${u.nombre} ${u.apellido}`,
        rawText: clean,
      };
    }
  }

  // Check if text is a staff email
  const matchEmail = users.find(u => u.correo.toLowerCase() === clean.toLowerCase());
  if (matchEmail) {
    return {
      type: 'user',
      userId: matchEmail.id,
      userName: `${matchEmail.nombre} ${matchEmail.apellido}`,
      rawText: clean,
    };
  }

  // Check station string
  if (clean.toLowerCase().includes('constancia') && (clean.toLowerCase().includes('estacion') || clean.toLowerCase().includes('porteria') || clean.toLowerCase().includes('station'))) {
    return { type: 'station', rawText: clean };
  }

  return { type: 'unknown', rawText: clean };
}

/**
 * Decodes QR code from a video frame drawn on a helper canvas
 */
export function scanQRFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): string | null {
  if (video.readyState !== video.HAVE_ENOUGH_DATA) {
    return null;
  }

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  });

  return code ? code.data : null;
}

/**
 * Decodes QR code from an image file (File or Blob)
 */
export async function scanQRFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });
      resolve(code ? code.data : null);
    };

    img.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Plays a pleasant auditory chime when a QR code is successfully scanned
 */
export function playScanSuccessSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First high note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    // Second higher note (success chord feeling)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.08); // E6
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.28);
  } catch {
    // AudioContext blocked or not supported
  }
}
