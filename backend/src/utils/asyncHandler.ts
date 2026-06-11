import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Avvolge un handler async così che ogni reject venga inoltrato a next()
 * e raccolto dall'error middleware finale. Express 4 da solo non lo fa.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
