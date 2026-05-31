import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Rate-limiting brute-force pour la connexion admin.
 *
 * Politique :
 *   - Fenêtre glissante : 15 minutes
 *   - Quota : 5 échecs max par IP sur cette fenêtre
 *   - Au 6e échec, on bloque (et on continue à enregistrer les tentatives
 *     pour étendre le blocage tant que ça spam)
 *
 * Une connexion réussie ne remet PAS à zéro le compteur des échecs (sinon
 * un attaquant pourrait noyer ses échecs entre 2 vrais logins). En
 * pratique, les lignes expirent toutes seules après 15 min.
 */

const WINDOW_MIN = 15;
const MAX_FAILED = 5;

/** Récupère l'IP de la requête depuis les headers Vercel/proxy. */
export function getRequestIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export interface RateLimitResult {
  blocked: boolean;
  attemptsInWindow: number;
  retryAfterSeconds: number | null;
}

/** Vérifie si l'IP est actuellement bloquée. Ne logge rien — juste lecture. */
export async function checkLoginRateLimit(ip: string): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("admin_login_attempts")
    .select("created_at, success")
    .eq("ip", ip)
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("checkLoginRateLimit:", error);
    // En cas d'erreur DB, on autorise (fail-open) plutôt que de bloquer
    // le légitime admin. Le risque brute-force reste limité par
    // checkAdminPassword (HMAC + timingSafeEqual).
    return { blocked: false, attemptsInWindow: 0, retryAfterSeconds: null };
  }

  const failedCount = (data ?? []).filter((r) => r.success === false).length;
  if (failedCount < MAX_FAILED) {
    return {
      blocked: false,
      attemptsInWindow: failedCount,
      retryAfterSeconds: null,
    };
  }

  // Bloqué — on calcule le moment où le plus vieil échec sortira de la fenêtre
  const oldestFailedInWindow = (data ?? [])
    .filter((r) => r.success === false)
    .slice(-MAX_FAILED)[0];
  let retry = WINDOW_MIN * 60;
  if (oldestFailedInWindow) {
    const ageMs = Date.now() - new Date(oldestFailedInWindow.created_at).getTime();
    retry = Math.max(60, Math.ceil((WINDOW_MIN * 60_000 - ageMs) / 1000));
  }
  return {
    blocked: true,
    attemptsInWindow: failedCount,
    retryAfterSeconds: retry,
  };
}

/** Enregistre une tentative (à appeler après checkAdminPassword). */
export async function recordLoginAttempt(
  ip: string,
  success: boolean,
): Promise<void> {
  const supa = getSupabaseAdmin();
  const { error } = await supa
    .from("admin_login_attempts")
    .insert({ ip, success });
  if (error) {
    console.error("recordLoginAttempt:", error);
  }

  // Best-effort cleanup : purger les lignes > 24h pour éviter une accumulation
  // indéfinie. On le fait au moment de l'insertion (pas besoin de cron).
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  await supa
    .from("admin_login_attempts")
    .delete()
    .lt("created_at", cutoff);
}
