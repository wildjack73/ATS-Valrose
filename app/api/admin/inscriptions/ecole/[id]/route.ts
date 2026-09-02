import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STATUTS_VALIDES = ["en_attente", "paye", "annule"] as const;

interface PatchBody {
  statut?: string;
  paiement_info?: string | null;
  notes_admin?: string | null;
  desactive?: boolean;
  ajoute_au_groupe?: boolean;
  niveau?: string | null;
  niveau_attribue?: string | null;
  // Créneaux / disponibilités (édition admin) — CSV de libellés
  dispo_semaine?: string | null;
  // Coordonnées de la fiche (corrections admin)
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  date_naissance?: string;
  adresse?: string;
  code_postal_ville?: string;
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
  if (body.desactive !== undefined) {
    patch.desactive = Boolean(body.desactive);
  }
  if (body.ajoute_au_groupe !== undefined) {
    patch.ajoute_au_groupe = Boolean(body.ajoute_au_groupe);
  }
  if (body.niveau !== undefined) {
    patch.niveau = body.niveau ? String(body.niveau).trim() : null;
  }
  if (body.niveau_attribue !== undefined) {
    patch.niveau_attribue = body.niveau_attribue
      ? String(body.niveau_attribue).trim()
      : null;
  }
  if (body.dispo_semaine !== undefined) {
    patch.dispo_semaine = body.dispo_semaine
      ? String(body.dispo_semaine).trim()
      : null;
  }

  // Coordonnées de la fiche (corrections admin).
  for (const f of ["nom", "prenom"] as const) {
    if (body[f] !== undefined) {
      const v = String(body[f] ?? "").trim();
      if (!v) {
        return NextResponse.json(
          { error: "Le nom et le prénom ne peuvent pas être vides." },
          { status: 400 },
        );
      }
      patch[f] = v;
    }
  }
  for (const f of ["email", "telephone", "adresse", "code_postal_ville"] as const) {
    if (body[f] !== undefined) patch[f] = String(body[f] ?? "").trim();
  }
  if (body.date_naissance !== undefined) {
    const d = String(body.date_naissance ?? "").trim();
    if (d) patch.date_naissance = d;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("inscriptions_ecole")
    .update(patch)
    .eq("id", id);
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec mise à jour" }, { status: 500 });
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
    .from("inscriptions_ecole")
    .delete()
    .eq("id", id);
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec suppression" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
