import { Client } from "pg";
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const c = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const r = await c.query(
    "select code, periode, label, date_debut, ouverte, dejeuner_disponible from semaines_stages order by date_debut nulls last, order_idx",
  );
  for (const row of r.rows) {
    const date = row.date_debut ?? "—";
    console.log(
      `${(row.code ?? "").padEnd(20)} ${(row.periode ?? "").padEnd(28)} ${(row.label ?? "").padEnd(22)} ${date} O:${row.ouverte ? "✓" : "✕"} Dej:${row.dejeuner_disponible ? "✓" : "✕"}`,
    );
  }
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
