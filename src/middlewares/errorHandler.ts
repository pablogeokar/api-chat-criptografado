import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      issues: error.issues,
    });
  }

  console.error(error);
  return res.status(500).json({ error: 'Internal server error' });
}