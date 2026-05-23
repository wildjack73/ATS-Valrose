/**
 * Script de debug : compte les lignes dans chaque table de tarifs.
 */
import { Client } from "pg";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error("SUPABASE_DB_URL manquant");
  process.exit(1);
}

async function main() {
  const c = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const tables = [
    "saisons",
    "tarifs_stages_formules",
    "tarifs_options_f4",
    "semaines_stages",
    "tarifs_cours_ecole",
    "tarifs_licence_fft",
    "tarifs_autres",
  ];

  for (const t of tables) {
    const r = await c.query(`select count(*) from public.${t}`);
    console.log(`${t.padEnd(30)} : ${r.rows[0].count} lignes`);
  }

  const saisons = await c.query(
    "select code, label, active from saisons order by order_idx desc",
  );
  console.log("\nSaisons :");
  for (const s of saisons.rows) {
    console.log(`  - ${s.code} : ${s.label} ${s.active ? "(active)" : ""}`);
  }

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
