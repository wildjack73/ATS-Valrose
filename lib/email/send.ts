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
  emailValidationStage,
} from "./templates";
import { FORMULES, OPTIONS_F4 } from "@/lib/data/stages";
import { creneauLabel, f4SelectionLabel } from "@/lib/admin/format";
import type {
  InscriptionStageRow,
  InscriptionEcoleRow,
} from "@/lib/types/db";
import { COURS_TENNIS, COURS_PADEL, COURS_PICKLEBALL } from "@/lib/data/ecole";
import { getActiveSaison } from "@/lib/data/tarifs-server";
import { fetchHorairesEcole } from "@/lib/data/horaires-ecole-server";
import { horaireFor, horaireOptionsFor } from "@/lib/data/horaires-ecole";

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

  // Horaires exacts saisis en admin (best-effort) : on enrichit chaque créneau
  // avec « (9h00 - 10h00) » quand un horaire existe pour ce cours × créneau.
  let horaires: Record<string, string> = {};
  try {
    const saisonId =
      (row as { saison_id?: string | null }).saison_id ||
      (await getActiveSaison("ecole"))?.id;
    if (saisonId) horaires = await fetchHorairesEcole(saisonId);
  } catch {
    /* pas bloquant */
  }
  const coursTennisCodes = (row.cours_tennis ?? []) as string[];
  const dispoLabels = [row.dispo_mercredi, row.dispo_samedi, row.dispo_semaine]
    .filter((x): x is string => Boolean(x && x.trim()))
    .flatMap((s) => s.split(",").map((x) => x.trim()).filter(Boolean));
  const creneaux = dispoLabels
    .map((label) => {
      let h = "";
      for (const code of coursTennisCodes) {
        h = horaireFor(horaires, code, label);
        if (h) break;
      }
      return h ? `${label} (${h})` : label;
    })
    .join(", ");

  // Horaire affiché : 1) l'horaire confirmé (menu admin) prime ; 2) sinon, s'il
  // n'existe qu'UN seul horaire possible, on l'utilise ; 3) sinon, la liste.
  const options = horaireOptionsFor(horaires, coursTennisCodes, dispoLabels);
  const creneauxFinal =
    row.horaire_confirme && row.horaire_confirme.trim()
      ? row.horaire_confirme.trim()
      : options.length === 1
        ? options[0]
        : creneaux;

  const { subject, html, text } = emailValidationEcole({
    prenom: row.prenom,
    nom: row.nom,
    cours_resume: cours.join(", "),
    creneaux: creneauxFinal,
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

/** Email de CONFIRMATION d'inscription STAGE, déclenché depuis l'admin
 *  (bouton « Prévenir »). Renvoie un statut (ne marque prévenu que si OK). */
export async function sendValidationStage(
  row: InscriptionStageRow,
): Promise<{ ok: boolean; error?: string }> {
  const mailer = getMailer();
  if (!mailer) return { ok: false, error: "SMTP non configuré (SMTP_PASS absent)" };

  const formule = FORMULES.find((f) => f.id === row.formule);
  const { subject, html, text } = emailValidationStage({
    prenom: row.prenom,
    nom: row.nom,
    semaine_label: row.semaine_label,
    formule_titre: formule?.titre ?? row.formule,
    creneau: creneauLabel(row.formule_creneau),
    dejeuner: !!row.formule_dejeuner,
    formule_4_detail:
      row.formule === "formule_4"
        ? f4SelectionLabel(row.formule_4_selection)
        : null,
  });
  const mailOptions = { from: getEmailFrom(), to: row.email, subject, html, text };

  try {
    await mailer.sendMail(mailOptions);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "envoi échoué" };
  }
  try {
    const raw = await new Promise<Buffer>((resolve, reject) => {
      new MailComposer(mailOptions).compile().build((err, msg) =>
        err ? reject(err) : resolve(msg),
      );
    });
    await appendToSent(raw);
  } catch (e) {
    console.error("[email] copie Envoyés (validation stage) échouée:", e);
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
