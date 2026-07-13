import type { Request, Response, NextFunction } from "express";
import {
  resolveSession,
  SESSION_COOKIE,
  type PublicUser,
} from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

function readSessionToken(req: Request): string | undefined {
  const cookie = req.cookies?.[SESSION_COOKIE];
  return typeof cookie === "string" ? cookie : undefined;
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await resolveSession(readSessionToken(req));
    req.user = user ?? undefined;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await resolveSession(readSessionToken(req));
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function getUserId(req: Request): number {
  const id = req.user?.id;
  if (id == null) {
    throw new Error("Authenticated user id missing on request");
  }
  return id;
}
