import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface PutBody {
  saison_id?: string;
  visible_jusqu_au?: string;
  annee_scolaire?: string;
  date_reprise?: string;
  jours?: { label: string; creneaux: string }[];
}

/**
 * PUT /api/admin/jpo-ecole — upsert la config JPO d'une saison école.
 * Un seul enregistrement par saison_id (unique).
 */
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

  if (
    !body.saison_id ||
    !body.visible_jusqu_au ||
    !body.annee_scolaire ||
    !body.date_reprise
  ) {
    return NextResponse.json(
      { error: "Champs requis : saison_id, visible_jusqu_au, annee_scolaire, date_reprise" },
      { status: 400 },
    );
  }

  const jours = Array.isArray(body.jours)
    ? body.jours
        .map((j) => ({
          label: String(j.label ?? "").trim(),
          creneaux: String(j.creneaux ?? "").trim(),
        }))
        .filter((j) => j.label && j.creneaux)
    : [];

  const { error } = await getSupabaseAdmin()
    .from("jpo_ecole")
    .upsert(
      {
        saison_id: body.saison_id,
        visible_jusqu_au: body.visible_jusqu_au,
        annee_scolaire: body.annee_scolaire.trim(),
        date_reprise: body.date_reprise.trim(),
        jours,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "saison_id" },
    );

  if (error) {
    console.error("PUT jpo-ecole:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/jpo-ecole?saison_id=… — retire la config (le bandeau disparaît) */
export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const url = new URL(request.url);
  const saisonId = url.searchParams.get("saison_id");
  if (!saisonId) {
    return NextResponse.json({ error: "saison_id requis" }, { status: 400 });
  }
  const { error } = await getSupabaseAdmin()
    .from("jpo_ecole")
    .delete()
    .eq("saison_id", saisonId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
