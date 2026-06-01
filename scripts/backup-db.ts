/**
 * Backup complet de la base Supabase en JSON.
 *
 * Pour chaque table publique (sauf admin_login_attempts qui est éphémère),
 * on fait un SELECT * et on écrit le résultat dans un fichier JSON daté.
 *
 * Usage :
 *   npm run backup                            # → ./backups/ats-valrose-YYYY-MM-DD.json
 *   BACKUP_DIR=D:/OneDrive/ATS npm run backup # → dans un dossier OneDrive
 *
 * Variables d'env requises (.env.local) :
 *   SUPABASE_DB_URL
 *
 * Restauration : voir BACKUP.md
 */

import { Client } from "pg";
import { config as loadEnv } from "dotenv";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

loadEnv({ path: ".env.local" });

// Tables à NE PAS sauvegarder (éphémères ou non métier)
const SKIP_TABLES = new Set(["admin_login_attempts"]);

function todayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowHHMM(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}h${m}`;
}

async function main() {
  if (!process.env.SUPABASE_DB_URL) {
    console.error("❌ SUPABASE_DB_URL manquant dans .env.local");
    process.exit(1);
  }

  const outDir = resolve(process.env.BACKUP_DIR ?? "./backups");
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
    console.log(`📁 Dossier créé : ${outDir}`);
  }

  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  console.log("🔌 Connexion à Supabase…");
  await c.connect();
  console.log("✅ Connecté.\n");

  // 1. Liste des tables publiques
  const { rows: tableRows } = await c.query<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
  );
  const tables = tableRows
    .map((r) => r.table_name)
    .filter((t) => !SKIP_TABLES.has(t));

  console.log(`📊 ${tables.length} tables à sauvegarder (${SKIP_TABLES.size} ignorées)\n`);

  // 2. Dump chacune
  const dump: Record<string, unknown[]> = {};
  let totalRows = 0;
  for (const table of tables) {
    const start = Date.now();
    const { rows } = await c.query(`SELECT * FROM public."${table}"`);
    dump[table] = rows;
    totalRows += rows.length;
    const ms = Date.now() - start;
    console.log(
      `   ${table.padEnd(40)} ${String(rows.length).padStart(6)} lignes  (${ms}ms)`,
    );
  }
  await c.end();

  // 3. Écriture du fichier
  const filename = `ats-valrose-${todayYMD()}-${nowHHMM()}.json`;
  const filepath = join(outDir, filename);
  const payload = {
    meta: {
      created_at: new Date().toISOString(),
      tables_count: tables.length,
      total_rows: totalRows,
      source: "ats-valrose backup script",
    },
    data: dump,
  };
  writeFileSync(filepath, JSON.stringify(payload, null, 2), "utf-8");

  const sizeMB = (
    Buffer.byteLength(JSON.stringify(payload), "utf-8") /
    (1024 * 1024)
  ).toFixed(2);

  console.log(`\n✨ Backup terminé.`);
  console.log(`   Fichier : ${filepath}`);
  console.log(`   Taille  : ${sizeMB} Mo`);
  console.log(`   Total   : ${totalRows} lignes sur ${tables.length} tables`);
}

main().catch((e) => {
  console.error("\n❌ Échec du backup :", e);
  process.exit(1);
});
