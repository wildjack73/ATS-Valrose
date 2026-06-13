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
    if (error) {
      console.error("[keepalive] Supabase error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[keepalive] Exception:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
