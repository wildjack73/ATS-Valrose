import "server-only";
import MailComposer from "nodemailer/lib/mail-composer";
import {
  getMailer,
  getEmailFrom,
  getEmailAdmin,
  getEmailCoachPickleball,
} from "./client";
import { appendToSent } from "./imap-sent";
import {
  emailFamilleStage,
  emailAdminStage,
  emailFamilleEcole,
  emailAdminEcole,
  emailCoachPickleball,
  emailValidationEcole,
} from "./templates";
import { FORMULES, OPTIONS_F4 } from "@/lib/data/stages";
import { creneauLabel, f4SelectionLabel } from "@/lib/admin/format";
import type {
  InscriptionStageRow,
  InscriptionEcoleRow,
} from "@/lib/types/db";
import { COURS_TENNIS, COURS_PADEL, COURS_PICKLEBALL } from "@/lib/data/ecole";

/** Envoi best-effort : log les erreurs mais ne fait pas échouer la requête. */
async function safeSend(
  to: string,
  subject: string,
  html: string,
  text: string,
) {
  const mailer = getMailer();
  if (!mailer) {
    console.warn("[email] SMTP non configuré (SMTP_PASS absent), email skip:", subject);
    return;
  }
  const mailOptions = { from: getEmailFrom(), to, subject, html, text };
  try {
    await mailer.sendMail(mailOptions);
  } catch (e) {
    console.error("[email] exception envoi:", e);
    return;
  }
  // Copie dans le dossier « Envoyés » (best-effort, n'impacte pas l'envoi)
  try {
    const raw = await new Promise<Buffer>((resolve, reject) => {
      new MailComposer(mailOptions).compile().build((err, msg) =>
        err ? reject(err) : resolve(msg),
      );
    });
    await appendToSent(raw);
  } catch (e) {
    console.error("[email] copie Envoyés échouée:", e);
  }
}

export async function sendStageEmails(row: InscriptionStageRow) {
  const formule = FORMULES.find((f) => f.id === row.formule);
  const data = {
    prenom: row.prenom,
    nom: row.nom,
    email: row.email,
    telephone: row.telephone,
    semaine_label: row.semaine_label,
    formule_titre: formule?.titre ?? row.formule,
    creneau: creneauLabel(row.formule_creneau),
    dejeuner: !!row.formule_dejeuner,
    formule_4_detail:
      row.formule === "formule_4"
        ? f4SelectionLabel(row.formule_4_selection)
        : null,
    prix_total: row.prix_total,
  };

  const famille = emailFamilleStage(data);
  const admin = emailAdminStage(data);

  await Promise.all([
    safeSend(row.email, famille.subject, famille.html, famille.text),
    safeSend(getEmailAdmin(), admin.subject, admin.html, admin.text),
  ]);
}

/**
 * Email de CONFIRMATION d'inscription École, déclenché manuellement depuis
 * l'admin (bouton « Prévenir »). Contrairement à safeSend, renvoie un statut
 * pour que l'appelant ne marque « prévenu » que si l'email est réellement parti.
 */
export async function sendValidationEcole(
  row: InscriptionEcoleRow,
  dateReprise: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const cours: string[] = [];
  for (const id of row.cours_tennis ?? []) {
    cours.push(COURS_TENNIS.find((c) => c.id === id)?.label ?? id);
  }
  for (const id of row.cours_padel ?? []) {
    cours.push("Padel " + (COURS_PADEL.find((c) => c.id === id)?.label ?? id));
  }
  for (const id of row.cours_pickleball ?? []) {
    cours.push(COURS_PICKLEBALL.find((c) => c.id === id)?.label ?? id);
  }

  const mailer = getMailer();
  if (!mailer) return { ok: false, error: "SMTP non configuré (SMTP_PASS absent)" };

  const { subject, html, text } = emailValidationEcole({
    prenom: row.prenom,
    nom: row.nom,
    cours_resume: cours.join(", "),
    date_reprise: dateReprise,
  });
  const mailOptions = { from: getEmailFrom(), to: row.email, subject, html, text };

  try {
    await mailer.sendMail(mailOptions);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "envoi échoué" };
  }
  // Copie dans « Envoyés » (best-effort, n'impacte pas le résultat)
  try {
    const raw = await new Promise<Buffer>((resolve, reject) => {
      new MailComposer(mailOptions).compile().build((err, msg) =>
        err ? reject(err) : resolve(msg),
      );
    });
    await appendToSent(raw);
  } catch (e) {
    console.error("[email] copie Envoyés (validation) échouée:", e);
  }
  return { ok: true };
}

export async function sendEcoleEmails(row: InscriptionEcoleRow) {
  const cours: string[] = [];
  for (const id of row.cours_tennis ?? []) {
    cours.push(COURS_TENNIS.find((c) => c.id === id)?.label ?? id);
  }
  for (const id of row.cours_padel ?? []) {
    cours.push("Padel " + (COURS_PADEL.find((c) => c.id === id)?.label ?? id));
  }
  const pickleballCours: string[] = [];
  for (const id of row.cours_pickleball ?? []) {
    pickleballCours.push(
      COURS_PICKLEBALL.find((c) => c.id === id)?.label ?? id,
    );
  }
  cours.push(...pickleballCours);

  const data = {
    prenom: row.prenom,
    nom: row.nom,
    email: row.email,
    telephone: row.telephone,
    cours_resume: cours.join(", "),
    prix_total: row.prix_total ?? 0,
  };

  const famille = emailFamilleEcole(data);
  const admin = emailAdminEcole(data);

  const sends = [
    safeSend(row.email, famille.subject, famille.html, famille.text),
    safeSend(getEmailAdmin(), admin.subject, admin.html, admin.text),
  ];

  // Notifie le prof de Pickleball uniquement si un cours pickleball est pris.
  if (pickleballCours.length > 0) {
    const coach = emailCoachPickleball({
      prenom: row.prenom,
      nom: row.nom,
      email: row.email,
      telephone: row.telephone,
      cours_resume: pickleballCours.join(", "),
    });
    sends.push(
      safeSend(
        getEmailCoachPickleball(),
        coach.subject,
        coach.html,
        coach.text,
      ),
    );
  }

  await Promise.all(sends);
}
