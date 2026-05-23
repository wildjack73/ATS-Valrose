import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const RESOURCE_TO_TABLE: Record<string, string> = {
  formules: "tarifs_stages_formules",
  "options-f4": "tarifs_options_f4",
  semaines: "semaines_stages",
  "cours-ecole": "tarifs_cours_ecole",
  "licence-fft": "tarifs_licence_fft",
  autres: "tarifs_autres",
};

const RESOURCE_ALLOWED_FIELDS: Record<string, string[]> = {
  formules: [
    "titre",
    "sous_titre",
    "description",
    "prix",
    "prix_dejeuner",
    "prix_dejeuner_jour",
    "details_horaires",
    "order_idx",
  ],
  "options-f4": ["label", "prix", "detail", "order_idx"],
  semaines: [
    "periode",
    "label",
    "date_debut",
    "ouverte",
    "dejeuner_disponible",
    "code",
    "saison_id",
    "order_idx",
  ],
  "cours-ecole": ["label", "prix", "order_idx"],
  "licence-fft": ["label", "prix", "order_idx"],
  autres: ["category", "label", "prix", "detail", "order_idx", "saison_id"],
};

function pickAllowed(
  data: Record<string, unknown>,
  allowed: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in data) out[k] = data[k];
  }
  return out;
}

async function requireAdminOr401() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return null;
}

/** POST = créer (pour semaines + autres qui supportent l'ajout). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const denied = await requireAdminOr401();
  if (denied) return denied;
  const { resource } = await params;
  const table = RESOURCE_TO_TABLE[resource];
  const allowed = RESOURCE_ALLOWED_FIELDS[resource];
  if (!table || !allowed) {
    return NextResponse.json({ error: "Ressource inconnue" }, { status: 400 });
  }
  if (resource !== "semaines" && resource !== "autres") {
    return NextResponse.json(
      { error: "Ajout non supporté pour cette ressource" },
      { status: 400 },
    );
  }
  const body = (await request.json()) as Record<string, unknown>;
  const insertData = pickAllowed(body, allowed);
  if (!insertData.saison_id) {
    return NextResponse.json({ error: "saison_id requis" }, { status: 400 });
  }
  const { data, error } = await getSupabaseAdmin()
    .from(table)
    .insert(insertData)
    .select("*")
    .single();
  if (error) {
    console.error("[admin tarifs POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}
