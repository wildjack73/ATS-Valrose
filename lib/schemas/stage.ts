import { z } from "zod";
import {
  SEMAINES,
  OPTIONS_F4,
  JOURS,
  type OptionF4,
  type JourSemaine,
} from "@/lib/data/stages";

const semainesOuvertes = SEMAINES.filter((s) => s.ouverte).map(
  (s) => s.id,
) as [string, ...string[]];

const optionsF4Keys = Object.keys(OPTIONS_F4) as [OptionF4, ...OptionF4[]];
const joursKeys = JOURS.map((j) => j.id) as [JourSemaine, ...JourSemaine[]];

const f4SelectionSchema = z.object({
  jour: z.enum(joursKeys),
  option: z.enum(optionsF4Keys),
});

export const stageFormSchema = z
  .object({
    // Identité
    nom: z.string().trim().min(1, "Nom requis").max(100),
    prenom: z.string().trim().min(1, "Prénom requis").max(100),
    date_naissance: z
      .string()
      .min(1, "Date de naissance requise")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide"),

    // Contact
    adresse: z.string().trim().min(3, "Adresse requise"),
    telephone: z
      .string()
      .trim()
      .min(8, "Numéro trop court")
      .max(20)
      .regex(/^[0-9 +().-]+$/, "Numéro de téléphone invalide"),
    email: z.string().trim().toLowerCase().email("Email invalide"),

    // Tennis
    niveau: z.string().trim().max(50).optional().or(z.literal("")),

    // Stage
    formule: z.enum([
      "formule_1",
      "formule_2",
      "formule_3",
      "formule_4",
    ]),
    formule_creneau: z.enum(["matin", "apres_midi"]).optional().nullable(),
    formule_dejeuner: z.boolean().optional().default(false),
    formule_4_selection: z.array(f4SelectionSchema).optional().default([]),

    semaine: z.enum(semainesOuvertes),

    notes: z.string().max(2000).optional().or(z.literal("")),

    // honeypot anti-spam
    website: z.string().max(0).optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.formule === "formule_1" || data.formule === "formule_2") {
      if (!data.formule_creneau) {
        ctx.addIssue({
          code: "custom",
          path: ["formule_creneau"],
          message: "Choisissez un créneau (matin ou après-midi).",
        });
      }
    }
    if (data.formule === "formule_4") {
      if (!data.formule_4_selection || data.formule_4_selection.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["formule_4_selection"],
          message: "Choisissez au moins un jour pour la formule à la carte.",
        });
      } else {
        const jours = data.formule_4_selection.map((s) => s.jour);
        if (new Set(jours).size !== jours.length) {
          ctx.addIssue({
            code: "custom",
            path: ["formule_4_selection"],
            message: "Un jour ne peut être sélectionné qu'une seule fois.",
          });
        }
      }
    }
  });

export type StageFormInput = z.input<typeof stageFormSchema>;
export type StageFormOutput = z.output<typeof stageFormSchema>;
