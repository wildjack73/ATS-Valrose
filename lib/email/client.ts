import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let cached: Transporter | null = null;

/**
 * Transporteur SMTP (boîte Hostinger contact@ats-valrose.fr).
 *
 * Variables d'environnement :
 *  - SMTP_PASS   (OBLIGATOIRE) — mot de passe de la boîte mail. Sans lui,
 *                 les emails sont silencieusement ignorés (utile en dev local).
 *  - SMTP_USER   — adresse de la boîte (défaut : contact@ats-valrose.fr).
 *  - SMTP_HOST   — serveur SMTP   (défaut : smtp.hostinger.com).
 *  - SMTP_PORT   — port SMTP      (défaut : 465 = SSL).
 *
 * Retourne null si SMTP_PASS est absent → envoi skip sans planter.
 */
export function getMailer(): Transporter | null {
  if (cached) return cached;
  const pass = process.env.SMTP_PASS;
  if (!pass) return null;

  const user = process.env.SMTP_USER ?? "contact@ats-valrose.fr";
  const host = process.env.SMTP_HOST ?? "smtp.hostinger.com";
  const port = Number(process.env.SMTP_PORT ?? 465);

  cached = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // SSL implicite sur 465 ; STARTTLS sur 587
    auth: { user, pass },
  });
  return cached;
}

/**
 * Adresse expéditrice. DOIT correspondre à la boîte authentifiée côté
 * Hostinger (sinon relais refusé). Par défaut = la boîte du club.
 */
export function getEmailFrom(): string {
  return process.env.EMAIL_FROM ?? "ATS Valrose <contact@ats-valrose.fr>";
}

export function getEmailAdmin(): string {
  return process.env.EMAIL_TO_NOTIFICATIONS ?? "contact@ats-valrose.fr";
}

/** Prof de Pickleball, notifié à chaque inscription incluant ce cours.
 *  Surchargeable via EMAIL_COACH_PICKLEBALL. */
export function getEmailCoachPickleball(): string {
  return process.env.EMAIL_COACH_PICKLEBALL ?? "Bo.dollet@orange.fr";
}
