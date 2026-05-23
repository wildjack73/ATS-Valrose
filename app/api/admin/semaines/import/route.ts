import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { fetchVacancesScolaires } from "@/lib/data/vacances-api";

export const runtime = "nodejs";

/**
 * POST /api/admin/semaines/import
 * body: { saisonId: string, location?: string, anneeScolaire?: string, replaceExisting?: boolean }
 *
 * Récupère les vacances scolaires officielles et insère les semaines en DB.
 * Si replaceExisting=true, supprime d'abord toutes les semaines existantes de la saison.
 */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = (await request.json()) as {
    saisonId?: string;
    location?: string;
    anneeScolaire?: string;
    replaceExisting?: boolean;
  };

  if (!body.saisonId) {
    return NextResponse.json({ error: "saisonId requis" }, { status: 400 });
  }

  const supa = getSupabaseAdmin();

  // Récupère la saison pour avoir le code (utilisé comme anneeScolaire par défaut)
  const { data: saison, error: saisonErr } = await supa
    .from("saisons")
    .select("*")
    .eq("id", body.saisonId)
    .maybeSingle();
  if (saisonErr || !saison) {
    return NextResponse.json({ error: "Saison introuvable" }, { status: 404 });
  }

  const location = body.location ?? "Nice";
  const anneeScolaire = body.anneeScolaire ?? saison.code;

  let semaines;
  try {
    semaines = await fetchVacancesScolaires(location, anneeScolaire);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `Échec API vacances : ${e.message}`
            : "Échec API vacances scolaires",
      },
      { status: 502 },
    );
  }

  if (semaines.length === 0) {
    return NextResponse.json(
      { error: "Aucune vacances scolaire trouvée pour cette location/année." },
      { status: 404 },
    );
  }

  // Optionnel : supprimer les semaines existantes de la saison
  if (body.replaceExisting) {
    const { error: delErr } = await supa
      .from("semaines_stages")
      .delete()
      .eq("saison_id", body.saisonId);
    if (delErr) {
      return NextResponse.json(
        { error: `Échec suppression : ${delErr.message}` },
        { status: 500 },
      );
    }
  }

  // Règles métier : pas de déjeuner à Noël ni sur les semaines qui démarrent en juin
  function dejeunerDispo(code: string, dateDebut: string): boolean {
    if (code.startsWith("noel")) return false;
    const month = parseInt(dateDebut.slice(5, 7), 10); // YYYY-MM-DD
    if (month === 6) return false;
    return true;
  }

  // Insertion (upsert sur (saison_id, code))
  const toInsert = semaines.map((s) => ({
    saison_id: body.saisonId,
    code: s.code,
    periode: s.periode,
    label: s.label,
    date_debut: s.date_debut,
    ouverte: true,
    dejeuner_disponible: dejeunerDispo(s.code, s.date_debut),
    order_idx: s.order_idx,
  }));

  const { error: insertErr } = await supa
    .from("semaines_stages")
    .upsert(toInsert, { onConflict: "saison_id,code" });

  if (insertErr) {
    return NextResponse.json(
      { error: `Échec insertion : ${insertErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    count: semaines.length,
    location,
    anneeScolaire,
  });
}
