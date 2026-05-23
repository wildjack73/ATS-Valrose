import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STATUTS_VALIDES = ["en_attente", "paye", "annule"] as const;

interface PatchBody {
  statut?: string;
  paiement_info?: string | null;
  notes_admin?: string | null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json()) as PatchBody;

  const patch: Record<string, unknown> = {};
  if (body.statut !== undefined) {
    if (!STATUTS_VALIDES.includes(body.statut as never)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    patch.statut = body.statut;
  }
  if (body.paiement_info !== undefined) {
    patch.paiement_info = body.paiement_info || null;
  }
  if (body.notes_admin !== undefined) {
    patch.notes_admin = body.notes_admin || null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("inscriptions_stages")
    .update(patch)
    .eq("id", id);
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec mise à jour" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
