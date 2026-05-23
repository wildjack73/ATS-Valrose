import { NextResponse } from "next/server";
import { ecoleFormSchema } from "@/lib/schemas/ecole";
import { calculerPrixEcole } from "@/lib/data/ecole";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendEcoleEmails } from "@/lib/email/send";
import type { InscriptionEcoleRow } from "@/lib/types/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requête invalide (JSON attendu)." },
      { status: 400 },
    );
  }

  const parsed = ecoleFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Formulaire invalide.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const data = parsed.data;

  if (data.website && data.website.length > 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const prix_total = calculerPrixEcole({
    cours_tennis: data.cours_tennis ?? [],
    cours_padel: data.cours_padel ?? [],
    licence_fft: data.licence_fft,
  });

  const supabase = getSupabaseAdmin();
  const { data: inserted, error } = await supabase
    .from("inscriptions_ecole")
    .insert({
      nom: data.nom,
      prenom: data.prenom,
      date_naissance: data.date_naissance,
      adresse: data.adresse,
      code_postal_ville: data.code_postal_ville,
      telephone: data.telephone,
      email: data.email,
      niveau: data.niveau || null,
      cours_tennis: data.cours_tennis ?? [],
      cours_padel: data.cours_padel ?? [],
      licence_pickleball: data.licence_pickleball ?? false,
      prix_total,
      dispo_mercredi: data.dispo_mercredi || null,
      dispo_samedi: data.dispo_samedi || null,
      dispo_semaine: data.dispo_semaine || null,
      mode_reglement: data.mode_reglement,
      nb_paiements: data.nb_paiements,
      licence_fft: data.licence_fft,
      notes: data.notes || null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Erreur insertion école:", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer l'inscription. Réessayez plus tard." },
      { status: 500 },
    );
  }

  try {
    await sendEcoleEmails(inserted as InscriptionEcoleRow);
  } catch (e) {
    console.error("Envoi emails école:", e);
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
