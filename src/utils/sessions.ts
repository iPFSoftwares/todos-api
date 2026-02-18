import crypto from "crypto";
import { Response } from "express";
import { AppDataSource } from "../data-source";
import { Session } from "../entity/Session";

const sessionRepo = () => AppDataSource.getRepository(Session);

export const SESSION_COOKIE_NAME = "sid";

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getSessionTtlMs() {
  const days = Number(process.env.SESSION_TTL_DAYS || 7);
  return days * 24 * 60 * 60 * 1000;
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:
      process.env.SESSION_COOKIE_SECURE === undefined
        ? process.env.NODE_ENV === "production"
        : process.env.SESSION_COOKIE_SECURE === "true",
    expires: expiresAt
  };
}

export async function createSession(userId: number, res: Response) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + getSessionTtlMs());

  const session = sessionRepo().create({ userId, tokenHash, expiresAt });
  await sessionRepo().save(session);

  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
  return session;
}

export async function clearSession(sessionId: number, res: Response) {
  await sessionRepo().delete({ id: sessionId });
  res.clearCookie(SESSION_COOKIE_NAME);
}
