import "server-only";

/**
 * Templates HTML simples (inline-styled) pour les emails de confirmation.
 * Le HTML doit rester très basique pour passer les filtres anti-spam.
 */

type StageEmailData = {
  prenom: string;
  nom: string;
  semaine_label: string;
  formule_titre: string;
  creneau?: string | null;
  dejeuner: boolean;
  formule_4_detail?: string | null;
  prix_total: number;
};

export function emailFamilleStage(d: StageEmailData) {
  const subject = `Confirmation inscription stage — ${d.prenom} ${d.nom}`;
  const detailsHtml = [
    `<strong>Élève :</strong> ${escape(d.prenom)} ${escape(d.nom)}`,
    `<strong>Semaine :</strong> ${escape(d.semaine_label)}`,
    `<strong>Formule :</strong> ${escape(d.formule_titre)}`,
    d.creneau
      ? `<strong>Créneau :</strong> ${escape(d.creneau)}`
      : null,
    d.dejeuner ? `<strong>Déjeuner inclus :</strong> Oui` : null,
    d.formule_4_detail
      ? `<strong>Détail :</strong> ${escape(d.formule_4_detail)}`
      : null,
    `<strong>Total à régler :</strong> ${d.prix_total}€`,
  ]
    .filter(Boolean)
    .map((l) => `<p style="margin:6px 0">${l}</p>`)
    .join("");

  const html = wrap(
    `Inscription au stage confirmée — ATS Valrose`,
    `
      <p>Bonjour,</p>
      <p>Votre inscription au stage est <strong>confirmée et acceptée</strong>&nbsp;:</p>
      <div style="background:#f0f7fa;border-left:4px solid #2db5d6;padding:12px 16px;margin:16px 0">
        ${detailsHtml}
      </div>
      <p>Le règlement (espèces ou chèque) se fait le jour du stage à l'accueil du club.</p>
      <p>Pour toute question&nbsp;: <a href="mailto:contact@ats-valrose.fr">contact@ats-valrose.fr</a> · <a href="mailto:padelnice@gmail.com">padelnice@gmail.com</a></p>
      <p style="color:#666;font-size:13px">Sportivement,<br/>L'équipe ATS Valrose</p>
    `,
  );

  const text = `Bonjour,

Votre inscription au stage est confirmée et acceptée :

- Élève : ${d.prenom} ${d.nom}
- Semaine : ${d.semaine_label}
- Formule : ${d.formule_titre}${d.creneau ? `\n- Créneau : ${d.creneau}` : ""}${
    d.dejeuner ? `\n- Déjeuner inclus : Oui` : ""
  }${d.formule_4_detail ? `\n- Détail : ${d.formule_4_detail}` : ""}
- Total à régler : ${d.prix_total}€

Le règlement se fait le jour du stage à l'accueil du club.

Pour toute question : contact@ats-valrose.fr · padelnice@gmail.com

Sportivement,
L'équipe ATS Valrose`;

  return { subject, html, text };
}

export function emailAdminStage(d: StageEmailData & { email: string; telephone: string }) {
  const subject = `Nouvelle inscription stage — ${d.prenom} ${d.nom} (${d.semaine_label})`;
  const html = wrap(
    `Nouvelle inscription stage`,
    `
      <p><strong>${escape(d.prenom)} ${escape(d.nom)}</strong> s'est inscrit au stage&nbsp;:</p>
      <ul>
        <li>Semaine : ${escape(d.semaine_label)}</li>
        <li>Formule : ${escape(d.formule_titre)}</li>
        ${d.creneau ? `<li>Créneau : ${escape(d.creneau)}</li>` : ""}
        ${d.dejeuner ? "<li>Déjeuner inclus</li>" : ""}
        ${d.formule_4_detail ? `<li>Détail : ${escape(d.formule_4_detail)}</li>` : ""}
        <li>Total : <strong>${d.prix_total}€</strong></li>
        <li>Email : ${escape(d.email)}</li>
        <li>Téléphone : ${escape(d.telephone)}</li>
      </ul>
      <p><a href="https://ats-valrose.fr/admin">→ Voir toutes les inscriptions</a></p>
    `,
  );
  const text = `Nouvelle inscription stage

${d.prenom} ${d.nom}
Semaine : ${d.semaine_label}
Formule : ${d.formule_titre}${d.creneau ? `\nCréneau : ${d.creneau}` : ""}
Total : ${d.prix_total}€
Email : ${d.email}
Téléphone : ${d.telephone}

Voir : https://ats-valrose.fr/admin`;
  return { subject, html, text };
}

