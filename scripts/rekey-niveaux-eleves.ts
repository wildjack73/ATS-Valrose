/**
 * Re-normalise les clés de niveaux_eleves après le passage à une clé élève
 * insensible aux accents/casse. Les anciennes clés (avec accents) sont
 * recalculées ; en cas de collision (ex: « Clément » + « CLEMENT » →
 * même clé), on garde la valeur la PLUS RÉCEMMENT modifiée (updated_at),
 * ce qui privilégie une saisie manuelle récente sur un seed plus ancien.
 *
 * Idempotent. Usage : npx tsx scripts/rekey-niveaux-eleves.ts
 */

import { Client } from "pg";
import { config as loadEnv } from "dotenv";
import { eleveKey } from "../lib/data/niveaux";

loadEnv({ path: ".env.local" });

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await c.connect();
  console.log("🔌 Connecté.\n");

  const { rows } = await c.query(
    `SELECT eleve_key, nom, prenom, niveau, updated_at FROM niveaux_eleves`,
  );
  console.log(`📊 ${rows.length} lignes à re-normaliser.\n`);

  // Regroupe par nouvelle clé, garde la plus récente
  const best = new Map<
    string,
    { nom: string | null; prenom: string | null; niveau: string; updated_at: Date }
  >();
  for (const r of rows) {
    const newKey = eleveKey(r.nom, r.prenom);
    const updated = new Date(r.updated_at);
    const prev = best.get(newKey);
    if (!prev || updated > prev.updated_at) {
      best.set(newKey, {
        nom: r.nom,
        prenom: r.prenom,
        niveau: r.niveau,
        updated_at: updated,
      });
    }
  }

  console.log(
    `→ ${best.size} clés uniques après normalisation (${rows.length - best.size} doublons fusionnés).\n`,
  );

  // On vide et réécrit proprement
  await c.query("BEGIN");
  try {
    await c.query("TRUNCATE TABLE niveaux_eleves");
    for (const [key, v] of best.entries()) {
      await c.query(
        `INSERT INTO niveaux_eleves (eleve_key, nom, prenom, niveau, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [key, v.nom, v.prenom, v.niveau, v.updated_at.toISOString()],
      );
    }
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  }

  console.log(`✅ Table re-normalisée : ${best.size} élèves.`);
  await c.end();
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
