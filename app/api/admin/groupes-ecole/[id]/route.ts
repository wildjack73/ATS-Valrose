import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED = [
  "jour",
  "heure_debut",
  "heure_fin",
  "court",
  "coach_id",
  "niveau",
  "capacite_max",
  "notes",
  "order_idx",
];

function pick(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ALLOWED) if (k in data) out[k] = data[k];
  return out;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const update = pick(body);
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });
  }
  const { error } = await getSupabaseAdmin()
    .from("groupes_ecole")
    .update(update)
    .eq("id", id);
  if (error) {
    console.error("[groupe PATCH]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const { error } = await getSupabaseAdmin()
    .from("groupes_ecole")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[groupe DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
