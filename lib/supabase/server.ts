import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * fetch avec retry automatique sur erreurs transitoires (blip réseau ou
 * réponse 5xx). Corrige les 500 intermittents observés sur Vercel/Supabase
 * (une requête plante ponctuellement → reload OK). Le retry est limité aux
 * requêtes IDEMPOTENTES (GET/HEAD = lectures) : on ne réessaie jamais une
 * écriture (POST/PATCH/DELETE) pour éviter tout double-enregistrement.
 */
async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const idempotent = method === "GET" || method === "HEAD";
  const maxAttempts = idempotent ? 3 : 1;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(input, init);
      // Réessaie sur 5xx (erreur serveur transitoire), uniquement en lecture
      if (
        idempotent &&
        res.status >= 500 &&
        res.status < 600 &&
        attempt < maxAttempts
      ) {
        await sleep(150 * attempt);
        continue;
      }
      return res;
    } catch (err) {
      // Erreur réseau (connexion coupée, DNS, etc.)
      lastError = err;
      if (idempotent && attempt < maxAttempts) {
        await sleep(150 * attempt);
        continue;
      }
      throw err;
    }
  }
  // Inatteignable en théorie, mais TypeScript veut un retour
  throw lastError ?? new Error("fetchWithRetry: échec inconnu");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Client Supabase côté serveur, utilise la clé secrète (service_role) pour
 * pouvoir insérer ET lire malgré la Row Level Security.
 *
 * Variables d'environnement supportées (les deux noms fonctionnent) :
 *   - URL          : SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL
 *   - Clé secrète  : SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SECRET_KEY
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Variables d'environnement Supabase serveur manquantes. Définissez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (ou les équivalents NEXT_PUBLIC_/SECRET_KEY).",
    );
  }

  cached = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithRetry },
  });
  return cached;
}
