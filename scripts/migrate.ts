/**
 * Exécute les fichiers SQL de migration sur la base Supabase via une
 * connexion Postgres directe.
 *
 * Usage :
 *   npm run migrate                  # applique schema.sql + seed
 *   npm run migrate -- schema        # juste le schéma
 *   npm run migrate -- seed          # juste le seed
 *   npm run migrate -- <fichier.sql> # un fichier précis
 *
 * Variables d'environnement requises (.env.local) :
 *   SUPABASE_DB_URL = postgresql://postgres.<ref>:<password>@<host>:5432/postgres
 *   (Copie depuis Supabase → Project Settings → Database → Connection string,
 *    URI "Session pooler" ou "Direct connection")
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error(
    "❌ SUPABASE_DB_URL manquant dans .env.local.\n" +
      "   Récupère-le sur Supabase → Project Settings → Database → Connection string.",
  );
  process.exit(1);
}

const arg = process.argv[2];

// Choisir les fichiers à exécuter
let files: string[];
if (!arg) {
  files = ["supabase/schema.sql", "supabase/seed-2026-2027.sql"];
} else if (arg === "schema") {
  files = ["supabase/schema.sql"];
} else if (arg === "seed") {
  files = ["supabase/seed-2026-2027.sql"];
} else {
  files = [arg];
}

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log("🔌 Connexion à Supabase…");
  await client.connect();
  console.log("✅ Connecté.\n");

  for (const file of files) {
    const path = resolve(file);
    console.log(`📄 ${file}`);
    const sql = readFileSync(path, "utf-8");
    const t0 = Date.now();
    try {
      await client.query(sql);
      console.log(`   ✅ exécuté en ${Date.now() - t0}ms\n`);
    } catch (e) {
      console.error(`   ❌ Échec :`, e instanceof Error ? e.message : e);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("✨ Migrations terminées.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
