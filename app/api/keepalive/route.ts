import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/keepalive — ping minimal Supabase pour prévenir les cold starts.
 * Appelé automatiquement par le cron Vercel (vercel.json) toutes les 5 min.
 * Peut aussi être utilisé par UptimeRobot ou tout autre service de monitoring.
 */
export async function GET() {
  try {
    const { error } = await getSupabaseAdmin()
      .from("saisons")
      .select("id")
      .limit(1)
      .maybeSingle();
    // Toujours 200 : le but est de réveiller Vercel + Supabase,
    // pas de faire une alerte santé. UptimeRobot ne doit alarmer que
    // si Vercel lui-même est hors service.
    if (error) console.error("[keepalive] Supabase error:", error.message);
    return NextResponse.json({ ok: !error });
  } catch (err) {
    console.error("[keepalive] Exception:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false });
  }
}
