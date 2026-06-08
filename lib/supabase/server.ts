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
  const maxAttempts = idempotent ? 4 : 1;
  // Coupe-circuit : une requête qui « pend » est avortée puis réessayée,
  // plutôt que de bloquer le rendu jusqu'au timeout de la fonction Vercel.
  const perAttemptTimeoutMs = 6000;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // N'ajoute notre timeout que si l'appelant n'a pas déjà fourni un signal.
    const hasOwnSignal = !!init?.signal;
    const controller = hasOwnSignal ? null : new AbortController();
    const timer = controller
      ? setTimeout(() => controller.abort(), perAttemptTimeoutMs)
      : null;
    try {
      const res = await fetch(input, {
        ...init,
        signal: init?.signal ?? controller?.signal,
      });
      if (timer) clearTimeout(timer);
      // Réessaie sur 5xx (erreur serveur transitoire), uniquement en lecture
      if (
        idempotent &&
        res.status >= 500 &&
        res.status < 600 &&
        attempt < maxAttempts
      ) {
        await sleep(200 * attempt);
        continue;
      }
      return res;
    } catch (err) {
      // Erreur réseau / timeout (connexion coupée, DNS, requête avortée…)
      if (timer) clearTimeout(timer);
      lastError = err;
      if (idempotent && attempt < maxAttempts) {
        await sleep(200 * attempt);
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
