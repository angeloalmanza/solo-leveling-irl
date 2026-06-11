import jwt from 'jsonwebtoken';
import { env } from './env';

const ACCESS_SECRET = env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;

export function signAccess(userId: string) {
  return jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: '15m' });
}

export function signRefresh(userId: string) {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: '30d' });
}

export function verifyAccess(token: string): { sub: string } {
  return jwt.verify(token, ACCESS_SECRET) as { sub: string };
}

export function verifyRefresh(token: string): { sub: string } {
  return jwt.verify(token, REFRESH_SECRET) as { sub: string };
}
