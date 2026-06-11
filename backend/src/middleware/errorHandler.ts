import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';
import { env } from '../lib/env';

/** Errore applicativo con status HTTP esplicito. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // HttpError esplicito
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Validazione Zod
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.flatten() });
    return;
  }

  // Errori Prisma noti
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Risorsa non trovata' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Conflitto: risorsa già esistente' });
      return;
    }
  }

  // Errore generico: logga tutto, espone poco
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  const message = env.NODE_ENV === 'production' ? 'Errore interno del server' : String((err as Error)?.message ?? err);
  res.status(500).json({ error: message });
}

/** Handler 404 per route non matchate. */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route non trovata: ${req.method} ${req.path}` });
}
