import "server-only";
import MailComposer from "nodemailer/lib/mail-composer";
import { getMailer, getEmailFrom, getEmailAdmin } from "./client";
import { appendToSent } from "./imap-sent";
import {
  emailFamilleStage,
  emailAdminStage,
  emailFamilleEcole,
  emailAdminEcole,
} from "./templates";
import { FORMULES, OPTIONS_F4 } from "@/lib/data/stages";
import { creneauLabel, f4SelectionLabel } from "@/lib/admin/format";
import type {
  InscriptionStageRow,
  InscriptionEcoleRow,
} from "@/lib/types/db";
import { COURS_TENNIS, COURS_PADEL } from "@/lib/data/ecole";

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

export async function sendEcoleEmails(row: InscriptionEcoleRow) {
  const cours: string[] = [];
  for (const id of row.cours_tennis ?? []) {
    cours.push(COURS_TENNIS.find((c) => c.id === id)?.label ?? id);
  }
  for (const id of row.cours_padel ?? []) {
    cours.push("Padel " + (COURS_PADEL.find((c) => c.id === id)?.label ?? id));
  }

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

  await Promise.all([
    safeSend(row.email, famille.subject, famille.html, famille.text),
    safeSend(getEmailAdmin(), admin.subject, admin.html, admin.text),
  ]);
}
