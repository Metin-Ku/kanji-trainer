import crypto from "node:crypto";
import argon2 from "argon2";
import {
  db,
  passwordResetTokensTable,
  sessionsTable,
  userRoles,
  usersTable,
  type UserRole,
  wordsTable,
  themesTable,
  categoriesTable,
  studyActivityTable,
} from "@workspace/db";
import { eq, isNull, sql } from "drizzle-orm";

export const SESSION_COOKIE = "kt_session";
export const SESSION_DAYS = 30;
export const RESET_TOKEN_HOURS = 1;

export type PublicUser = {
  id: number;
  email: string;
  role: UserRole;
  createdAt: string;
};

function toPublicUser(row: {
  id: number;
  email: string;
  role: string;
  createdAt: Date;
}): PublicUser {
  const role = (userRoles as readonly string[]).includes(row.role)
    ? (row.role as UserRole)
    : "user";
  return {
    id: row.id,
    email: row.email,
    role,
    createdAt: row.createdAt.toISOString(),
  };
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

export async function createUser(
  email: string,
  password: string,
  role: UserRole = "user",
): Promise<PublicUser> {
  const normalized = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  const [row] = await db
    .insert(usersTable)
    .values({ email: normalized, passwordHash, role })
    .returning();
  return toPublicUser(row!);
}

export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const [row] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalized))
    .limit(1);
  return row ?? null;
}

export async function createSession(userId: number): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = randomToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  );
  await db.insert(sessionsTable).values({ userId, tokenHash, expiresAt });
  return { token, expiresAt };
}

export async function refreshSession(sessionId: number): Promise<Date> {
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  );
  await db
    .update(sessionsTable)
    .set({ expiresAt })
    .where(eq(sessionsTable.id, sessionId));
  return expiresAt;
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.tokenHash, tokenHash));
}

export async function resolveSession(
  token: string | undefined,
): Promise<PublicUser | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const [session] = await db
    .select({
      sessionId: sessionsTable.id,
      expiresAt: sessionsTable.expiresAt,
      userId: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.tokenHash, tokenHash))
    .limit(1);

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db
      .delete(sessionsTable)
      .where(eq(sessionsTable.id, session.sessionId));
    return null;
  }

  await refreshSession(session.sessionId);
  return toPublicUser(session);
}

export async function createPasswordResetToken(
  userId: number,
): Promise<string> {
  const token = randomToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000,
  );
  await db.delete(passwordResetTokensTable).where(
    eq(passwordResetTokensTable.userId, userId),
  );
  await db.insert(passwordResetTokensTable).values({
    userId,
    tokenHash,
    expiresAt,
  });
  return token;
}

export async function consumePasswordResetToken(
  token: string,
): Promise<number | null> {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.tokenHash, tokenHash))
    .limit(1);
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  await db
    .delete(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.id, row.id));
  return row.userId;
}

export async function updateUserPassword(
  userId: number,
  password: string,
): Promise<void> {
  const passwordHash = await hashPassword(password);
  await db
    .update(usersTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
}

/** Assign legacy rows without user_id to the given user. */
export async function migrateOrphanDataToUser(userId: number): Promise<void> {
  await db
    .update(wordsTable)
    .set({ userId })
    .where(isNull(wordsTable.userId));
  await db
    .update(themesTable)
    .set({ userId })
    .where(isNull(themesTable.userId));
  await db
    .update(categoriesTable)
    .set({ userId })
    .where(isNull(categoriesTable.userId));
}

/** Ensure admin exists from env and legacy study_activity rows are assigned. */
export async function ensureBootstrapUser(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  let admin = adminEmail ? await findUserByEmail(adminEmail) : null;

  if (!admin && adminEmail && adminPassword) {
    admin = await db
      .insert(usersTable)
      .values({
        email: adminEmail,
        passwordHash: await hashPassword(adminPassword),
        role: "admin",
      })
      .returning()
      .then((rows) => rows[0]!);
  } else if (admin && adminEmail && admin.role !== "admin") {
    await db
      .update(usersTable)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(usersTable.id, admin.id));
    admin = { ...admin, role: "admin" };
  }

  const [anyUser] = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
  const ownerId = admin?.id ?? anyUser?.id;
  if (!ownerId) return;

  await migrateOrphanDataToUser(ownerId);

  // Legacy study_activity rows may lack user_id after schema change — handled by push + manual migration
  try {
    await db.execute(sql`
      UPDATE study_activity
      SET user_id = ${ownerId}
      WHERE user_id IS NULL
    `);
  } catch {
    // Column may already be NOT NULL after fresh push
  }
}
