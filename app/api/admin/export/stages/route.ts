import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { fetchStages } from "@/lib/admin/queries";
import { toXlsx } from "@/lib/admin/xlsx";
import {
  formuleLabel,
  creneauLabel,
  f4SelectionLabel,
  statutLabel,
} from "@/lib/admin/format";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const url = new URL(request.url);
  const semaine = url.searchParams.get("semaine") || undefined;
  const statut = url.searchParams.get("statut") || undefined;

  const rows = await fetchStages({ semaine, statut });

  const xlsx = await toXlsx(
    rows.map((r) => ({
      date_inscription: new Date(r.created_at).toLocaleString("fr-FR"),
      nom: r.nom,
      prenom: r.prenom,
      date_naissance: r.date_naissance,
      adresse: r.adresse,
      telephone: r.telephone,
      email: r.email,
      niveau: r.niveau ?? "",
      semaine: r.semaine_label,
      formule: formuleLabel(r.formule),
      creneau: creneauLabel(r.formule_creneau),
      dejeuner: r.formule_dejeuner ? "Oui" : "Non",
      formule_4_detail:
        r.formule === "formule_4" ? f4SelectionLabel(r.formule_4_selection) : "",
      prix_total: r.prix_total,
      statut: statutLabel(r.statut),
      notes: r.notes ?? "",
      notes_admin: r.notes_admin ?? "",
    })),
    [
      { key: "date_inscription", label: "Date inscription", width: 18 },
      { key: "nom", label: "Nom" },
      { key: "prenom", label: "Prénom" },
      { key: "date_naissance", label: "Date naissance", width: 15 },
      { key: "adresse", label: "Adresse", width: 30 },
      { key: "telephone", label: "Téléphone", width: 14 },
      { key: "email", label: "Email", width: 28 },
      { key: "niveau", label: "Niveau" },
      { key: "semaine", label: "Semaine", width: 22 },
      { key: "formule", label: "Formule", width: 20 },
      { key: "creneau", label: "Créneau" },
      { key: "dejeuner", label: "Déjeuner" },
      { key: "formule_4_detail", label: "Détail formule 4", width: 24 },
      { key: "prix_total", label: "Prix total (€)", numFmt: "0", width: 13 },
      { key: "statut", label: "Statut" },
      { key: "notes", label: "Notes", width: 30 },
      { key: "notes_admin", label: "Notes admin", width: 30 },
    ],
    { sheetName: "Stages" },
  );

  const filename = `inscriptions-stages-${new Date()
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
