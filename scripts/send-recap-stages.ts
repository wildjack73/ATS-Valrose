/**
 * Envoi d'un RÉCAPITULATIF d'inscription aux familles déjà inscrites aux
 * stages (saison active) — campagne de rattrapage après la bascule emails
 * vers SMTP Hostinger. 1 seul email par famille (regroupé par adresse),
 * listant tous les enfants / semaines / formules + total.
 *
 * Usage :
 *   npx tsx scripts/send-recap-stages.ts                 # DRY-RUN (n'envoie rien)
 *   npx tsx scripts/send-recap-stages.ts --commit        # envoie À TOUS les non encore contactés
 *   npx tsx scripts/send-recap-stages.ts --commit --limit 15   # n'envoie qu'aux 15 1res familles (warm-up)
 *   npx tsx scripts/send-recap-stages.ts --commit --delay 6000 # 6s entre chaque envoi
 *
 * Sécurité / réputation :
 *   - Idempotent : marque inscriptions_stages.recap_email_at ; ne renvoie jamais 2× à une famille.
 *   - Exclut emails manquants/placeholder (« a-completer ») et inscriptions désactivées.
 *   - Envoi séquentiel avec délai (défaut 4s) pour ménager la réputation + limites Hostinger.
 *   - Nécessite SMTP_PASS dans .env.local pour --commit (le DRY-RUN n'en a pas besoin).
 */
import { Client } from "pg";
import nodemailer from "nodemailer";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const COMMIT = process.argv.includes("--commit");
const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i >= 0 ? parseInt(process.argv[i + 1], 10) : Infinity;
})();
const DELAY = (() => {
  const i = process.argv.indexOf("--delay");
  return i >= 0 ? parseInt(process.argv[i + 1], 10) : 4000;
})();

const FROM = process.env.EMAIL_FROM ?? "ATS Valrose <contact@ats-valrose.fr>";

const FORMULES: Record<string, string> = {
  formule_1: "Formule 1 — Baby Tennis",
  formule_2: "Formule 2 — Demi-journée (3h)",
  formule_3: "Formule 3 — Journée complète",
  formule_4: "Formule 4 — À la carte",
};
function creneauLabel(c: string | null): string {
  if (c === "matin") return "matin";
  if (c === "apres_midi") return "après-midi";
  return "";
}
function escape(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Insc = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  semaine_label: string;
  formule: string;
  formule_creneau: string | null;
  formule_dejeuner: boolean;
  prix_total: number;
};

