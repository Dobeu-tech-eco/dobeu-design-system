import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFound(message = "Not found"): HttpError {
  return new HttpError(404, message);
}

export function badRequest(message: string): HttpError {
  return new HttpError(400, message);
}

/** 422 — the source was reachable but analysis/generation could not complete. */
export function unprocessable(message: string): HttpError {
  return new HttpError(422, message);
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    res.end();
    return;
  }
  if (err instanceof HttpError) {
    req.log?.warn({ status: err.status, msg: err.message }, "request failed");
    res.status(err.status).json({ error: err.message });
    return;
  }
  // Zod validation failures (duck-typed to tolerate multiple zod instances).
  const zerr = err as { name?: string; issues?: { path?: (string | number)[]; message?: string }[] };
  if (zerr?.name === "ZodError" && Array.isArray(zerr.issues)) {
    const first = zerr.issues[0];
    const where = first?.path?.length ? first.path.join(".") : "body";
    req.log?.warn({ issues: zerr.issues.slice(0, 5) }, "validation failed");
    res.status(400).json({ error: `Invalid request: ${where} — ${first?.message ?? "validation failed"}` });
    return;
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  req.log?.error({ err }, "unhandled error");
  res.status(500).json({ error: message });
}
