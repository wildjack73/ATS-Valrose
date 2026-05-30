import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface InscriptionAVerifier {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  semaine_label: string;
  formule: string;
  formule_4_selection:
    | {
        jour: string;
        option: string;
        creneau?: "matin" | "apres_midi" | null;
      }[]
    | null;
  dejeuner_jours: string[] | null;
  prix_total: number;
  notes_admin: string;
}

export interface DoublonGroupe {
  prenom: string;
  nom: string;
  semaine_label: string;
  inscriptions: {
    id: string;
    date_naissance: string;
    email: string;
    telephone: string;
    prix_total: number;
    created_at: string;
  }[];
}

export interface ChecksRapport {
  total: number;
  f4Options: InscriptionAVerifier[];
  fichesIncompletes: InscriptionAVerifier[];
  datesSuspectes: InscriptionAVerifier[];
  doublons: DoublonGroupe[];
}

/**
 * Renvoie toutes les inscriptions qui demandent une action humaine :
 *  - ⚠ FORMULE 4 : OPTION À DÉFINIR
 *  - ⚠ Email à compléter / Adresse à compléter
 *  - ⚠ Date de naissance à vérifier
 *  - doublons probables (mêmes prénom+nom+semaine)
 */
export async function fetchChecksRapport(): Promise<ChecksRapport> {
  const supa = getSupabaseAdmin();

  const { data: flagged, error: e1 } = await supa
    .from("inscriptions_stages")
    .select(
      "id, prenom, nom, email, telephone, semaine_label, formule, formule_4_selection, dejeuner_jours, prix_total, notes_admin, created_at",
    )
    .like("notes_admin", "%⚠%")
    .order("nom");

  if (e1) console.error("fetchChecksRapport flagged:", e1);
  const flaggedRows = (flagged ?? []) as (InscriptionAVerifier & {
    created_at: string;
  })[];

  const f4Options = flaggedRows.filter((r) =>
    r.notes_admin.includes("OPTION À DÉFINIR"),
  );
  const fichesIncompletes = flaggedRows.filter(
    (r) =>
      r.notes_admin.includes("Email à compléter") ||
      r.notes_admin.includes("Adresse à compléter"),
  );
  const datesSuspectes = flaggedRows.filter((r) =>
    r.notes_admin.includes("Date de naissance"),
  );

  // Doublons : mêmes prénom+nom+semaine
  const { data: allRows } = await supa
    .from("inscriptions_stages")
    .select("id, prenom, nom, semaine_label, date_naissance, email, telephone, prix_total, created_at")
    .order("nom");

  const byKey = new Map<
    string,
    DoublonGroupe["inscriptions"] & { prenom?: string; nom?: string; semaine_label?: string }
  >();
  const meta = new Map<string, { prenom: string; nom: string; semaine_label: string }>();
  for (const r of (allRows ?? []) as Array<{
    id: string;
    prenom: string;
    nom: string;
    semaine_label: string;
    date_naissance: string;
    email: string;
    telephone: string;
    prix_total: number;
    created_at: string;
  }>) {
    const key = `${r.prenom.trim().toLowerCase()}|${r.nom.trim().toLowerCase()}|${r.semaine_label}`;
    if (!byKey.has(key)) {
      byKey.set(key, [] as DoublonGroupe["inscriptions"]);
      meta.set(key, { prenom: r.prenom, nom: r.nom, semaine_label: r.semaine_label });
    }
    byKey.get(key)!.push({
      id: r.id,
      date_naissance: r.date_naissance,
      email: r.email,
      telephone: r.telephone,
      prix_total: r.prix_total,
      created_at: r.created_at,
    });
  }
  const doublons: DoublonGroupe[] = [];
  for (const [key, ins] of byKey.entries()) {
    if (ins.length > 1) {
      const m = meta.get(key)!;
      doublons.push({ ...m, inscriptions: ins });
    }
  }
  doublons.sort(
    (a, b) =>
      a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom),
  );

  const total =
    f4Options.length +
    fichesIncompletes.length +
    datesSuspectes.length +
    doublons.length;

  return { total, f4Options, fichesIncompletes, datesSuspectes, doublons };
}
