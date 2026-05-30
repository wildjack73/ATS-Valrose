import { NextResponse } from "next/server";
import { stageFormSchema } from "@/lib/schemas/stage";
import {
  getActiveTarifsBundle,
  calculerPrixStageFromTarifs,
} from "@/lib/data/tarifs-server";
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

  // Honeypot
  if (data.website && data.website.length > 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Récupérer la saison active et ses tarifs
  const bundle = await getActiveTarifsBundle();
  if (!bundle) {
    return NextResponse.json(
      { error: "Aucune saison active configurée. Contactez le club." },
      { status: 500 },
    );
  }

  // Valider la formule
  const formule = bundle.formules.find((f) => f.code === data.formule);
  if (!formule) {
    return NextResponse.json(
      { error: "Formule invalide pour la saison en cours." },
      { status: 400 },
    );
  }

  // Valider créneau si nécessaire
  if (formule.needs_creneau && !data.formule_creneau) {
    return NextResponse.json(
      { error: "Choisissez un créneau (matin ou après-midi)." },
      { status: 400 },
    );
  }

  // Valider F4
  if (formule.is_a_la_carte) {
    if (
      !data.formule_4_selection ||
      data.formule_4_selection.length === 0
    ) {
      return NextResponse.json(
        { error: "Choisissez au moins un jour pour la formule à la carte." },
        { status: 400 },
      );
    }
    for (const it of data.formule_4_selection) {
      if (!bundle.optionsF4.find((o) => o.code === it.option)) {
        return NextResponse.json(
          { error: `Option F4 invalide : ${it.option}` },
          { status: 400 },
        );
      }
    }
  }

  // Valider semaine (doit être ouverte dans la saison active)
  const semaine = bundle.semaines.find(
    (s) => s.code === data.semaine && s.ouverte,
  );
  if (!semaine) {
    return NextResponse.json(
      { error: "Semaine indisponible." },
      { status: 400 },
    );
  }

  // Refuser si la formule est temporairement fermée aux inscriptions
  const formuleChoisie = bundle.formules.find((f) => f.code === data.formule);
  if (formuleChoisie?.ferme) {
    return NextResponse.json(
      {
        error:
          "Cette formule est actuellement complète. Merci de choisir une autre formule ou de nous contacter.",
      },
      { status: 400 },
    );
  }

  // Validation F4 : chaque jour avec une option demi-journée doit avoir
  // un créneau (matin / apres_midi). On s'appuie sur le détail de l'option
  // (mention « matin … après-midi ») pour détecter les demi-journées —
  // même heuristique que le formulaire client.
  if (formuleChoisie?.is_a_la_carte && data.formule_4_selection) {
    for (const item of data.formule_4_selection) {
      const opt = bundle.optionsF4.find((o) => o.code === item.option);
      const detail = (opt?.detail ?? "").toLowerCase();
      const isDemiJournee =
        detail.includes("matin") &&
        (detail.includes("après-midi") || detail.includes("apres-midi"));
      if (isDemiJournee && !item.creneau) {
        return NextResponse.json(
          {
            error: `Pour le jour « ${item.jour} », précisez « Matin » ou « Après-midi ».`,
          },
          { status: 400 },
        );
      }
    }
  }

  // Filtrer les jours déjeuner si la semaine ne le propose pas
  const dejeunerJours =
    semaine.dejeuner_disponible === false ? [] : data.formule_dejeuner_jours ?? [];

  // Calculer le prix
  const { prix: prix_total, error: prixError } = calculerPrixStageFromTarifs(
    bundle,
    {
      formuleCode: data.formule,
      dejeunerJours,
      formule4Selection: data.formule_4_selection,
    },
  );
  if (prixError || prix_total <= 0) {
    return NextResponse.json(
      { error: prixError ?? "Tarif calculé invalide." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: inserted, error } = await supabase
    .from("inscriptions_stages")
    .insert({
      saison_id: bundle.saisonStages.id,
      nom: data.nom,
      prenom: data.prenom,
      date_naissance: data.date_naissance,
      adresse: data.adresse,
      telephone: data.telephone,
      email: data.email,
      niveau: data.niveau || null,
      formule: data.formule,
      formule_creneau: data.formule_creneau ?? null,
      formule_dejeuner: dejeunerJours.length > 0,
      dejeuner_jours: dejeunerJours.length > 0 ? dejeunerJours : null,
      formule_4_selection:
        formule.is_a_la_carte ? data.formule_4_selection : null,
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

  try {
    await sendStageEmails(inserted as InscriptionStageRow);
  } catch (e) {
    console.error("Envoi emails stage:", e);
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