function buildEmail(famille: Insc[]) {
  const lignesTexte = famille.map((i) => {
    const cr = creneauLabel(i.formule_creneau);
    const dej = i.formule_dejeuner ? ", déjeuner inclus" : "";
    return `- ${i.prenom} ${i.nom} — ${i.semaine_label} — ${FORMULES[i.formule] ?? i.formule}${cr ? ` (${cr})` : ""}${dej} — ${i.prix_total}€`;
  });
  const total = famille.reduce((s, i) => s + (i.prix_total ?? 0), 0);

  const lignesHtml = famille
    .map((i) => {
      const cr = creneauLabel(i.formule_creneau);
      const dej = i.formule_dejeuner ? ", déjeuner inclus" : "";
      return `<p style="margin:6px 0"><strong>${escape(i.prenom)} ${escape(i.nom)}</strong> — ${escape(i.semaine_label)} — ${escape(FORMULES[i.formule] ?? i.formule)}${cr ? ` (${cr})` : ""}${dej} — <strong>${i.prix_total}€</strong></p>`;
    })
    .join("");

  const subject = "Confirmation de votre inscription — Stages ATS Valrose";

  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#0b2a45;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">
      <strong style="font-size:18px">ATS Valrose — Stages</strong>
    </div>
    <div style="background:#fff;padding:20px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 10px 10px">
      <p>Bonjour,</p>
      <p>Votre/vos inscription(s) à nos stages sont <strong>confirmées</strong>&nbsp;:</p>
      <div style="background:#f0f7fa;border-left:4px solid #2db5d6;padding:12px 16px;margin:16px 0">
        ${lignesHtml}
        <p style="margin:10px 0 0;border-top:1px solid #d9e6ec;padding-top:8px"><strong>Total à régler : ${total}€</strong></p>
      </div>
      <p>Le règlement (espèces ou chèque) se fait le jour du stage à l'accueil du club.</p>
      <p>Pour toute question ou modification : <a href="mailto:contact@ats-valrose.fr">contact@ats-valrose.fr</a> · Jérôme : 06 51 79 71 54</p>
      <p style="color:#6b7280;font-size:12px;margin-top:18px">Astuce : pour bien recevoir nos prochains messages, ajoutez <strong>contact@ats-valrose.fr</strong> à vos contacts (et vérifiez vos courriers indésirables).</p>
      <p style="color:#6b7280;font-size:13px;margin-top:14px">Sportivement,<br/>L'équipe ATS Valrose</p>
    </div>
  </div></body></html>`;

  const text = `Bonjour,

Votre/vos inscription(s) à nos stages sont confirmées :

${lignesTexte.join("\n")}

Total à régler : ${total}€

Le règlement (espèces ou chèque) se fait le jour du stage à l'accueil du club.
Pour toute question ou modification : contact@ats-valrose.fr · Jérôme : 06 51 79 71 54

Astuce : pour bien recevoir nos messages, ajoutez contact@ats-valrose.fr à vos contacts (et vérifiez vos spams).

Sportivement,
L'équipe ATS Valrose`;

  return { subject, html, text };
}

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const saison = (
    await client.query("select id,label from saisons where active=true and domaine='stages' limit 1")
  ).rows[0];
  if (!saison) { console.error("Aucune saison stages active."); process.exit(1); }

  const rows = (
    await client.query(
      `select id, nom, prenom, email, semaine_label, formule, formule_creneau,
              coalesce(formule_dejeuner,false) as formule_dejeuner, coalesce(prix_total,0) as prix_total
       from inscriptions_stages
       where saison_id=$1
         and coalesce(desactive,false)=false
         and recap_email_at is null
         and email is not null and email <> '' and email not ilike '%a-completer%'
       order by lower(email), created_at`,
      [saison.id],
    )
  ).rows as Insc[];

  // Regrouper par email (famille)
  const familles = new Map<string, Insc[]>();
  for (const r of rows) {
    const k = r.email.trim().toLowerCase();
    if (!familles.has(k)) familles.set(k, []);
    familles.get(k)!.push(r);
  }

  const liste = [...familles.entries()];
  console.log(`📧 Saison ${saison.label} — ${liste.length} famille(s) à contacter (${rows.length} inscriptions), délai ${DELAY}ms`);
  if (LIMIT !== Infinity) console.log(`   (limite ce lot : ${LIMIT} familles)`);

  // Aperçu (dry-run)
  const apercu = liste.slice(0, LIMIT);
  console.log("\n--- Destinataires ---");
  for (const [email, fam] of apercu) {
    const noms = fam.map((i) => `${i.prenom} ${i.nom} [${i.semaine_label.split("—").pop()?.trim() ?? i.semaine_label}]`).join(", ");
    const tot = fam.reduce((s, i) => s + i.prix_total, 0);
    console.log(`  ${email.padEnd(34)} ${fam.length} insc · ${tot}€ · ${noms}`);
  }

  if (!COMMIT) {
    console.log("\n--- Aperçu email (1re famille) ---");
    if (apercu[0]) console.log(buildEmail(apercu[0][1]).text);
    console.log("\n🔍 DRY-RUN — rien envoyé. Relance avec --commit (et --limit N pour un lot).\n");
    await client.end();
    return;
  }

  // Envoi réel
  const pass = process.env.SMTP_PASS;
  if (!pass) { console.error("❌ SMTP_PASS absent de .env.local — impossible d'envoyer."); process.exit(1); }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.hostinger.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: { user: process.env.SMTP_USER ?? "contact@ats-valrose.fr", pass },
  });

  let sent = 0, failed = 0;
  for (const [email, fam] of apercu) {
    const { subject, html, text } = buildEmail(fam);
    try {
      await transporter.sendMail({ from: FROM, to: email, replyTo: "contact@ats-valrose.fr", subject, html, text });
      await client.query(
        `update inscriptions_stages set recap_email_at = now() where id = any($1::uuid[])`,
        [fam.map((i) => i.id)],
      );
      sent++;
      console.log(`  ✅ ${email} (${fam.length} insc)`);
    } catch (e) {
      failed++;
      console.error(`  ❌ ${email} :`, e instanceof Error ? e.message : e);
    }
    if (DELAY > 0) await new Promise((r) => setTimeout(r, DELAY));
  }
  console.log(`\n✨ Terminé : ${sent} envoyé(s), ${failed} échec(s). Restant non contacté : ${liste.length - sent}`);
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
