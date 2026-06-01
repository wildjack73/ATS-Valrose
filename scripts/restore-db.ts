/**
 * Restauration de la base à partir d'un fichier de backup JSON
 * (produit par scripts/backup-db.ts).
 *
 * ⚠️ DESTRUCTIF : ce script EFFACE le contenu actuel des tables avant
 * d'y réinsérer les données du backup. À utiliser en cas de bug
 * catastrophique ou pour cloner la prod vers une instance dev.
 *
 * Usage :
 *   npm run restore -- backups/ats-valrose-2026-06-01-04h08.json
 *
 * Sécurité : demande une confirmation interactive (taper « OUI ») avant
 * de toucher quoi que ce soit.
 */

import { Client } from "pg";
import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";

loadEnv({ path: ".env.local" });

interface BackupPayload {
  meta: {
    created_at: string;
    tables_count: number;
    total_rows: number;
    source: string;
  };
  data: Record<string, Record<string, unknown>[]>;
}

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ans = (await rl.question(question)).trim();
  rl.close();
  return ans === "OUI";
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("❌ Usage : npm run restore -- <chemin/vers/backup.json>");
    process.exit(1);
  }
  if (!process.env.SUPABASE_DB_URL) {
    console.error("❌ SUPABASE_DB_URL manquant dans .env.local");
    process.exit(1);
  }

  const filepath = resolve(file);
  console.log(`📂 Lecture du backup : ${filepath}`);
  const raw = readFileSync(filepath, "utf-8");
  const payload = JSON.parse(raw) as BackupPayload;

  console.log(`\n📊 Backup créé le : ${payload.meta.created_at}`);
  console.log(`   Tables : ${payload.meta.tables_count}`);
  console.log(`   Lignes : ${payload.meta.total_rows}\n`);

  const tables = Object.keys(payload.data);
  console.log("⚠️  Tables qui seront EFFACÉES puis re-remplies :");
  for (const t of tables) {
    console.log(`   - ${t} (${payload.data[t].length} lignes)`);
  }

  console.log("");
  const ok = await confirm("Tape OUI pour confirmer la restauration : ");
  if (!ok) {
    console.log("❌ Annulé.");
    process.exit(0);
  }

  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  console.log("\n🔌 Connexion à Supabase…");
  await c.connect();
  console.log("✅ Connecté.\n");

  // On désactive les FKs le temps de la restauration (sinon ordre
  // d'insertion à respecter et c'est fragile). On les réactive à la fin.
  await c.query("SET session_replication_role = 'replica'");
  console.log("🔓 FK contraintes désactivées temporairement.\n");

  try {
    for (const table of tables) {
      const rows = payload.data[table];
      // 1. TRUNCATE (plus rapide que DELETE)
      await c.query(`TRUNCATE TABLE public."${table}" RESTART IDENTITY CASCADE`);
      if (rows.length === 0) {
        console.log(`   ${table.padEnd(40)} vidée (0 lignes à insérer)`);
        continue;
      }
      // 2. Insertions par batch
      const cols = Object.keys(rows[0]);
      const placeholders = rows
        .map((_, i) => {
          const vals = cols
            .map((_, j) => `$${i * cols.length + j + 1}`)
            .join(", ");
          return `(${vals})`;
        })
        .join(", ");
      const values = rows.flatMap((r) =>
        cols.map((k) => {
          const v = r[k];
          // Postgres veut un type JSON pour les jsonb, pas un objet JS
          if (v !== null && typeof v === "object") return JSON.stringify(v);
          return v;
        }),
      );
      await c.query(
        `INSERT INTO public."${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES ${placeholders}`,
        values,
      );
      console.log(`   ${table.padEnd(40)} ${String(rows.length).padStart(6)} lignes ✓`);
    }
  } finally {
    await c.query("SET session_replication_role = 'origin'");
    console.log("\n🔒 FK contraintes réactivées.");
    await c.end();
  }

  console.log("\n✨ Restauration terminée.");
}

main().catch((e) => {
  console.error("\n❌ Échec de la restauration :", e);
  process.exit(1);
});
