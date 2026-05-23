import { FORMULES, OPTIONS_F4, type FormuleId } from "@/lib/data/stages";
import {
  COURS_TENNIS,
  COURS_PADEL,
  MODES_REGLEMENT,
  LICENCE_FFT,
  type CoursTennisId,
  type CoursPadelId,
  type ModeReglementId,
  type LicenceFftId,
} from "@/lib/data/ecole";

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function age(dateNaissance: string): number | null {
  try {
    const d = new Date(dateNaissance);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
    return years;
  } catch {
    return null;
  }
}

export function formuleLabel(id: FormuleId): string {
  return FORMULES.find((f) => f.id === id)?.titre ?? id;
}

export function creneauLabel(c: string | null): string {
  if (!c) return "";
  if (c === "matin") return "Matin";
  if (c === "apres_midi") return "Après-midi";
  return c;
}

export function f4SelectionLabel(
  sel: { jour: string; option: string }[] | null,
): string {
  if (!sel || sel.length === 0) return "";
  return sel
    .map((s) => {
      const opt = OPTIONS_F4[s.option as keyof typeof OPTIONS_F4];
      return `${s.jour} (${opt?.label ?? s.option}, ${opt?.prix ?? 0}€)`;
    })
    .join(", ");
}

export function statutLabel(s: string): string {
  if (s === "en_attente") return "En attente";
  if (s === "paye") return "Payé";
  if (s === "annule") return "Annulé";
  return s;
}

export function statutBadgeClass(s: string): string {
  if (s === "paye")
    return "bg-green-100 text-green-800 ring-1 ring-green-300";
  if (s === "annule")
    return "bg-red-100 text-red-700 ring-1 ring-red-300";
  return "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300";
}

/** Classe de fond pour la ligne complète selon le statut */
export function statutRowClass(s: string): string {
  if (s === "paye") return "bg-green-50/40 hover:bg-green-50/80";
  if (s === "annule") return "bg-red-50/40 hover:bg-red-50/80";
  return "hover:bg-yellow-50/40";
}

export function coursTennisLabels(ids: CoursTennisId[] | null | undefined) {
  if (!ids?.length) return "";
  return ids
    .map((id) => COURS_TENNIS.find((c) => c.id === id)?.label ?? id)
    .join(", ");
}

export function coursPadelLabels(ids: CoursPadelId[] | null | undefined) {
  if (!ids?.length) return "";
  return ids
    .map((id) => COURS_PADEL.find((c) => c.id === id)?.label ?? id)
    .join(", ");
}

export function modeReglementLabel(id: ModeReglementId) {
  return MODES_REGLEMENT.find((m) => m.id === id)?.label ?? id;
}

export function licenceFftLabel(id: LicenceFftId) {
  return LICENCE_FFT.find((l) => l.id === id)?.label ?? id;
}