type EcoleEmailData = {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  cours_resume: string;
  prix_total: number;
};

export function emailFamilleEcole(d: EcoleEmailData) {
  const subject = `Confirmation de pré-inscription — École de Tennis — ${d.prenom} ${d.nom}`;
  const html = wrap(
    `Pré-inscription École de Tennis enregistrée`,
    `
      <p>Bonjour,</p>
      <p>Nous avons bien reçu la <strong>pré-inscription</strong> de <strong>${escape(d.prenom)} ${escape(
        d.nom,
      )}</strong> à l'École de Tennis 2026-2027.</p>
      ${d.cours_resume ? `<p><strong>Cours demandés :</strong> ${escape(d.cours_resume)}</p>` : ""}
      ${d.prix_total > 0 ? `<p><strong>Total annuel :</strong> ${d.prix_total}€</p>` : ""}
      <p>Il s'agit d'une pré-inscription. La <strong>confirmation définitive</strong> se fera lors de votre passage aux <strong>Journées Portes Ouvertes</strong> — toutes les infos&nbsp;: <a href="https://www.ats-valrose.fr/ecole?public=jeunes">ats-valrose.fr/ecole</a></p>
      <p>Pour toute question&nbsp;: <a href="mailto:contact@ats-valrose.fr">contact@ats-valrose.fr</a> · <a href="mailto:padelnice@gmail.com">padelnice@gmail.com</a></p>
      <p style="color:#666;font-size:13px">Sportivement,<br/>L'équipe ATS Valrose</p>
    `,
  );
  const text = `Bonjour,

Nous avons bien reçu la pré-inscription de ${d.prenom} ${d.nom} à l'École de Tennis 2026-2027.
${d.cours_resume ? `\nCours demandés : ${d.cours_resume}` : ""}${d.prix_total > 0 ? `\nTotal annuel : ${d.prix_total}€` : ""}

Il s'agit d'une pré-inscription. La confirmation définitive se fera lors de votre passage aux Journées Portes Ouvertes — toutes les infos : https://www.ats-valrose.fr/ecole?public=jeunes

Pour toute question : contact@ats-valrose.fr · padelnice@gmail.com

Sportivement,
L'équipe ATS Valrose`;
  return { subject, html, text };
}

export function emailAdminEcole(d: EcoleEmailData) {
  const subject = `Nouvelle inscription École — ${d.prenom} ${d.nom}`;
  const html = wrap(
    `Nouvelle inscription École de Tennis`,
    `
      <p><strong>${escape(d.prenom)} ${escape(d.nom)}</strong> s'est inscrit à l'École de Tennis.</p>
      <ul>
        ${d.cours_resume ? `<li>Cours : ${escape(d.cours_resume)}</li>` : ""}
        ${d.prix_total > 0 ? `<li>Total : <strong>${d.prix_total}€</strong></li>` : ""}
        <li>Email : ${escape(d.email)}</li>
        <li>Téléphone : ${escape(d.telephone)}</li>
      </ul>
      <p><a href="https://ats-valrose.fr/admin?tab=ecole">→ Voir toutes les inscriptions</a></p>
    `,
  );
  const text = `Nouvelle inscription École

${d.prenom} ${d.nom}
${d.cours_resume ? `Cours : ${d.cours_resume}\n` : ""}${d.prix_total > 0 ? `Total : ${d.prix_total}€\n` : ""}Email : ${d.email}
Téléphone : ${d.telephone}

Voir : https://ats-valrose.fr/admin?tab=ecole`;
  return { subject, html, text };
}

