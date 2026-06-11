import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'crypto';
import { env } from './env';

const ACCESS_SECRET = env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;

export const REFRESH_TTL_DAYS = 30;

/** SHA-256 del token: nel DB salviamo solo l'hash, mai il token in chiaro. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function signAccess(userId: string) {
  return jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: '15m' });
}

export function signRefresh(userId: string) {
  // jti random: garantisce che ogni refresh token sia unico anche se firmato
  // nello stesso secondo (altrimenti hash identico → viola l'unique nel DB).
  return jwt.sign({ sub: userId, jti: randomUUID() }, REFRESH_SECRET, { expiresIn: '30d' });
}

export function verifyAccess(token: string): { sub: string } {
  return jwt.verify(token, ACCESS_SECRET) as { sub: string };
}

export function verifyRefresh(token: string): { sub: string } {
  return jwt.verify(token, REFRESH_SECRET) as { sub: string };
}
