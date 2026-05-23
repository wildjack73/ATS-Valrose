import "server-only";

/**
 * Récupère le calendrier scolaire officiel depuis l'API data.education.gouv.fr
 * et le découpe en semaines Lundi-Vendredi exploitables pour les stages.
 */

const API_URL =
  "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records";

type ApiRecord = {
  description: string;
  start_date: string; // ISO
  end_date: string;   // ISO
  annee_scolaire: string;
  location: string;
  zones: string;
};

/**
 * Semaine déduite (Lundi → Vendredi), prête à insérer en DB.
 */
export interface SemaineImportee {
  code: string;
  periode: string;
  label: string;
  date_debut: string;  // YYYY-MM-DD
  order_idx: number;
}

const MOIS_FR: Record<number, string> = {
  1: "janvier",
  2: "février",
  3: "mars",
  4: "avril",
  5: "mai",
  6: "juin",
  7: "juillet",
  8: "août",
  9: "septembre",
  10: "octobre",
  11: "novembre",
  12: "décembre",
};

function fmtJj(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

function nextMonday(d: Date): Date {
  const out = new Date(d);
  const day = out.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  let toAdd: number;
  if (day === 1) toAdd = 0;
  else if (day === 0) toAdd = 1;
  else toAdd = 8 - day;
  return addDays(out, toAdd);
}

/**
 * Décompose une période [start, end] en semaines Lundi-Vendredi
 * dont le Vendredi reste inclus dans la période.
 */
function splitIntoWeeks(start: Date, end: Date): { lundi: Date; vendredi: Date }[] {
  const out: { lundi: Date; vendredi: Date }[] = [];
  let mon = nextMonday(start);
  let safety = 0;
  while (safety++ < 20) {
    const ven = addDays(mon, 4);
    // On garde la semaine si le lundi est dans la période OU si la majorité tombe dedans
    if (mon > end) break;
    out.push({ lundi: new Date(mon), vendredi: new Date(ven) });
    mon = addDays(mon, 7);
  }
  return out;
}

/** Génère le label "Du DD/MM au DD/MM" pour une semaine. */
function labelSemaine(lundi: Date, vendredi: Date): string {
  return `Du ${fmtJj(lundi)} au ${fmtJj(vendredi)}`;
}

/**
 * Retourne les semaines de vacances scolaires pour une zone/saison donnée.
 * `anneeScolaire` doit être au format "2026-2027".
 */
export async function fetchVacancesScolaires(
  location: string,
  anneeScolaire: string,
): Promise<SemaineImportee[]> {
  const where = `location="${location}" and annee_scolaire="${anneeScolaire}"`;
  const url = `${API_URL}?where=${encodeURIComponent(where)}&limit=20&order_by=start_date`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`API vacances scolaires: HTTP ${res.status}`);
  }
  const json = (await res.json()) as { results?: ApiRecord[] };
  const records = json.results ?? [];

  // Année de début (ex "2026-2027" → 2026)
  const [yearStartStr, yearEndStr] = anneeScolaire.split("-");
  const yearStart = parseInt(yearStartStr, 10);
  const yearEnd = parseInt(yearEndStr, 10);
  void yearStart;

  const semaines: SemaineImportee[] = [];
  let orderIdx = 10;

  for (const r of records) {
    const start = new Date(r.start_date);
    const end = new Date(r.end_date);
    const desc = r.description.toLowerCase();

    // Cas spécial été : on prend l'entrée "Début des Vacances d'Été" et on génère 9 semaines
    if (desc.includes("vacances d'été") || desc.includes("vacances d'ete")) {
      const startEte = nextMonday(start);
      let mon = startEte;
      // Juillet : on génère jusqu'à fin juillet (4-5 semaines)
      // Août : on génère jusqu'à fin août (4 semaines)
      for (let i = 0; i < 9; i++) {
        const ven = addDays(mon, 4);
        const monthName = MOIS_FR[mon.getUTCMonth() + 1];
        const periodeSuffix =
          monthName === "juillet"
            ? `Juillet`
            : monthName === "août"
              ? `Août`
              : monthName;
        const num =
          semaines.filter((s) =>
            s.code.startsWith(`ete_${monthName === "août" ? "aout" : monthName}_`),
          ).length + 1;
        const monthSlug = monthName === "août" ? "aout" : monthName;
        semaines.push({
          code: `ete_${monthSlug}_${num}`,
          periode: `Été ${yearEnd} — ${periodeSuffix}`,
          label: labelSemaine(mon, ven),
          date_debut: isoDay(mon),
          order_idx: orderIdx,
        });
        orderIdx += 10;
        mon = addDays(mon, 7);
        // Arrêter à fin août
        if (mon.getUTCMonth() > 7) break; // 7 = août (0-indexed)
      }
      continue;
    }

    // Périodes courtes (1 jour) : ignorer (Pont Ascension)
    if (start.getTime() === end.getTime()) continue;

    // Périodes normales : Toussaint, Noël, Hiver, Printemps
    let slug = "";
    let periode = "";
    if (desc.includes("toussaint")) {
      slug = "toussaint";
      periode = `Toussaint ${start.getUTCFullYear()}`;
    } else if (desc.includes("noël") || desc.includes("noel")) {
      slug = "noel";
      periode = `Noël ${start.getUTCFullYear()}`;
    } else if (desc.includes("hiver")) {
      slug = "hiver";
      periode = `Hiver ${start.getUTCFullYear()}`;
    } else if (desc.includes("printemps")) {
      slug = "printemps";
      periode = `Printemps ${start.getUTCFullYear()}`;
    } else {
      continue; // descriptions inattendues
    }

    const weeks = splitIntoWeeks(start, end);
    weeks.forEach((w, i) => {
      semaines.push({
        code: `${slug}_${i + 1}`,
        periode,
        label: labelSemaine(w.lundi, w.vendredi),
        date_debut: isoDay(w.lundi),
        order_idx: orderIdx,
      });
      orderIdx += 10;
    });
  }

  // Tri par date de début pour cohérence
  semaines.sort((a, b) => a.date_debut.localeCompare(b.date_debut));
  // Réajuste order_idx selon l'ordre
  semaines.forEach((s, i) => {
    s.order_idx = (i + 1) * 10;
  });

  return semaines;
}
