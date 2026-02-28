import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: number; username: string; is_admin: boolean };
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET || 'change-me';
  try {
    const payload = jwt.verify(token, secret) as { id: number; username: string; is_admin: boolean };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user?.is_admin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
