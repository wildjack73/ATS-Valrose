import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED = [
  "saison_id",
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

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const insert = pick(body);
  if (!insert.saison_id || !insert.jour || !insert.heure_debut) {
    return NextResponse.json(
      { error: "saison_id, jour et heure_debut sont requis" },
      { status: 400 },
    );
  }
  const { data, error } = await getSupabaseAdmin()
    .from("groupes_ecole")
    .insert(insert)
    .select("*")
    .single();
  if (error) {
    console.error("[groupes POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}
