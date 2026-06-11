import rateLimit from 'express-rate-limit';
import { env } from '../lib/env';

const disabled = env.NODE_ENV === 'test';

// Soft globale: protegge da abuso generico
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => disabled,
  message: { error: 'Troppe richieste, riprova più tardi' },
});

// Severo su login/register per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => disabled,
  message: { error: 'Troppi tentativi di autenticazione, riprova tra 15 minuti' },
});

// Dedicato agli endpoint che chiamano l'AI (ogni chiamata costa)
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => disabled,
  message: { error: 'Limite di richieste AI raggiunto, riprova più tardi' },
});
