import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { buildValidationStageEmail } from "@/lib/email/send";
import type { InscriptionStageRow } from "@/lib/types/db";

export const runtime = "nodejs";

/** Aperçu (HTML) de l'email « Prévenir » d'une inscription STAGE, SANS envoi. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;

  const { data, error } = await getSupabaseAdmin()
    .from("inscriptions_stages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Inscription introuvable" }, { status: 404 });
  }
  const row = data as InscriptionStageRow;

  const { subject, html } = buildValidationStageEmail(row);

  const page = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aperçu — ${esc(subject)}</title></head>
<body style="margin:0;background:#eef2f5;font-family:Arial,sans-serif">
  <div style="background:#0d2e3f;color:#fff;padding:10px 16px;font-size:13px">
    <strong>Aperçu de l'email (non envoyé)</strong>
  </div>
  <div style="padding:10px 16px;background:#fff;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334">
    <div><strong>À :</strong> ${esc(row.email)}</div>
    <div><strong>Objet :</strong> ${esc(subject)}</div>
  </div>
  ${html}
</body></html>`;

  return new NextResponse(page, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
