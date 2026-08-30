import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendValidationStage } from "@/lib/email/send";
import type { InscriptionStageRow } from "@/lib/types/db";

export const runtime = "nodejs";

const MAX_PAR_LOT = 25;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON attendu" }, { status: 400 });
  }

  const rawIds = (body as { ids?: unknown })?.ids;
  const ids = Array.isArray(rawIds)
    ? rawIds.filter((x): x is string => typeof x === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Aucune inscription à prévenir." },
      { status: 400 },
    );
  }
  if (ids.length > MAX_PAR_LOT) {
    return NextResponse.json(
      { error: `Trop d'envois d'un coup (max ${MAX_PAR_LOT}). Réessaie par lots.` },
      { status: 400 },
    );
  }

  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from("inscriptions_stages")
    .select("*")
    .in("id", ids);
  if (error) {
    console.error("[prevenir stages] fetch:", error);
    return NextResponse.json({ error: "Erreur base" }, { status: 500 });
  }
  const rows = (data ?? []) as InscriptionStageRow[];

  let sent = 0;
  const failed: { id: string; nom: string; error: string }[] = [];

  for (const row of rows) {
    const res = await sendValidationStage(row);
    if (res.ok) {
      const now = new Date().toISOString();
      const { error: upErr } = await supa
        .from("inscriptions_stages")
        .update({ prevenu_at: now })
        .eq("id", row.id);
      if (upErr) {
        console.error("[prevenir stages] update prevenu_at:", upErr);
        failed.push({
          id: row.id,
          nom: `${row.prenom} ${row.nom}`,
          error: "email envoyé mais suivi non enregistré",
        });
      } else {
        sent++;
      }
    } else {
      failed.push({
        id: row.id,
        nom: `${row.prenom} ${row.nom}`,
        error: res.error ?? "envoi échoué",
      });
    }
  }

  return NextResponse.json({ ok: true, sent, failed });
}
