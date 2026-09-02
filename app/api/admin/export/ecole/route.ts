import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { fetchEcole } from "@/lib/admin/queries";
import { toXlsx } from "@/lib/admin/xlsx";
import {
  coursTennisLabels,
  coursPadelLabels,
  coursPickleballLabels,
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

  const xlsx = await toXlsx(
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
      cours_pickleball: coursPickleballLabels(r.cours_pickleball),
      pickleball: r.licence_pickleball ? "Oui" : "Non",
      prix_total: r.prix_total,
      dispo_mercredi: r.dispo_mercredi ?? "",
      dispo_samedi: r.dispo_samedi ?? "",
      dispo_semaine: r.dispo_semaine ?? "",
      mode_reglement: modeReglementLabel(r.mode_reglement),
      nb_paiements: r.nb_paiements,
      licence_fft: licenceFftLabel(r.licence_fft),
      statut: statutLabel(r.statut),
      groupe: r.ajoute_au_groupe ? "Oui" : "Non",
      prevenu: r.prevenu_at
        ? new Date(r.prevenu_at).toLocaleDateString("fr-FR")
        : "",
      notes: r.notes ?? "",
      notes_admin: r.notes_admin ?? "",
    })),
    [
      { key: "date_inscription", label: "Date inscription", width: 18 },
      { key: "nom", label: "Nom" },
      { key: "prenom", label: "Prénom" },
      { key: "date_naissance", label: "Date naissance", width: 15 },
      { key: "adresse", label: "Adresse", width: 30 },
      { key: "code_postal_ville", label: "Code postal & ville", width: 22 },
      { key: "telephone", label: "Téléphone", width: 14 },
      { key: "email", label: "Email", width: 28 },
      { key: "niveau", label: "Niveau" },
      { key: "cours_tennis", label: "Cours tennis", width: 24 },
      { key: "cours_padel", label: "Cours padel", width: 22 },
      { key: "cours_pickleball", label: "Cours pickleball", width: 24 },
      { key: "pickleball", label: "Licence pickleball", width: 15 },
      { key: "prix_total", label: "Prix total (€)", numFmt: "0", width: 13 },
      { key: "dispo_mercredi", label: "Dispo mercredi", width: 16 },
      { key: "dispo_samedi", label: "Dispo samedi", width: 16 },
      { key: "dispo_semaine", label: "Dispo semaine", width: 28 },
      { key: "mode_reglement", label: "Mode règlement", width: 16 },
      { key: "nb_paiements", label: "Nb paiements", numFmt: "0", width: 12 },
      { key: "licence_fft", label: "Licence FFT", width: 16 },
      { key: "statut", label: "Statut" },
      { key: "groupe", label: "Ajouté au groupe", width: 15 },
      { key: "prevenu", label: "Prévenu le", width: 14 },
      { key: "notes", label: "Notes", width: 30 },
      { key: "notes_admin", label: "Notes admin", width: 30 },
    ],
    { sheetName: "École" },
  );

  const filename = `inscriptions-ecole-${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(xlsx), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
