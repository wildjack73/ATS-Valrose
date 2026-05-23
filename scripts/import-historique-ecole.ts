/**
 * Import historique des inscriptions école depuis un export CSV Google Forms.
 *
 * Usage :
 *   npm run import:historique-ecole -- data-historique/ecole-2025-2026.csv
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
  console.error("❌ Usage : npm run import:historique-ecole -- <chemin-du-csv>");
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

/**
 * Extrait tous les nombres précédant "€" dans une chaîne et les somme.
 * Ex: "PERFECTIONNEMENT (...) – 350 €, BABY TENNIS (...) – 240 €" → 590
 */
function extractPrice(...textes: (string | null | undefined)[]): number {
  let total = 0;
  const re = /(\d[\d\s]*)\s*€/g;
  for (const t of textes) {
    if (!t) continue;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      const n = parseInt(m[1].replace(/\s+/g, ""), 10);
      if (!Number.isNaN(n)) total += n;
    }
    re.lastIndex = 0;
  }
  return total;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log(`🗑️  Suppression des lignes existantes (source=${source})…`);
  const { error: delError, count: deleted } = await supabase
    .from("inscriptions_ecole_historique")
    .delete({ count: "exact" })
    .eq("source", source);
  if (delError) {
    console.error("❌ Erreur suppression :", delError);
    process.exit(1);
  }
  console.log(`   → ${deleted ?? 0} lignes supprimées`);

  const records = rows.map((r) => {
    const tennis = r["Sélectionnez les cours TENNIS souhaités"] ?? "";
    const padel = r["Sélectionnez les cours PADEL souhaités"] ?? "";
    const mixte = r["Formule mixte"] ?? "";
    const nouvelles = r["Nouvelles formules"] ?? "";
    return {
      source,
      horodateur: r["Horodateur"] || null,
      nom: r["Nom"] || null,
      prenom: r["Prénom"] || null,
      date_naissance: r["Date de naissance"] || null,
      adresse: r["Adresse"] || null,
      code_postal_ville: r["Code postal et ville"] || null,
      telephone: r["Téléphone"] || null,
      email: r["Email"] || null,
      niveau: r["Niveau tennis (couleur)"] || null,
      cours_tennis_raw: tennis || null,
      cours_padel_raw: padel || null,
      formule_mixte_raw: mixte || null,
      nouvelles_formules_raw: nouvelles || null,
      dispo_mercredi: r["Mercredi"] || null,
      dispo_samedi: r["Samedi"] || null,
      dispo_semaine: r["Semaine (à partir de 17 h)"] || null,
      mode_reglement: r["Mode de règlement"] || null,
      nb_paiements: r["Paiement en plusieurs fois"] || null,
      licence_fft: r["Licence FFT obligatoire"] || null,
      licence_extra: r["Licence"] || null,
      reglement_notes: r["Règlement"] || null,
      commentaires: r["Commentaires"] || null,
      prix_estime: extractPrice(tennis, padel, mixte, nouvelles),
    };
  });

  const valides = records.filter((r) => r.nom || r.prenom);
  const ignored = records.length - valides.length;
  if (ignored > 0) {
    console.log(`⚠️  ${ignored} ligne(s) ignorée(s) (ni nom ni prénom)`);
  }

  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < valides.length; i += BATCH) {
    const chunk = valides.slice(i, i + BATCH);
    const { error } = await supabase
      .from("inscriptions_ecole_historique")
      .insert(chunk);
    if (error) {
      console.error(`❌ Erreur insertion batch ${i / BATCH + 1} :`, error);
      process.exit(1);
    }
    inserted += chunk.length;
    process.stdout.write(`\r✅ ${inserted} / ${valides.length} insérées`);
  }
  process.stdout.write("\n");

  const totalEstime = valides.reduce((s, r) => s + (r.prix_estime ?? 0), 0);
  const avecPrix = valides.filter((r) => (r.prix_estime ?? 0) > 0).length;
  console.log(`\n💰 Total estimé historique : ${totalEstime}€`);
  console.log(
    `   ${avecPrix} inscriptions avec prix détecté / ${valides.length}`,
  );
  console.log("\n✨ Import terminé.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
