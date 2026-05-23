import { z } from "zod";

/**
 * Schéma flexible : on accepte n'importe quel code de formule / option / semaine.
 * La validation stricte se fait côté serveur dans l'API route, contre les
 * tarifs en base de la saison active.
 */

const f4SelectionSchema = z.object({
  jour: z.enum(["lundi", "mardi", "mercredi", "jeudi", "vendredi"]),
  option: z.string().min(1),
});

export const stageFormSchema = z
  .object({
    nom: z.string().trim().min(1, "Nom requis").max(100),
    prenom: z.string().trim().min(1, "Prénom requis").max(100),
    date_naissance: z
      .string()
      .min(1, "Date de naissance requise")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide"),

    adresse: z.string().trim().min(3, "Adresse requise"),
    telephone: z
      .string()
      .trim()
      .min(8, "Numéro trop court")
      .max(20)
      .regex(/^[0-9 +().-]+$/, "Numéro de téléphone invalide"),
    email: z.string().trim().toLowerCase().email("Email invalide"),

    niveau: z.string().trim().max(50).optional().or(z.literal("")),

    // formule_code peut être n'importe quel code (validé serveur)
    formule: z.string().min(1, "Choisissez une formule"),
    formule_creneau: z.enum(["matin", "apres_midi"]).optional().nullable(),
    formule_dejeuner_jours: z
      .array(z.enum(["lundi", "mardi", "mercredi", "jeudi", "vendredi"]))
      .optional()
      .default([]),
    formule_4_selection: z.array(f4SelectionSchema).optional().default([]),

    semaine: z.string().min(1, "Choisissez une semaine"),

    notes: z.string().max(2000).optional().or(z.literal("")),

    website: z.string().max(0).optional().default(""),
  });

export type StageFormInput = z.input<typeof stageFormSchema>;
export type StageFormOutput = z.output<typeof stageFormSchema>;
