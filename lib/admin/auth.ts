import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "ats_admin_session";
const MAX_AGE = 60 * 60 * 8; // 8 heures

function getSecret(): string {
  const s = process.env.ADMIN_PASSWORD;
  if (!s) {
    throw new Error("ADMIN_PASSWORD non défini.");
  }
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

/**
 * Vérifie un mot de passe candidat contre ADMIN_PASSWORD en constant-time.
 */
export function checkAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createAdminSession(): Promise<void> {
  const token = sign("admin");
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const jar = await cookies();
    const cookie = jar.get(COOKIE_NAME)?.value;
    if (!cookie) return false;
    const expected = sign("admin");
    const a = Buffer.from(cookie);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
