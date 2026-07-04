import { z } from "zod";

/**
 * Schéma souple : on accepte les codes en string, validation stricte côté API.
 */

export const ecoleFormSchema = z
  .object({
    nom: z.string().trim().min(1, "Nom requis").max(100),
    prenom: z.string().trim().min(1, "Prénom requis").max(100),
    date_naissance: z
      .string()
      .min(1, "Date de naissance requise")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide"),

    adresse: z.string().trim().min(3, "Adresse requise"),
    code_postal_ville: z.string().trim().min(3, "Code postal et ville requis"),
    telephone: z
      .string()
      .trim()
      .min(8, "Numéro trop court")
      .max(20)
      .regex(/^[0-9 +().-]+$/, "Numéro de téléphone invalide"),
    email: z.string().trim().toLowerCase().email("Email invalide"),

    niveau: z.string().trim().max(50).optional().or(z.literal("")),

    cours_tennis: z.array(z.string()).default([]),
    cours_padel: z.array(z.string()).default([]),
    cours_pickleball: z.array(z.string()).default([]),
    licence_pickleball: z.boolean().optional().default(false),

    dispo_mercredi: z.string().max(200).optional().or(z.literal("")),
    dispo_samedi: z.string().max(200).optional().or(z.literal("")),
    dispo_semaine: z.string().max(200).optional().or(z.literal("")),

    mode_reglement: z.enum(["especes", "cheque"], {
      message: "Choisissez un mode de règlement",
    }),
    nb_paiements: z
      .number({ message: "Nombre de paiements requis" })
      .int()
      .min(1)
      .max(4),

    licence_fft: z.string().min(1, "Choix de la licence FFT requis"),

    notes: z.string().max(2000).optional().or(z.literal("")),

    website: z.string().max(0).optional().default(""),
  })
  .superRefine((data, ctx) => {
    const totalCours =
      (data.cours_tennis?.length ?? 0) +
      (data.cours_padel?.length ?? 0) +
      (data.cours_pickleball?.length ?? 0);
    if (totalCours === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["cours_tennis"],
        message: "Sélectionnez au moins un cours (tennis, padel ou pickleball).",
      });
    }
    // Conflit "annuel" + "trimestre" (même cours adultes choisi 2 fois)
    const conflitT =
      (data.cours_tennis ?? []).includes("cours_adultes_annuel") &&
      (data.cours_tennis ?? []).includes("cours_adultes_trimestre");
    if (conflitT) {
      ctx.addIssue({
        code: "custom",
        path: ["cours_tennis"],
        message:
          "Cours Adultes Tennis : choisissez annuel OU trimestre, pas les deux.",
      });
    }
    const conflitP =
      (data.cours_padel ?? []).includes("cours_adultes_annuel") &&
      (data.cours_padel ?? []).includes("cours_adultes_trimestre");
    if (conflitP) {
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
