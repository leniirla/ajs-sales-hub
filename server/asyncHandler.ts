import type { NextFunction, Request, RequestHandler, Response } from 'express';

// Express 4 does not catch rejected promises thrown inside async route
// handlers — an unhandled rejection reaches the Node process and crashes
// the whole server (confirmed: PUT /api/invoices/:id with a non-existent id
// threw Prisma's P2025 and took the entire API down for every user). Wrapping
// every async handler with this forwards the error to the error-handling
// middleware in server/index.ts instead of crashing the process.
export const asyncHandler = <Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req as Req, res, next)).catch(next);
};
