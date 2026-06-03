import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getTarifsBundle, getActiveSaison } from "@/lib/data/tarifs-server";

export const runtime = "nodejs";

const STATUTS_VALIDES = ["en_attente", "paye", "annule"] as const;

type F4Item = { jour: string; option: string };

interface PatchBody {
  statut?: string;
  paiement_info?: string | null;
  notes_admin?: string | null;
  formule_4_selection?: F4Item[];
  desactive?: boolean;
  niveau?: string | null;
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
  if (body.niveau !== undefined) {
    patch.niveau = body.niveau ? String(body.niveau).trim() : null;
  }

  // Édition de la sélection Formule 4 → on recalcule le prix côté serveur
  if (body.formule_4_selection !== undefined) {
    const supa = getSupabaseAdmin();
    const { data: row } = await supa
      .from("inscriptions_stages")
      .select("saison_id, formule, dejeuner_jours")
      .eq("id", id)
      .maybeSingle();
    if (!row || row.formule !== "formule_4") {
      return NextResponse.json(
        { error: "Sélection F4 modifiable uniquement sur une Formule 4." },
        { status: 400 },
      );
    }
    // On a besoin du bundle Stages pour valider les options F4 + recalculer
    // le prix. La saison école n'a pas d'impact ici mais le bundle l'exige,
    // donc on prend l'école active du moment (peu importe laquelle).
    const sEcole = await getActiveSaison("ecole");
    const bundle = await getTarifsBundle({
      saisonStagesId: row.saison_id,
      saisonEcoleId: sEcole?.id ?? row.saison_id,
    });
    if (!bundle) {
      return NextResponse.json({ error: "Saison introuvable." }, { status: 400 });
    }
    const sel = body.formule_4_selection.filter((it) => it.jour && it.option);
    // Valider les options + sommer
    let optionsTotal = 0;
    for (const it of sel) {
      const opt = bundle.optionsF4.find((o) => o.code === it.option);
      if (!opt) {
        return NextResponse.json(
          { error: `Option F4 invalide : ${it.option}` },
          { status: 400 },
        );
      }
      optionsTotal += opt.prix;
    }
    // Recalcule le repas à partir des jours déjà enregistrés (prix club = F3)
    const dejJours = Array.isArray(row.dejeuner_jours)
      ? (row.dejeuner_jours as string[])
      : [];
    const f3 = bundle.formules.find((f) => f.has_dejeuner_option);
    let prixDejeuner = 0;
    if (dejJours.length > 0 && f3) {
      prixDejeuner =
        dejJours.length >= 5
          ? f3.prix_dejeuner ?? 0
          : dejJours.length * (f3.prix_dejeuner_jour ?? 0);
    }
    patch.formule_4_selection = sel;
    patch.prix_total = optionsTotal + prixDejeuner;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("inscriptions_stages")
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
    .from("inscriptions_stages")
    .delete()
    .eq("id", id);
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec suppression" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
