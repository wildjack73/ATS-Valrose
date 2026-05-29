/**
 * Import des inscriptions stages ÉTÉ 2026 depuis l'ancien Google Form (CSV)
 * vers la table LIVE `inscriptions_stages` (saison active), comme si les
 * familles avaient saisi via le nouveau formulaire.
 *
 * Usage :
 *   npx tsx scripts/import-stages-2026.ts "<csv>"            # DRY-RUN (n'écrit rien)
 *   npx tsx scripts/import-stages-2026.ts "<csv>" --commit   # insère réellement
 *   npx tsx scripts/import-stages-2026.ts "<csv>" --reset    # supprime les lignes déjà importées puis ré-insère
 *
 * Règles (validées avec le client) :
 *  - Prix F1/F2/F3 : repris tel quel du libellé CSV (170€ et pas 180€).
 *  - F4 : option journée (option_3, 55€) par défaut, sauf si le niveau
 *    précise « Option 1/2 » → on applique celle-là. Repas F4 enregistré aussi.
 *  - Repas : « Semaine entière » = 35€ ; « X - 8 euros » = 8€/jour cité.
 *  - created_at = date d'inscription d'origine (colonne CSV).
 *  - Champs manquants (Chandesris) → placeholders « À compléter ».
 *  - Date naissance illisible/future → placeholder 2014-01-01.
 *  - Marqueur dans notes_admin pour traçabilité + idempotence (--reset).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { Client } from "pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const csvPath = process.argv[2];
const COMMIT = process.argv.includes("--commit");
const RESET = process.argv.includes("--reset");
if (!csvPath) {
  console.error('Usage : npx tsx scripts/import-stages-2026.ts "<csv>" [--commit|--reset]');
  process.exit(1);
}

const IMPORT_MARKER = "↪ Importé de l'ancien formulaire Google";

type Row = Record<string, string>;
const rows = parse(readFileSync(resolve(csvPath), "utf-8"), {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  relax_quotes: true,
  trim: true,
}) as Row[];

const JMAP: Record<string, string> = {
  lundi: "lundi", mardi: "mardi", mercredi: "mercredi", jeudi: "jeudi", vendredi: "vendredi",
};
function parseJours(s: string): string[] {
  if (!s) return [];
  return s.split(/[,;]/).map((x) => x.trim().toLowerCase()).map((x) => JMAP[x]).filter(Boolean);
}

function mapFormule(s: string): { code: string | null; creneau: string | null; prixCsv: number | null } {
  const t = s.toLowerCase();
  const m = t.match(/(\d+)\s*euros/);
  const prixCsv = m ? parseInt(m[1], 10) : null;
  if (t.includes("formule 1")) return { code: "formule_1", creneau: null, prixCsv };
  if (t.includes("formule 2")) {
    const creneau = /apr[eè]s/.test(t) ? "apres_midi" : t.includes("matin") ? "matin" : null;
    return { code: "formule_2", creneau, prixCsv };
  }
  if (t.includes("formule 3")) return { code: "formule_3", creneau: null, prixCsv };
  if (t.includes("formule 4")) return { code: "formule_4", creneau: null, prixCsv: null };
  return { code: null, creneau: null, prixCsv: null };
}

// Mapping libellé semaine CSV → code DB (vérifié sur la base)
const SEM_RX: { rx: RegExp; code: string }[] = [
  { rx: /29\/06.*03\/07/, code: "ete_juillet_1" },
  { rx: /06\/07.*10\/07/, code: "ete_juillet_2" },
  { rx: /13\/07.*17\/07/, code: "ete_juillet_3" },
  { rx: /20\/07.*24\/07/, code: "ete_juillet_4" },
  { rx: /27\/07.*31\/07/, code: "ete_juillet_5" },
  { rx: /03\/08.*07\/08/, code: "ete_aout_1" },
  { rx: /10\/08.*14\/08/, code: "ete_aout_2" },
  { rx: /17\/08.*21\/08/, code: "ete_aout_3" },
  { rx: /24\/08.*28\/08/, code: "ete_aout_4" },
];
function mapSemaineCode(s: string): string | null {
  for (const sm of SEM_RX) if (sm.rx.test(s)) return sm.code;
  return null;
}

/** "02/05/2021" → "2021-05-02" ; gère illisible/futur → placeholder. */
function parseNaissance(s: string): { iso: string; warn: string | null } {
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return { iso: "2014-01-01", warn: `date naissance illisible "${s}"` };
  const [, jj, mm, yyyy] = m;
  const an = parseInt(yyyy, 10);
  if (an >= 2026 || an <= 1910) return { iso: "2014-01-01", warn: `date naissance suspecte "${s}"` };
  return { iso: `${yyyy}-${mm.padStart(2, "0")}-${jj.padStart(2, "0")}`, warn: null };
}

