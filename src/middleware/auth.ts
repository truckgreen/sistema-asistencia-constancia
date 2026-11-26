import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { verifySessionToken } from '../lib/security.ts';
import { type DbUserRow, getOrCreateGoogleUser, getUserById } from '../db/queries.ts';

export interface AuthRequest extends Request {
  authUser?: DbUserRow;
  firebaseUid?: string;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: falta token de sesión.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'No autorizado: token vacío.' });
  }

  // 1. Check server-signed session token (issued for usuario/contraseña logins)
  const session = verifySessionToken(token);
  if (session) {
    try {
      const dbUser = await getUserById(session.userId);
      if (!dbUser) {
        return res.status(401).json({ error: 'Sesión inválida: usuario no encontrado.' });
      }
      req.authUser = dbUser;
      return next();
    } catch {
      return res.status(500).json({ error: 'Error al validar la sesión.' });
    }
  }

  // 2. Otherwise verify Firebase ID Token if Firebase Admin is configured
  if (!adminAuth) {
    return res.status(401).json({ error: 'Sesión expirada o token inválido.' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email) {
      return res.status(401).json({ error: 'La cuenta de Google no tiene correo verificado.' });
    }
    const dbUser = await getOrCreateGoogleUser(decoded.uid, decoded.email, decoded.name);
    req.authUser = dbUser;
    req.firebaseUid = decoded.uid;
    return next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Sesión expirada o token inválido.' });
  }
};

export const requireDirectivo = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.authUser || req.authUser.rol !== 'directivo') {
    return res.status(403).json({ error: 'Acceso restringido a Dirección.' });
  }
  return next();
};
