/**
 * Types des lignes en base. Doit rester synchronisé avec supabase/schema.sql.
 */

import type {
  FormuleId,
  Creneau,
  OptionF4,
  JourSemaine,
} from "@/lib/data/stages";
import type {
  CoursTennisId,
  CoursPadelId,
  ModeReglementId,
  LicenceFftId,
} from "@/lib/data/ecole";

export type StatutInscription = "en_attente" | "paye" | "annule";

export interface InscriptionStageRow {
  id: string;
  created_at: string;

  nom: string;
  prenom: string;
  date_naissance: string; // ISO date

  adresse: string;
  telephone: string;
  email: string;

  niveau: string | null;

  formule: FormuleId;
  formule_creneau: Creneau | null;
  formule_dejeuner: boolean;
  formule_4_selection:
    | { jour: JourSemaine; option: OptionF4 }[]
    | null;

  semaine: string;
  semaine_label: string;

  prix_total: number;

  notes: string | null;
  statut: StatutInscription;
  notes_admin: string | null;
}

export type InscriptionStageInsert = Omit<
  InscriptionStageRow,
  "id" | "created_at" | "statut" | "notes_admin"
>;

export interface InscriptionEcoleRow {
  id: string;
  created_at: string;

  nom: string;
  prenom: string;
  date_naissance: string;

  adresse: string;
  code_postal_ville: string;
  telephone: string;
  email: string;

  niveau: string | null;

  cours_tennis: CoursTennisId[];
  cours_padel: CoursPadelId[];
  licence_pickleball: boolean;

  prix_total: number;

  dispo_mercredi: string | null;
  dispo_samedi: string | null;
  dispo_semaine: string | null;

  mode_reglement: ModeReglementId;
  nb_paiements: number;

  licence_fft: LicenceFftId;

  notes: string | null;
  statut: StatutInscription;
  notes_admin: string | null;
}

export type InscriptionEcoleInsert = Omit<
  InscriptionEcoleRow,
  "id" | "created_at" | "statut" | "notes_admin"
>;
