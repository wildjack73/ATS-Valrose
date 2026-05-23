import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  Coach,
  GroupeEcole,
  GroupeWithMembers,
  GroupeMembre,
} from "@/lib/data/planning-types";

export async function fetchCoaches(): Promise<Coach[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("coaches")
    .select("*")
    .order("order_idx");
  if (error) {
    console.error("fetchCoaches:", error);
    return [];
  }
  return (data ?? []) as Coach[];
}

export async function fetchGroupesEcole(
  saisonId: string,
): Promise<GroupeWithMembers[]> {
  const supa = getSupabaseAdmin();

  const [{ data: groupes, error: e1 }, { data: coaches, error: e2 }] =
    await Promise.all([
      supa
        .from("groupes_ecole")
        .select("*")
        .eq("saison_id", saisonId)
        .order("jour")
        .order("heure_debut")
        .order("order_idx"),
      supa.from("coaches").select("*").order("order_idx"),
    ]);

  if (e1 || !groupes) {
    if (e1) console.error("fetchGroupesEcole:", e1);
    return [];
  }
  if (e2) console.error("fetchGroupesEcole coaches:", e2);

  const groupeIds = (groupes as GroupeEcole[]).map((g) => g.id);
  if (groupeIds.length === 0) return [];

  // Récupérer toutes les liaisons inscriptions ↔ groupes
  const { data: liaisons, error: e3 } = await supa
    .from("inscriptions_groupes")
    .select("groupe_id, inscription_id")
    .in("groupe_id", groupeIds);
  if (e3) console.error("fetchGroupesEcole liaisons:", e3);

  const inscriptionIds = Array.from(
    new Set((liaisons ?? []).map((l) => l.inscription_id as string)),
  );

  let inscriptionsByGroupe = new Map<string, GroupeMembre[]>();

  if (inscriptionIds.length > 0) {
    const { data: inscriptions, error: e4 } = await supa
      .from("inscriptions_ecole")
      .select(
        "id, nom, prenom, date_naissance, niveau, email, telephone",
      )
      .in("id", inscriptionIds);
    if (e4) console.error("fetchGroupesEcole inscriptions:", e4);

    const inscriptionById = new Map<string, GroupeMembre>();
    for (const i of inscriptions ?? []) {
      const ins = i as Record<string, string>;
      inscriptionById.set(ins.id, {
        inscription_id: ins.id,
        nom: ins.nom,
        prenom: ins.prenom,
        date_naissance: ins.date_naissance,
        niveau: ins.niveau ?? null,
        email: ins.email,
        telephone: ins.telephone,
      });
    }

    for (const l of liaisons ?? []) {
      const membre = inscriptionById.get(l.inscription_id as string);
      if (!membre) continue;
      const arr = inscriptionsByGroupe.get(l.groupe_id as string) ?? [];
      arr.push(membre);
      inscriptionsByGroupe.set(l.groupe_id as string, arr);
    }
  }

  const coachById = new Map<string, Coach>(
    (coaches as Coach[] | null ?? []).map((c) => [c.id, c]),
  );

  return (groupes as GroupeEcole[]).map((g) => ({
    ...g,
    coach: g.coach_id ? coachById.get(g.coach_id) ?? null : null,
    membres: (inscriptionsByGroupe.get(g.id) ?? []).sort((a, b) =>
      a.nom.localeCompare(b.nom),
    ),
  }));
}

/** Inscriptions école qui ne sont assignées à AUCUN groupe (= "à placer"). */
export async function fetchInscriptionsSansGroupe(
  saisonId: string,
): Promise<GroupeMembre[]> {
  const supa = getSupabaseAdmin();

  const { data: inscriptions, error } = await supa
    .from("inscriptions_ecole")
    .select("id, nom, prenom, date_naissance, niveau, email, telephone")
    .eq("saison_id", saisonId)
    .order("nom");
  if (error || !inscriptions) {
    if (error) console.error("fetchInscriptionsSansGroupe:", error);
    return [];
  }

  const ids = (inscriptions as Record<string, string>[]).map((i) => i.id);
  if (ids.length === 0) return [];

  const { data: liaisons, error: e2 } = await supa
    .from("inscriptions_groupes")
    .select("inscription_id")
    .in("inscription_id", ids);
  if (e2) console.error("fetchInscriptionsSansGroupe liaisons:", e2);

  const assignees = new Set(
    (liaisons ?? []).map((l) => l.inscription_id as string),
  );

  return (inscriptions as Record<string, string>[])
    .filter((i) => !assignees.has(i.id))
    .map((i) => ({
      inscription_id: i.id,
      nom: i.nom,
      prenom: i.prenom,
      date_naissance: i.date_naissance,
      niveau: i.niveau ?? null,
      email: i.email,
      telephone: i.telephone,
    }));
}
