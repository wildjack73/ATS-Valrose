import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface CreateSaisonBody {
  code?: string;
  label?: string;
  domaine?: "stages" | "ecole";  // requis : à quel domaine appartient la saison
  cloneFrom?: string;            // code source à dupliquer (même domaine, optionnel)
}

// Tables liées à chaque domaine
const TABLES_STAGES = [
  "tarifs_stages_formules",
  "tarifs_options_f4",
  "semaines_stages",
] as const;
const TABLES_ECOLE = [
  "tarifs_cours_ecole",
  "tarifs_licence_fft",
  "tarifs_autres",
] as const;

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
  const domaine = body.domaine;
  if (!code) {
    return NextResponse.json({ error: "Code de saison requis" }, { status: 400 });
  }
  if (domaine !== "stages" && domaine !== "ecole") {
    return NextResponse.json(
      { error: "Domaine requis : 'stages' ou 'ecole'" },
      { status: 400 },
    );
  }

  const supa = getSupabaseAdmin();

  // 1. Créer la saison (non-active par défaut), du domaine demandé
  const { data: newSaison, error: saisonErr } = await supa
    .from("saisons")
    .insert({ code, label, active: false, order_idx: 0, domaine })
    .select("*")
    .single();
  if (saisonErr) {
    return NextResponse.json({ error: saisonErr.message }, { status: 500 });
  }

  // 2. Si cloneFrom, copier les tarifs depuis une saison du MÊME domaine
  if (body.cloneFrom) {
    const { data: src, error: srcErr } = await supa
      .from("saisons")
      .select("id")
      .eq("code", body.cloneFrom)
      .eq("domaine", domaine)
      .maybeSingle();
    if (srcErr || !src) {
      return NextResponse.json(
        { error: "Saison source introuvable (même domaine)" },
        { status: 400 },
      );
    }

    const tables = domaine === "stages" ? TABLES_STAGES : TABLES_ECOLE;
    for (const t of tables) {
      await cloneTable(supa, t, src.id, newSaison.id);
    }
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
