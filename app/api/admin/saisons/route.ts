import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface CreateSaisonBody {
  code?: string;
  label?: string;
  cloneFrom?: string;       // code source à dupliquer (optionnel)
}

/**
 * POST /api/admin/saisons
 * Crée une nouvelle saison. Si `cloneFrom` est fourni, copie tous les tarifs
 * d'une saison existante.
 */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: CreateSaisonBody;
  try {
    body = (await request.json()) as CreateSaisonBody;
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const code = body.code?.trim();
  const label = body.label?.trim() ?? `Saison ${code}`;
  if (!code) {
    return NextResponse.json({ error: "Code de saison requis" }, { status: 400 });
  }

  const supa = getSupabaseAdmin();

  // 1. Créer la saison (non-active par défaut)
  const { data: newSaison, error: saisonErr } = await supa
    .from("saisons")
    .insert({ code, label, active: false, order_idx: 0 })
    .select("*")
    .single();
  if (saisonErr) {
    return NextResponse.json({ error: saisonErr.message }, { status: 500 });
  }

  // 2. Si cloneFrom, copier les tarifs
  if (body.cloneFrom) {
    const { data: src, error: srcErr } = await supa
      .from("saisons")
      .select("id")
      .eq("code", body.cloneFrom)
      .maybeSingle();
    if (srcErr || !src) {
      return NextResponse.json(
        { error: "Saison source introuvable" },
        { status: 400 },
      );
    }

    await cloneTable(supa, "tarifs_stages_formules", src.id, newSaison.id);
    await cloneTable(supa, "tarifs_options_f4", src.id, newSaison.id);
    await cloneTable(supa, "semaines_stages", src.id, newSaison.id);
    await cloneTable(supa, "tarifs_cours_ecole", src.id, newSaison.id);
    await cloneTable(supa, "tarifs_licence_fft", src.id, newSaison.id);
    await cloneTable(supa, "tarifs_autres", src.id, newSaison.id);
  }

  return NextResponse.json({ ok: true, saison: newSaison });
}

async function cloneTable(
  supa: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  fromSaisonId: string,
  toSaisonId: string,
) {
  const { data, error } = await supa
    .from(table)
    .select("*")
    .eq("saison_id", fromSaisonId);
  if (error || !data) return;
  const rows = (data as Record<string, unknown>[]).map((r) => {
    const { id: _id, ...rest } = r;
    void _id;
    return { ...rest, saison_id: toSaisonId };
  });
  if (rows.length > 0) {
    await supa.from(table).insert(rows);
  }
}
