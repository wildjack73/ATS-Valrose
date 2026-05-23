import "server-only";
import { Resend } from "resend";

let cached: Resend | null = null;

/**
 * Retourne null si Resend n'est pas configuré (les emails seront silencieusement skip).
 * Utile en dev local sans clé API.
 */
export function getResend(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM ?? "ATS Valrose <contact@ats-valrose.fr>";
}

export function getEmailAdmin(): string {
  return process.env.EMAIL_TO_NOTIFICATIONS ?? "contact@ats-valrose.fr";
}