/** Email de CONFIRMATION d'inscription École (envoyé après validation par le
 *  club, suite aux journées portes ouvertes). Déclenché manuellement depuis
 *  l'admin (bouton « Prévenir »). */
export function emailValidationEcole(d: {
  prenom: string;
  nom: string;
  cours_resume: string;
  date_reprise: string | null;
}) {
  const subject = `Inscription confirmée — École ATS Valrose — ${d.prenom} ${d.nom}`;
  const html = wrap(
    `Inscription confirmée`,
    `
      <p>Bonjour,</p>
      <p>Bonne nouvelle&nbsp;: l'inscription de <strong>${escape(d.prenom)} ${escape(
        d.nom,
      )}</strong> à l'ATS Valrose pour la saison 2026-2027 est <strong>confirmée</strong>&nbsp;✅.</p>
      ${d.cours_resume ? `<p><strong>Cours&nbsp;:</strong> ${escape(d.cours_resume)}</p>` : ""}
      ${
        d.date_reprise
          ? `<p>🎾 <strong>Reprise des cours&nbsp;:</strong> ${escape(d.date_reprise)}.</p>`
          : ""
      }
      <p>Le règlement (espèces ou chèque) se fait à l'accueil du club. Le créneau
      définitif vous sera confirmé par le club.</p>
      <p>Pour toute question&nbsp;: <a href="mailto:contact@ats-valrose.fr">contact@ats-valrose.fr</a> · <a href="mailto:padelnice@gmail.com">padelnice@gmail.com</a></p>
      <p style="color:#666;font-size:13px">Sportivement,<br/>L'équipe ATS Valrose</p>
    `,
  );
  const text = `Bonjour,

Bonne nouvelle : l'inscription de ${d.prenom} ${d.nom} à l'ATS Valrose pour la saison 2026-2027 est confirmée.
${d.cours_resume ? `\nCours : ${d.cours_resume}` : ""}${d.date_reprise ? `\nReprise des cours : ${d.date_reprise}` : ""}

Le règlement (espèces ou chèque) se fait à l'accueil du club. Le créneau définitif vous sera confirmé par le club.

Pour toute question : contact@ats-valrose.fr · padelnice@gmail.com

Sportivement,
L'équipe ATS Valrose`;
  return { subject, html, text };
}

export function emailCoachPickleball(d: {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  cours_resume: string;
}) {
  const subject = `Nouvelle inscription Pickleball — ${d.prenom} ${d.nom}`;
  const html = wrap(
    `Nouvelle inscription Pickleball`,
    `
      <p><strong>${escape(d.prenom)} ${escape(d.nom)}</strong> vient de s'inscrire au cours de <strong>Pickleball</strong>.</p>
      <ul>
        ${d.cours_resume ? `<li>Cours : ${escape(d.cours_resume)}</li>` : ""}
        <li>Email : <a href="mailto:${escape(d.email)}">${escape(d.email)}</a></li>
        <li>Téléphone : ${escape(d.telephone)}</li>
      </ul>
      <p style="color:#666;font-size:13px">Vous recevez cet email automatiquement en tant que responsable du cours Pickleball de l'ATS Valrose.</p>
    `,
  );
  const text = `Nouvelle inscription Pickleball

${d.prenom} ${d.nom}
${d.cours_resume ? `Cours : ${d.cours_resume}\n` : ""}Email : ${d.email}
Téléphone : ${d.telephone}

Vous recevez cet email automatiquement en tant que responsable du cours Pickleball de l'ATS Valrose.`;
  return { subject, html, text };
}

function wrap(title: string, body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#f7fbfd;font-family:Arial,sans-serif;color:#1a1a1a">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fbfd;padding:24px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <tr><td style="background:#0d2e3f;padding:16px 24px;color:#fff;font-weight:bold">
          ATS&nbsp;VALROSE
        </td></tr>
        <tr><td style="padding:24px;font-size:15px;line-height:1.55">${body}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
