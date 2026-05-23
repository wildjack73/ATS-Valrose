import { z } from "zod";
import {
  COURS_TENNIS,
  COURS_PADEL,
  MODES_REGLEMENT,
  LICENCE_FFT,
  hasConflitAdultes,
  type CoursTennisId,
  type CoursPadelId,
  type ModeReglementId,
  type LicenceFftId,
} from "@/lib/data/ecole";

const coursTennisIds = COURS_TENNIS.map((c) => c.id) as [
  CoursTennisId,
  ...CoursTennisId[],
];
const coursPadelIds = COURS_PADEL.map((c) => c.id) as [
  CoursPadelId,
  ...CoursPadelId[],
];
const modesReglementIds = MODES_REGLEMENT.map((c) => c.id) as [
  ModeReglementId,
  ...ModeReglementId[],
];
const licenceFftIds = LICENCE_FFT.map((c) => c.id) as [
  LicenceFftId,
  ...LicenceFftId[],
];

export const ecoleFormSchema = z
  .object({
    nom: z.string().trim().min(1, "Nom requis").max(100),
    prenom: z.string().trim().min(1, "Prénom requis").max(100),
    date_naissance: z
      .string()
      .min(1, "Date de naissance requise")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide"),

    adresse: z.string().trim().min(3, "Adresse requise"),
    code_postal_ville: z
      .string()
      .trim()
      .min(3, "Code postal et ville requis"),
    telephone: z
      .string()
      .trim()
      .min(8, "Numéro trop court")
      .max(20)
      .regex(/^[0-9 +().-]+$/, "Numéro de téléphone invalide"),
    email: z.string().trim().toLowerCase().email("Email invalide"),

    niveau: z.string().trim().max(50).optional().or(z.literal("")),

    cours_tennis: z.array(z.enum(coursTennisIds)).default([]),
    cours_padel: z.array(z.enum(coursPadelIds)).default([]),
    licence_pickleball: z.boolean().optional().default(false),

    dispo_mercredi: z.string().max(200).optional().or(z.literal("")),
    dispo_samedi: z.string().max(200).optional().or(z.literal("")),
    dispo_semaine: z.string().max(200).optional().or(z.literal("")),

    mode_reglement: z.enum(modesReglementIds, {
      message: "Choisissez un mode de règlement",
    }),
    nb_paiements: z
      .number({ message: "Nombre de paiements requis" })
      .int()
      .min(1)
      .max(4),

    licence_fft: z.enum(licenceFftIds, {
      message: "Choix de la licence FFT requis",
    }),

    notes: z.string().max(2000).optional().or(z.literal("")),

    website: z.string().max(0).optional().default(""),
  })
  .superRefine((data, ctx) => {
    const totalCours =
      (data.cours_tennis?.length ?? 0) + (data.cours_padel?.length ?? 0);
    if (totalCours === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["cours_tennis"],
        message: "Sélectionnez au moins un cours (tennis ou padel).",
      });
    }
    if (hasConflitAdultes(data.cours_tennis ?? [])) {
      ctx.addIssue({
        code: "custom",
        path: ["cours_tennis"],
        message:
          "Cours Adultes Tennis : choisissez annuel OU trimestre, pas les deux.",
      });
    }
    if (hasConflitAdultes(data.cours_padel ?? [])) {
      ctx.addIssue({
        code: "custom",
        path: ["cours_padel"],
        message:
          "Cours Adultes Padel : choisissez annuel OU trimestre, pas les deux.",
      });
    }
  });

export type EcoleFormInput = z.input<typeof ecoleFormSchema>;
export type EcoleFormOutput = z.output<typeof ecoleFormSchema>;
