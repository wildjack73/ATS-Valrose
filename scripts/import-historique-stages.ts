/**
 * Import historique des inscriptions stages depuis un export CSV Google Forms.
 *
 * Usage :
 *   npm run import:historique -- data-historique/stages-2025-2026.csv
 *
 * Idempotent : avant l'insertion, supprime toutes les lignes existantes
 * dont la colonne `source` correspond au nom du fichier passé en argument.
 */

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error(
    "❌ Variables d'environnement manquantes. Crée .env.local avec SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("❌ Usage : npm run import:historique -- <chemin-du-csv>");
  process.exit(1);
}

const absPath = resolve(csvPath);
const source = basename(absPath);

console.log(`📂 Lecture de ${absPath}`);
const content = readFileSync(absPath, "utf-8");

type Row = Record<string, string>;
const rows = parse(content, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  trim: true,
}) as Row[];

console.log(`📊 ${rows.length} lignes lues du CSV`);

/** Normalise le libellé "Formule X ..." → 'formule_1' | 'formule_2' | etc. */
function normaliseFormule(s: string): {
  id: string | null;
  creneau: string | null;
} {
  const t = s.toLowerCase();
  if (!t || t.length < 5) return { id: null, creneau: null };
  if (t.includes("formule 1")) return { id: "formule_1", creneau: null };
  if (t.includes("formule 2")) {
    const creneau = t.includes("après") || t.includes("apres")
      ? "apres_midi"
      : t.includes("matin")
        ? "matin"
        : null;
    return { id: "formule_2", creneau };
  }
  if (t.includes("formule 3")) return { id: "formule_3", creneau: null };
  if (t.includes("formule 4")) return { id: "formule_4", creneau: null };
  return { id: null, creneau: null };
}

/** Devine le prix à partir du libellé formule + option déjeuner. */
function estimerPrix(
  formuleId: string | null,
  repas: string,
): number {
  const dejeuner = /35\s*euros|semaine\s+entière|semaine\s+entiere/i.test(
    repas,
  );
  switch (formuleId) {
    case "formule_1":
      return 110;
    case "formule_2":
      return 170; // tarif historique (en 2026/27 c'est 180€)
    case "formule_3":
      return 280 + (dejeuner ? 35 : 0);
    case "formule_4":
      return 0; // à la carte, calcul impossible sans détail
    default:
      return 0;
  }
}

function detectDejeuner(repas: string): boolean {
  if (!repas) return false;
  return /35\s*euros|semaine\s+entière|semaine\s+entiere/i.test(repas);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // 1. Supprimer les anciennes lignes pour cette source (idempotence)
  console.log(`🗑️  Suppression des lignes existantes (source=${source})…`);
  const { error: delError, count: deleted } = await supabase
    .from("inscriptions_stages_historique")
    .delete({ count: "exact" })
    .eq("source", source);
  if (delError) {
    console.error("❌ Erreur suppression :", delError);
    process.exit(1);
  }
  console.log(`   → ${deleted ?? 0} lignes supprimées`);

  // 2. Préparer les lignes à insérer
  const records = rows.map((r) => {
    const formule = r["Choix de la formule"] ?? "";
    const repas =
      r["Formule repas (sélection multiple possible) - Indisponible à Noël"] ??
      r["Formule repas"] ??
      "";
    const { id: formuleId, creneau } = normaliseFormule(formule);
    return {
      source,
      horodateur: r["Horodateur"] || null,
      nom: r["Nom"] || null,
      prenom: r["Prénom"] || null,
      date_naissance: r["Date de naissance"] || null,
      adresse: r["Adresse"] || null,
      telephone: r["Téléphone"] || null,
      email: r["Email"] || null,
      niveau: r["Niveau"] || null,
      formule: formule || null,
      semaine: r["Choix de la semaine"] || null,
      repas: repas || null,
      jours_f4: r["Choix des jours pour la formule 4"] || null,
      formule_normalisee: formuleId,
      creneau_normalise: creneau,
      dejeuner: detectDejeuner(repas),
      prix_estime: estimerPrix(formuleId, repas),
    };
  });

  // 3. Filtrer les lignes totalement vides (sans nom ni prénom)
  const valides = records.filter((r) => r.nom || r.prenom);
  const ignored = records.length - valides.length;
  if (ignored > 0) {
    console.log(`⚠️  ${ignored} ligne(s) ignorée(s) (ni nom ni prénom)`);
  }

  // 4. Insérer par paquets de 100
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < valides.length; i += BATCH) {
    const chunk = valides.slice(i, i + BATCH);
    const { error } = await supabase
      .from("inscriptions_stages_historique")
      .insert(chunk);
    if (error) {
      console.error(`❌ Erreur insertion batch ${i / BATCH + 1} :`, error);
      process.exit(1);
    }
    inserted += chunk.length;
    process.stdout.write(`\r✅ ${inserted} / ${valides.length} insérées`);
  }
  process.stdout.write("\n");

  // 5. Récap par formule
  const parFormule: Record<string, number> = {};
  for (const r of valides) {
    const k = r.formule_normalisee ?? "(non normalisée)";
    parFormule[k] = (parFormule[k] ?? 0) + 1;
  }
  console.log("\n📈 Répartition par formule :");
  for (const [k, v] of Object.entries(parFormule).sort()) {
    console.log(`   ${k.padEnd(20)} : ${v}`);
  }

  const totalEstime = valides.reduce((s, r) => s + (r.prix_estime ?? 0), 0);
  console.log(`\n💰 Total estimé historique : ${totalEstime}€`);
  console.log("\n✨ Import terminé.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
