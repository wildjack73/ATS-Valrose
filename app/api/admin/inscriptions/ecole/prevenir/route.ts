import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendValidationEcole } from "@/lib/email/send";
import type { InscriptionEcoleRow } from "@/lib/types/db";

export const runtime = "nodejs";

// Sécurité : on borne le nombre d'envois par requête (SMTP + timeout Vercel).
// Le client découpe en lots ; le suivi prevenu_at garantit qu'aucun n'est
// prévenu deux fois même si on relance.
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
    .from("inscriptions_ecole")
    .select("*")
    .in("id", ids);
  if (error) {
    console.error("[prevenir] fetch:", error);
    return NextResponse.json({ error: "Erreur base" }, { status: 500 });
  }
  const rows = (data ?? []) as InscriptionEcoleRow[];

  let sent = 0;
  const failed: { id: string; nom: string; error: string }[] = [];

  // Envoi SÉQUENTIEL (respecte les limites SMTP). prevenu_at posé au fil de
  // l'eau → si ça coupe, les déjà envoyés restent marqués.
  for (const row of rows) {
    const res = await sendValidationEcole(row);
    if (res.ok) {
      const now = new Date().toISOString();
      const { error: upErr } = await supa
        .from("inscriptions_ecole")
        .update({ prevenu_at: now })
        .eq("id", row.id);
      if (upErr) {
        console.error("[prevenir] update prevenu_at:", upErr);
        failed.push({ id: row.id, nom: `${row.prenom} ${row.nom}`, error: "email envoyé mais suivi non enregistré" });
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