/** "07/05/2026 16:58:56" → ISO timestamp, ou null si vide. */
function parseInscriptionDate(s: string): string | null {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, jj, mm, yyyy, hh, mi, ss] = m;
  return `${yyyy}-${mm}-${jj}T${hh}:${mi}:${ss}+02:00`;
}

function normTel(s: string): string {
  const raw = s.trim();
  if (!raw) return "À compléter";
  // "686283638" (9 chiffres sans 0) → "0686283638"
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^[67]\d{8}$/.test(digits)) return "0" + digits;
  return raw;
}

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // Saison active + ses semaines + options F4
  const saison = (await client.query("select id from saisons where active = true limit 1")).rows[0];
  if (!saison) { console.error("Aucune saison active."); process.exit(1); }
  const semRows = (
    await client.query(
      "select code, periode, label from semaines_stages where saison_id = $1",
      [saison.id],
    )
  ).rows as { code: string; periode: string; label: string }[];
  const semMap = new Map(semRows.map((s) => [s.code, s]));

  const optRows = (
    await client.query(
      "select code, prix from tarifs_options_f4 where saison_id = $1",
      [saison.id],
    )
  ).rows as { code: string; prix: number }[];
  const optPrix = new Map(optRows.map((o) => [o.code, o.prix]));
  const PRIX_DEJ_JOUR = 8;
  const PRIX_DEJ_SEMAINE = 35;

  type Rec = {
    nom: string; prenom: string; date_naissance: string;
    adresse: string; telephone: string; email: string;
    niveau: string | null; formule: string; formule_creneau: string | null;
    formule_dejeuner: boolean; dejeuner_jours: string[] | null;
    formule_4_selection: { jour: string; option: string }[] | null;
    semaine: string; semaine_label: string; prix_total: number;
    notes: string | null; notes_admin: string; created_at: string | null;
  };

  const recs: Rec[] = [];
  const warnings: string[] = [];

  rows.forEach((r, i) => {
    const ln = i + 2;
    const nom = (r["Nom"] ?? "").trim();
    const prenom = (r["Prénom"] ?? "").trim();
    if (!nom && !prenom) return; // ligne vide

    const { code: fCode, creneau, prixCsv } = mapFormule(r["formule"] ?? "");
    const semCode = mapSemaineCode(r["date"] ?? "");
    const niveau = (r["niveau"] ?? "").trim();
    const choixRepas = (r["choix repas"] ?? "").trim();
    const joursF4 = parseJours(r["date repas"] ?? "");
    const who = `L${ln} ${prenom} ${nom}`;

    if (!fCode) { warnings.push(`${who} : formule non reconnue → IGNORÉ`); return; }
    if (!semCode || !semMap.has(semCode)) { warnings.push(`${who} : semaine non reconnue → IGNORÉ`); return; }
    const sem = semMap.get(semCode)!;

    // --- Repas ---
    const tRepas = choixRepas.toLowerCase();
    let dejeunerJours: string[] | null = null;
    let prixDejeuner = 0;
    if (tRepas.includes("semaine") || tRepas.includes("35")) {
      dejeunerJours = fCode === "formule_4" && joursF4.length ? joursF4 : ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];
      prixDejeuner = PRIX_DEJ_SEMAINE;
    } else if (/\d?\s*-?\s*8\s*euros/.test(tRepas) || /(lundi|mardi|mercredi|jeudi|vendredi)/.test(tRepas)) {
      const j = parseJours(tRepas.replace(/-.*/, ""));
      if (j.length) { dejeunerJours = j; prixDejeuner = j.length * PRIX_DEJ_JOUR; }
    }

    // --- F4 : selection + option ---
    let f4sel: { jour: string; option: string }[] | null = null;
    const naissance = parseNaissance(r["date de naissance"] ?? "");
    if (naissance.warn) warnings.push(`${who} : ${naissance.warn} → placeholder 2014-01-01`);

    let prixTotal = 0;
    const notesAdminParts: string[] = [IMPORT_MARKER];

    if (fCode === "formule_4") {
      const om = niveau.toLowerCase().match(/option\s*([123])/);
      const optCode = om ? `option_${om[1]}` : "option_3";
      f4sel = joursF4.map((j) => ({ jour: j, option: optCode }));
      prixTotal = joursF4.reduce((s, _) => s + (optPrix.get(optCode) ?? 0), 0) + prixDejeuner;
      if (om) {
        notesAdminParts.push(`Formule 4 — Option ${om[1]} précisée par la famille.`);
      } else {
        // Option non fournie par l'ancien form → flag explicite à traiter
        notesAdminParts.push(
          "⚠ FORMULE 4 : OPTION À DÉFINIR (journée/Option 3 appliquée par défaut). À ajuster dans le back-office.",
        );
      }
      if (prixDejeuner > 0) notesAdminParts.push(`Repas : ${choixRepas} (+${prixDejeuner}€).`);
    } else {
      // F1/F2/F3 : prix repris du CSV + repas (F3)
      const base = prixCsv ?? 0;
      prixTotal = base + prixDejeuner;
    }

    // Placeholders champs obligatoires manquants
    const email = (r["MAIL"] ?? "").trim() || "a-completer@ats-valrose.fr";
    const adresse = (r["adresse"] ?? "").trim() || "À compléter";
    if (email === "a-completer@ats-valrose.fr") notesAdminParts.push("⚠ Email à compléter.");
    if (adresse === "À compléter") notesAdminParts.push("⚠ Adresse à compléter.");
    if (naissance.warn) notesAdminParts.push("⚠ Date de naissance à vérifier (placeholder).");

    recs.push({
      nom, prenom,
      date_naissance: naissance.iso,
      adresse,
      telephone: normTel(r["numéro de téléphone"] ?? ""),
      email,
      niveau: niveau || null,
      formule: fCode,
      formule_creneau: creneau,
      formule_dejeuner: prixDejeuner > 0,
      dejeuner_jours: dejeunerJours,
      formule_4_selection: f4sel,
      semaine: semCode,
      semaine_label: `${sem.periode} — ${sem.label}`,
      prix_total: prixTotal,
      notes: null,
      notes_admin: notesAdminParts.join(" "),
      created_at: parseInscriptionDate(r["date inscription"] ?? ""),
    });
  });

  // ===== Affichage dry-run =====
  console.log(`\n=== ${recs.length} inscriptions prêtes (saison active) ===\n`);
  let total = 0;
  for (const r of recs) {
    total += r.prix_total;
    const f4 = r.formule_4_selection
      ? ` [${r.formule_4_selection.map((x) => `${x.jour.slice(0, 3)}:${x.option.replace("option_", "O")}`).join(" ")}]`
      : "";
    const dej = r.formule_dejeuner ? ` +repas(${(r.dejeuner_jours ?? []).length}j)` : "";
    const cr = r.formule_creneau ? `/${r.formule_creneau.slice(0, 3)}` : "";
    const dt = r.created_at ? r.created_at.slice(0, 10) : "(sans date)";
    console.log(
      `${dt}  ${(r.prenom + " " + r.nom).padEnd(26).slice(0, 26)}  ` +
        `${r.formule}${cr}`.padEnd(18) +
        `${r.semaine}`.padEnd(15) +
        `${String(r.prix_total) + "€"}`.padStart(6) +
        f4 + dej,
    );
  }
  console.log(`\n💰 Total : ${total}€   ·   ${recs.length} inscriptions`);

  if (warnings.length) {
    console.log(`\n⚠️  ${warnings.length} avertissement(s) :`);
    for (const w of warnings) console.log("   • " + w);
  }

  if (!COMMIT && !RESET) {
    console.log("\n🔍 DRY-RUN — rien inséré. Relance avec --commit pour insérer.\n");
    await client.end();
    return;
  }

  if (RESET) {
    const del = await client.query(
      `delete from inscriptions_stages where notes_admin like $1`,
      [IMPORT_MARKER + "%"],
    );
    console.log(`\n🗑️  ${del.rowCount} ligne(s) importée(s) précédemment supprimée(s).`);
  }

  // ===== Insertion =====
  let inserted = 0;
  for (const r of recs) {
    await client.query(
      `insert into inscriptions_stages
        (saison_id, nom, prenom, date_naissance, adresse, telephone, email, niveau,
         formule, formule_creneau, formule_dejeuner, dejeuner_jours, formule_4_selection,
         semaine, semaine_label, prix_total, notes, notes_admin, statut, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'en_attente',
               coalesce($19::timestamptz, now()))`,
      [
        saison.id, r.nom, r.prenom, r.date_naissance, r.adresse, r.telephone, r.email, r.niveau,
        r.formule, r.formule_creneau, r.formule_dejeuner,
        r.dejeuner_jours ? JSON.stringify(r.dejeuner_jours) : null,
        r.formule_4_selection ? JSON.stringify(r.formule_4_selection) : null,
        r.semaine, r.semaine_label, r.prix_total, r.notes, r.notes_admin, r.created_at,
      ],
    );
    inserted++;
  }
  console.log(`\n✅ ${inserted} inscriptions insérées dans inscriptions_stages.\n`);
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
