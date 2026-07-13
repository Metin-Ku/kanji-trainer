import { Router } from "express";
import {
  createPasswordResetToken,
  createSession,
  createUser,
  consumePasswordResetToken,
  deleteSessionByToken,
  findUserByEmail,
  resolveSession,
  readSessionTokenFromRequest,
  SESSION_COOKIE,
  SESSION_DAYS,
  updateUserPassword,
  verifyPassword,
} from "../lib/auth";
import { sendPasswordResetEmail } from "../lib/email";
import { requireAuth } from "../middleware/auth";
import { primaryFrontendOrigin } from "../lib/corsOrigins";
import type { Request } from "express";

const router = Router();

function sessionCookieOptions(expiresAt: Date) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
}

function frontendBaseUrl(req?: Request): string {
  const origin = req?.headers.origin?.replace(/\/+$/, "");
  if (origin) return origin;
  return primaryFrontendOrigin();
}

router.post("/auth/register", async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!email.trim() || password.length < 8) {
      res.status(400).json({ error: "Email and password (min 8 chars) required" });
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const user = await createUser(email, password);
    const { token, expiresAt } = await createSession(user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    const row = await findUserByEmail(email);
    if (!row || !(await verifyPassword(password, row.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const { token, expiresAt } = await createSession(row.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    res.json({
      user: {
        id: row.id,
        email: row.email,
        role: row.role,
        createdAt: row.createdAt.toISOString(),
      },
      token,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/logout", async (req, res, next) => {
  try {
    const token = readSessionTokenFromRequest(req);
    if (token) {
      await deleteSessionByToken(token);
    }
    res.clearCookie(SESSION_COOKIE, {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/auth/me", async (req, res, next) => {
  try {
    const token = readSessionTokenFromRequest(req);
    const user = await resolveSession(token);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/forgot-password", async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const row = await findUserByEmail(email);

    // Always return success to avoid email enumeration
    if (row) {
      const token = await createPasswordResetToken(row.id);
      const resetUrl = `${frontendBaseUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail(row.email, resetUrl);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/reset-password", async (req, res, next) => {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!token || password.length < 8) {
      res.status(400).json({ error: "Token and password (min 8 chars) required" });
      return;
    }

    const userId = await consumePasswordResetToken(token);
    if (!userId) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    await updateUserPassword(userId, password);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/auth/profile", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
