import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { verifySessionToken } from '../lib/auth-crypto.ts';
import { findUserByEmail, findUserById, findUserByUid } from '../db/queries.ts';
import type { Usuario } from '../types/index.ts';

export interface AuthRequest extends Request {
  authUser?: Usuario;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: token faltante.' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'No autorizado: token vacío.' });
  }

  try {
    // 1. Check signed server session token
    const session = verifySessionToken(token);
    if (session) {
      const dbUser = await findUserById(session.userId);
      if (!dbUser) {
        return res.status(401).json({ error: 'Sesión inválida: usuario no encontrado.' });
      }
      req.authUser = dbUser;
      return next();
    }

    // 2. Fallback: verify Firebase Auth ID token
    const decodedToken = await adminAuth.verifyIdToken(token);
    let dbUser = await findUserByUid(decodedToken.uid);
    if (!dbUser && decodedToken.email) {
      dbUser = await findUserByEmail(decodedToken.email);
    }
    if (!dbUser) {
      return res.status(401).json({ error: 'Usuario de Google no registrado en la institución.' });
    }
    req.authUser = dbUser;
    return next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(401).json({ error: 'No autorizado: sesión expirada o inválida.' });
  }
};

export const requireDirectivo = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.authUser || req.authUser.rol !== 'directivo') {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de Dirección.' });
  }
  return next();
};
