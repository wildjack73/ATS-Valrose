import { NextResponse } from "next/server";
import { ecoleFormSchema } from "@/lib/schemas/ecole";
import {
  getActiveTarifsBundle,
  calculerPrixEcoleFromTarifs,
} from "@/lib/data/tarifs-server";
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

  const bundle = await getActiveTarifsBundle();
  if (!bundle) {
    return NextResponse.json(
      { error: "Aucune saison active configurée. Contactez le club." },
      { status: 500 },
    );
  }

  // Valider les codes + refuser si le cours est temporairement fermé
  for (const code of data.cours_tennis ?? []) {
    const cours = bundle.coursTennis.find((c) => c.code === code);
    if (!cours) {
      return NextResponse.json(
        { error: `Cours tennis invalide : ${code}` },
        { status: 400 },
      );
    }
    if (cours.ferme) {
      return NextResponse.json(
        {
          error: `Le cours « ${cours.label} » est actuellement complet. Merci de choisir un autre cours.`,
        },
        { status: 400 },
      );
    }
  }
  for (const code of data.cours_padel ?? []) {
    const cours = bundle.coursPadel.find((c) => c.code === code);
    if (!cours) {
      return NextResponse.json(
        { error: `Cours padel invalide : ${code}` },
        { status: 400 },
      );
    }
    if (cours.ferme) {
      return NextResponse.json(
        {
          error: `Le cours « ${cours.label} » est actuellement complet. Merci de choisir un autre cours.`,
        },
        { status: 400 },
      );
    }
  }
  if (!bundle.licenceFft.find((l) => l.code === data.licence_fft)) {
    return NextResponse.json(
      { error: `Licence FFT invalide : ${data.licence_fft}` },
      { status: 400 },
    );
  }

  const prix_total = calculerPrixEcoleFromTarifs(bundle, {
    coursTennisCodes: data.cours_tennis ?? [],
    coursPadelCodes: data.cours_padel ?? [],
    licenceFftCode: data.licence_fft,
  });

  const supabase = getSupabaseAdmin();
  const { data: inserted, error } = await supabase
    .from("inscriptions_ecole")
    .insert({
      saison_id: bundle.saisonEcole.id,
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
