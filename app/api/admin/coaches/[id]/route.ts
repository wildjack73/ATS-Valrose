import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface PatchBody {
  nom?: string;
  couleur?: string | null;
  actif?: boolean;
  order_idx?: number;
}

/** PATCH /api/admin/coaches/[id] — modifie un coach */
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
  if (body.nom !== undefined) {
    const nom = body.nom.trim();
    if (!nom) {
      return NextResponse.json(
        { error: "Le nom ne peut pas être vide" },
        { status: 400 },
      );
    }
    patch.nom = nom;
  }
  if (body.couleur !== undefined) patch.couleur = body.couleur || null;
  if (body.actif !== undefined) patch.actif = body.actif;
  if (body.order_idx !== undefined) patch.order_idx = body.order_idx;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("coaches")
    .update(patch)
    .eq("id", id);
  if (error) {
    console.error("PATCH coaches:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/coaches/[id] — supprime un coach
 *  Conséquences (FK schema) :
 *    - groupes_ecole.coach_id  → mis à NULL  (on delete set null)
 *    - stage_organisations rows → supprimées  (on delete cascade)
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;

  const { error } = await getSupabaseAdmin()
    .from("coaches")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("DELETE coaches:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
