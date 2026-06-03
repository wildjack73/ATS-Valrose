import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface PutBody {
  eleve_key?: string;
  nom?: string | null;
  prenom?: string | null;
  niveau?: string | null;
}

/** PUT /api/admin/niveaux — définit (ou retire) le niveau attribué d'un élève. */
export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }
  const key = (body.eleve_key ?? "").trim();
  if (!key) {
    return NextResponse.json({ error: "eleve_key requis" }, { status: 400 });
  }

  const supa = getSupabaseAdmin();
  const niveau = body.niveau ? String(body.niveau).trim() : "";

  // Niveau vide = retrait → on supprime la ligne
  if (!niveau) {
    const { error } = await supa
      .from("niveaux_eleves")
      .delete()
      .eq("eleve_key", key);
    if (error) {
      console.error("DELETE niveaux_eleves:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, niveau: null });
  }

  const { error } = await supa.from("niveaux_eleves").upsert(
    {
      eleve_key: key,
      nom: body.nom ?? null,
      prenom: body.prenom ?? null,
      niveau,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "eleve_key" },
  );
  if (error) {
    console.error("UPSERT niveaux_eleves:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, niveau });
}
