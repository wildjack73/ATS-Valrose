import "server-only";
import { ImapFlow } from "imapflow";

/**
 * Dépose une copie d'un email envoyé dans le dossier « Envoyés » de la boîte
 * Hostinger, via IMAP APPEND. Best-effort : toute erreur est avalée (ne doit
 * jamais faire échouer l'envoi SMTP).
 *
 * Réutilise les identifiants SMTP (même boîte). IMAP_HOST par défaut =
 * imap.hostinger.com. Ne fait rien si SMTP_PASS est absent.
 */
export async function appendToSent(raw: Buffer | string): Promise<void> {
  const pass = process.env.SMTP_PASS;
  if (!pass) return;

  const client = new ImapFlow({
    host: process.env.IMAP_HOST ?? "imap.hostinger.com",
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: true,
    auth: { user: process.env.SMTP_USER ?? "contact@ats-valrose.fr", pass },
    logger: false,
    // évite de bloquer l'invocation serverless trop longtemps
    socketTimeout: 15000,
  });

  try {
    await client.connect();
    // Trouver le bon dossier « Envoyés » : d'abord le special-use \Sent,
    // sinon un nom courant.
    let target = "Sent";
    try {
      const boxes = await client.list();
      const special = boxes.find((b) => b.specialUse === "\\Sent");
      if (special) {
        target = special.path;
      } else {
        const names = new Set(boxes.map((b) => b.path));
        target =
          ["INBOX.Sent", "Sent", "Sent Items", "INBOX.Sent Items", "Envoyés"].find(
            (n) => names.has(n),
          ) ?? "Sent";
      }
    } catch {
      // garde "Sent" par défaut
    }
    await client.append(target, raw, ["\\Seen"]);
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }
}
