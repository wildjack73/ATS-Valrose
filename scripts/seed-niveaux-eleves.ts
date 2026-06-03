/**
 * Pré-remplit la table niveaux_eleves à partir des données existantes
 * (« si tu as l'info de l'année précédente tu mets cette info par défaut »).
 *
 * Pour chaque élève (clé nom|prénom), on cherche un niveau Galaxie
 * reconnaissable dans ses inscriptions (current + historique, stages +
 * école), en privilégiant les plus récentes. Les adultes (≥ 18 ans) sont
 * ignorés. On n'écrase jamais une valeur déjà présente dans niveaux_eleves.
 *
 * Idempotent : peut être relancé sans dégât.
 *
 * Usage : npx tsx scripts/seed-niveaux-eleves.ts
 */

import { Client } from "pg";
import { config as loadEnv } from "dotenv";
import {
  parseNiveau,
  eleveKey,
  estAdulte,
} from "../lib/data/niveaux";

loadEnv({ path: ".env.local" });

interface Cand {
  nom: string | null;
  prenom: string | null;
  niveau: string | null;
  date_naissance: string | null;
  /** poids de fraîcheur : current > historique */
  recent: number;
}

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await c.connect();
  console.log("🔌 Connecté.\n");

  const candidates: Cand[] = [];

  // Current (poids 2) — niveau attribué d'abord, sinon déclaré
  const sc = await c.query(
    `SELECT nom, prenom, niveau, niveau_attribue, date_naissance FROM inscriptions_stages`,
  );
  for (const r of sc.rows) {
    candidates.push({
      nom: r.nom,
      prenom: r.prenom,
      niveau: r.niveau_attribue || r.niveau,
      date_naissance: r.date_naissance,
      recent: 2,
    });
  }
  const ec = await c.query(
    `SELECT nom, prenom, niveau, niveau_attribue, date_naissance FROM inscriptions_ecole`,
  );
  for (const r of ec.rows) {
    candidates.push({
      nom: r.nom,
      prenom: r.prenom,
      niveau: r.niveau_attribue || r.niveau,
      date_naissance: r.date_naissance,
      recent: 2,
    });
  }

  // Historique (poids 1)
  const sh = await c.query(
    `SELECT nom, prenom, niveau, date_naissance FROM inscriptions_stages_historique`,
  );
  for (const r of sh.rows) {
    candidates.push({ ...r, recent: 1 } as Cand);
  }
  const eh = await c.query(
    `SELECT nom, prenom, niveau, date_naissance FROM inscriptions_ecole_historique`,
  );
  for (const r of eh.rows) {
    candidates.push({ ...r, recent: 1 } as Cand);
  }

  // Pour chaque élève, choisir le meilleur niveau Galaxie reconnu
  const best = new Map<
    string,
    { nom: string | null; prenom: string | null; code: string; recent: number }
  >();
  for (const cand of candidates) {
    if (!cand.nom && !cand.prenom) continue;
    if (estAdulte(cand.date_naissance)) continue;
    const niv = parseNiveau(cand.niveau);
    if (!niv) continue;
    const key = eleveKey(cand.nom, cand.prenom);
    const prev = best.get(key);
    if (!prev || cand.recent > prev.recent) {
      best.set(key, {
        nom: cand.nom,
        prenom: cand.prenom,
        code: niv.code,
        recent: cand.recent,
      });
    }
  }

  console.log(`📊 ${best.size} élèves avec un niveau Galaxie détecté.\n`);

  let inserted = 0;
  let skipped = 0;
  for (const [key, v] of best.entries()) {
    // N'écrase pas une valeur déjà saisie
    const existing = await c.query(
      `SELECT 1 FROM niveaux_eleves WHERE eleve_key = $1`,
      [key],
    );
    if ((existing.rowCount ?? 0) > 0) {
      skipped++;
      continue;
    }
    await c.query(
      `INSERT INTO niveaux_eleves (eleve_key, nom, prenom, niveau)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (eleve_key) DO NOTHING`,
      [key, v.nom, v.prenom, v.code],
    );
    inserted++;
  }

  console.log(`✅ ${inserted} niveaux pré-remplis, ${skipped} déjà présents.`);
  await c.end();
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
