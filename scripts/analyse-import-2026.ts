/**
 * ANALYSE EN LECTURE SEULE du CSV d'inscriptions stages 2026 (ancien Google
 * Forms). N'écrit RIEN en base. Sert à catégoriser les lignes et repérer
 * les cas ambigus avant de décider de l'import.
 *
 * Usage : npx tsx scripts/analyse-import-2026.ts "<chemin-du-csv>"
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage : npx tsx scripts/analyse-import-2026.ts "<csv>"');
  process.exit(1);
}

const content = readFileSync(resolve(csvPath), "utf-8");
type Row = Record<string, string>;
const rows = parse(content, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  relax_quotes: true,
  trim: true,
}) as Row[];

// Mapping libellé semaine CSV → code DB
const SEMAINES: { rx: RegExp; code: string; dejOK: boolean }[] = [
  { rx: /29\/06.*03\/07/, code: "ete_juillet_1", dejOK: false },
  { rx: /06\/07.*10\/07/, code: "ete_juillet_2", dejOK: true },
  { rx: /13\/07.*17\/07/, code: "ete_juillet_3", dejOK: true },
  { rx: /20\/07.*24\/07/, code: "ete_juillet_4", dejOK: true },
  { rx: /27\/07.*31\/07/, code: "ete_juillet_5", dejOK: true },
  { rx: /03\/08.*07\/08/, code: "ete_aout_1", dejOK: true },
  { rx: /10\/08.*14\/08/, code: "ete_aout_2", dejOK: true },
  { rx: /17\/08.*21\/08/, code: "ete_aout_3", dejOK: true },
  { rx: /24\/08.*28\/08/, code: "ete_aout_4", dejOK: true },
];

function mapFormule(s: string): { code: string | null; creneau: string | null } {
  const t = s.toLowerCase();
  if (t.includes("formule 1")) return { code: "formule_1", creneau: null };
  if (t.includes("formule 2")) {
    const creneau = /apr[eè]s/.test(t) ? "apres_midi" : t.includes("matin") ? "matin" : null;
    return { code: "formule_2", creneau };
  }
  if (t.includes("formule 3")) return { code: "formule_3", creneau: null };
  if (t.includes("formule 4")) return { code: "formule_4", creneau: null };
  return { code: null, creneau: null };
}

function mapSemaine(s: string) {
  for (const sm of SEMAINES) if (sm.rx.test(s)) return sm;
  return null;
}

const JMAP: Record<string, string> = {
  lundi: "lundi", mardi: "mardi", mercredi: "mercredi", jeudi: "jeudi", vendredi: "vendredi",
};
function parseJours(s: string): string[] {
  if (!s) return [];
  return s
    .split(/[,;]/)
    .map((x) => x.trim().toLowerCase())
    .map((x) => JMAP[x])
    .filter(Boolean);
}

function parseDejeuner(choix: string): { type: "aucun" | "semaine" | "jour" | "vide"; jours: string[] } {
  const t = (choix ?? "").toLowerCase();
  if (!t) return { type: "vide", jours: [] };
  if (t.includes("pas de repas")) return { type: "aucun", jours: [] };
  if (t.includes("semaine") || t.includes("35")) return { type: "semaine", jours: [] };
  // ex "Lundi - 8 euros"
  const j = parseJours(t.replace(/-.*/, ""));
  if (j.length) return { type: "jour", jours: j };
  return { type: "vide", jours: [] };
}

console.log(`\n=== ${rows.length} lignes lues ===\n`);

const issues: string[] = [];
let nF1 = 0, nF2 = 0, nF3 = 0, nF4 = 0, nUnknown = 0;

rows.forEach((r, i) => {
  const ln = i + 2; // ligne CSV réelle
  const nom = r["Nom"]?.trim() ?? "";
  const prenom = r["Prénom"]?.trim() ?? "";
  const dn = r["date de naissance"]?.trim() ?? "";
  const adr = r["adresse"]?.trim() ?? "";
  const tel = r["numéro de téléphone"]?.trim() ?? "";
  const mail = r["MAIL"]?.trim() ?? "";
  const fStr = r["formule"]?.trim() ?? "";
  const semStr = r["date"]?.trim() ?? "";
  const choixRepas = r["choix repas"]?.trim() ?? "";
  const dateRepas = r["date repas"]?.trim() ?? "";

  const { code: fCode } = mapFormule(fStr);
  const sem = mapSemaine(semStr);
  const dej = parseDejeuner(choixRepas);
  const joursF4 = parseJours(dateRepas);

  if (fCode === "formule_1") nF1++;
  else if (fCode === "formule_2") nF2++;
  else if (fCode === "formule_3") nF3++;
  else if (fCode === "formule_4") nF4++;
  else nUnknown++;

  const who = `L${ln} ${prenom} ${nom}`.padEnd(34);

  // --- Détection des problèmes ---
  if (!nom && !prenom) { issues.push(`${who} → LIGNE VIDE (ni nom ni prénom)`); return; }
  if (!fCode) issues.push(`${who} → FORMULE non reconnue : "${fStr}"`);
  if (!sem) issues.push(`${who} → SEMAINE non reconnue : "${semStr}"`);
  if (!mail) issues.push(`${who} → EMAIL manquant (champ obligatoire)`);
  if (!adr) issues.push(`${who} → ADRESSE manquante (champ obligatoire)`);
  if (!tel) issues.push(`${who} → TÉLÉPHONE manquant`);

  // Date naissance plausibilité
  const m = dn.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) {
    issues.push(`${who} → DATE NAISSANCE illisible : "${dn}"`);
  } else {
    const annee = parseInt(m[3], 10);
    if (annee >= 2026) issues.push(`${who} → DATE NAISSANCE dans le futur : "${dn}" (probable erreur)`);
    if (annee <= 1910) issues.push(`${who} → DATE NAISSANCE suspecte : "${dn}" (placeholder ?)`);
  }

  // Formule 4 : option par jour inconnue
  if (fCode === "formule_4") {
    issues.push(
      `${who} → FORMULE 4 : jours=[${joursF4.join(",") || "?"}] · OPTION/jour INCONNUE` +
        (choixRepas ? ` · repas CSV="${choixRepas}"` : ""),
    );
  }

  // Déjeuner demandé sur semaine sans déjeuner
  if (sem && !sem.dejOK && (dej.type === "semaine" || dej.type === "jour")) {
    issues.push(
      `${who} → DÉJEUNER demandé ("${choixRepas}") mais semaine ${sem.code} marquée SANS déjeuner`,
    );
  }
});

console.log(`Répartition formules : F1=${nF1} F2=${nF2} F3=${nF3} F4=${nF4} inconnue=${nUnknown}\n`);
console.log(`=== ${issues.length} POINTS À VÉRIFIER ===\n`);
for (const it of issues) console.log("  • " + it);
console.log("");
