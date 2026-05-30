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
    "ferme",
  ],
  "options-f4": ["label", "prix", "detail", "order_idx"],
  semaines: [
    "periode",
    "label",
    "date_debut",
    "ouverte",
    "dejeuner_disponible",
    "code",
    "order_idx",
  ],
  "cours-ecole": ["label", "description", "prix", "order_idx", "ferme"],
  "licence-fft": ["label", "prix", "order_idx"],
  autres: ["category", "label", "prix", "detail", "order_idx"],
};

const DELETABLE = new Set(["semaines", "autres"]);

async function requireAdminOr401() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return null;
}

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  const denied = await requireAdminOr401();
  if (denied) return denied;
  const { resource, id } = await params;
  const table = RESOURCE_TO_TABLE[resource];
  const allowed = RESOURCE_ALLOWED_FIELDS[resource];
  if (!table || !allowed) {
    return NextResponse.json({ error: "Ressource inconnue" }, { status: 400 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const updateData = pickAllowed(body, allowed);
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "Aucun champ valide à modifier" },
      { status: 400 },
    );
  }
  const { error } = await getSupabaseAdmin()
    .from(table)
    .update(updateData)
    .eq("id", id);
  if (error) {
    console.error("[admin tarifs PATCH]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  const denied = await requireAdminOr401();
  if (denied) return denied;
  const { resource, id } = await params;
  if (!DELETABLE.has(resource)) {
    return NextResponse.json(
      { error: "Suppression non autorisée pour cette ressource" },
      { status: 400 },
    );
  }
  const table = RESOURCE_TO_TABLE[resource];
  const { error } = await getSupabaseAdmin().from(table).delete().eq("id", id);
  if (error) {
    console.error("[admin tarifs DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
