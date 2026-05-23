import { NextResponse } from "next/server";
import { stageFormSchema } from "@/lib/schemas/stage";
import { SEMAINES, calculerPrix } from "@/lib/data/stages";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendStageEmails } from "@/lib/email/send";
import type { InscriptionStageRow } from "@/lib/types/db";

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

  const parsed = stageFormSchema.safeParse(body);
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

  // Honeypot — si rempli, on considère que c'est un bot, on renvoie 200 silencieux.
  if (data.website && data.website.length > 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const semaine = SEMAINES.find((s) => s.id === data.semaine && s.ouverte);
  if (!semaine) {
    return NextResponse.json(
      { error: "Semaine indisponible." },
      { status: 400 },
    );
  }

  const prix_total = calculerPrix({
    formule: data.formule,
    dejeuner: data.formule_dejeuner,
    formule4Selection: data.formule_4_selection,
  });

  if (prix_total <= 0) {
    return NextResponse.json(
      { error: "Tarif calculé invalide." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: inserted, error } = await supabase
    .from("inscriptions_stages")
    .insert({
      nom: data.nom,
      prenom: data.prenom,
      date_naissance: data.date_naissance,
      adresse: data.adresse,
      telephone: data.telephone,
      email: data.email,
      niveau: data.niveau || null,
      formule: data.formule,
      formule_creneau: data.formule_creneau ?? null,
      formule_dejeuner: data.formule_dejeuner ?? false,
      formule_4_selection:
        data.formule === "formule_4" ? data.formule_4_selection : null,
      semaine: data.semaine,
      semaine_label: `${semaine.periode} — ${semaine.label}`,
      prix_total,
      notes: data.notes || null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Erreur insertion stage:", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer l'inscription. Réessayez plus tard." },
      { status: 500 },
    );
  }

  // Emails best-effort — n'échoue pas la requête si Resend est mal configuré
  try {
    await sendStageEmails(inserted as InscriptionStageRow);
  } catch (e) {
    console.error("Envoi emails stage:", e);
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
