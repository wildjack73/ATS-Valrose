import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { fetchEcole } from "@/lib/admin/queries";
import { toCsv } from "@/lib/admin/csv";
import {
  coursTennisLabels,
  coursPadelLabels,
  modeReglementLabel,
  licenceFftLabel,
  statutLabel,
} from "@/lib/admin/format";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const url = new URL(request.url);
  const statut = url.searchParams.get("statut") || undefined;

  const rows = await fetchEcole({ statut });

  const csv = toCsv(
    rows.map((r) => ({
      date_inscription: new Date(r.created_at).toLocaleString("fr-FR"),
      nom: r.nom,
      prenom: r.prenom,
      date_naissance: r.date_naissance,
      adresse: r.adresse,
      code_postal_ville: r.code_postal_ville,
      telephone: r.telephone,
      email: r.email,
      niveau: r.niveau ?? "",
      cours_tennis: coursTennisLabels(r.cours_tennis),
      cours_padel: coursPadelLabels(r.cours_padel),
      pickleball: r.licence_pickleball ? "Oui" : "Non",
      prix_total: r.prix_total,
      dispo_mercredi: r.dispo_mercredi ?? "",
      dispo_samedi: r.dispo_samedi ?? "",
      dispo_semaine: r.dispo_semaine ?? "",
      mode_reglement: modeReglementLabel(r.mode_reglement),
      nb_paiements: r.nb_paiements,
      licence_fft: licenceFftLabel(r.licence_fft),
      statut: statutLabel(r.statut),
      notes: r.notes ?? "",
      notes_admin: r.notes_admin ?? "",
    })),
    [
      { key: "date_inscription", label: "Date inscription" },
      { key: "nom", label: "Nom" },
      { key: "prenom", label: "Prénom" },
      { key: "date_naissance", label: "Date naissance" },
      { key: "adresse", label: "Adresse" },
      { key: "code_postal_ville", label: "Code postal & ville" },
      { key: "telephone", label: "Téléphone" },
      { key: "email", label: "Email" },
      { key: "niveau", label: "Niveau" },
      { key: "cours_tennis", label: "Cours tennis" },
      { key: "cours_padel", label: "Cours padel" },
      { key: "pickleball", label: "Licence pickleball" },
      { key: "prix_total", label: "Prix total (€)" },
      { key: "dispo_mercredi", label: "Dispo mercredi" },
      { key: "dispo_samedi", label: "Dispo samedi" },
      { key: "dispo_semaine", label: "Dispo semaine" },
      { key: "mode_reglement", label: "Mode règlement" },
      { key: "nb_paiements", label: "Nb paiements" },
      { key: "licence_fft", label: "Licence FFT" },
      { key: "statut", label: "Statut" },
      { key: "notes", label: "Notes" },
      { key: "notes_admin", label: "Notes admin" },
    ],
  );

  const filename = `inscriptions-ecole-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
