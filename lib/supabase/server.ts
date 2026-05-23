import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

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
  });
  return cached;
}
