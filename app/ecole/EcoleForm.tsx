"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { TarifsBundle, CoursEcole } from "@/lib/data/tarifs-types";
import { PRIX_LICENCE_PICKLEBALL } from "@/lib/data/tarifs-types";
import { ecoleFormSchema, type EcoleFormInput } from "@/lib/schemas/ecole";
import { Field, inputClass } from "@/components/ui/Field";
import { NiveauSelect } from "@/components/ui/NiveauSelect";
import { DateNaissanceInput } from "@/components/ui/DateNaissanceInput";
import { Section } from "@/components/ui/Section";
import {
  SECTIONS_CRENEAUX,
  capaciteEffective,
  normalizeSlot,
} from "@/lib/data/creneaux-ecole";

const MODES_REGLEMENT = [
  { id: "especes", label: "Espèces" },
  { id: "cheque", label: "Chèque" },
] as const;

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export default function EcoleForm({
  bundle,
  slotsOccupes,
  capacites,
  publicCible,
}: {
  bundle: TarifsBundle;
  /** Compteur : créneau normalisé → nb d'inscriptions l'ayant sélectionné.
   *  Sert à afficher « reste X » / « COMPLET » dynamiquement. */
  slotsOccupes: Record<string, number>;
  /** Capacités éditées en admin : label complet du créneau → nb places
   *  (null = illimité). Un créneau absent utilise sa valeur par défaut. */
  capacites: Record<string, number | null>;
  /** Cible : « jeunes » (enfants/ados) ou « adultes » (cours collectifs
   *  adultes). undefined = tous les cours (entrée générique). */
  publicCible?: "jeunes" | "adultes";
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const estAdultes = publicCible === "adultes";

  // Les cours « adultes » ont un code commençant par « cours_adultes ».
  const isCoursAdulte = (code: string) => code.startsWith("cours_adultes");
  const filtreCours = (c: CoursEcole) =>
    publicCible === "adultes"
      ? isCoursAdulte(c.code)
      : publicCible === "jeunes"
        ? !isCoursAdulte(c.code)
        : true;

  const COURS_TENNIS = bundle.coursTennis.filter(filtreCours);
  const COURS_PADEL = bundle.coursPadel.filter(filtreCours);
  const COURS_PICKLEBALL = (bundle.coursPickleball ?? []).filter(filtreCours);
  const LICENCE_FFT = bundle.licenceFft;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<EcoleFormInput>({
    resolver: zodResolver(ecoleFormSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      date_naissance: "",
      adresse: "",
      code_postal_ville: "",
      telephone: "",
      email: "",
      niveau: "",
      cours_tennis: [],
      cours_padel: [],
      cours_pickleball: [],
      licence_pickleball: false,
      dispo_mercredi: "",
      dispo_samedi: "",
      dispo_semaine: "",
      mode_reglement: undefined,
      nb_paiements: undefined,
      // Adultes : pas de licence FFT jeune → on pré-règle sur « non_adulte »
      // (0€) et on masque le bloc dans le formulaire.
      licence_fft: estAdultes ? "non_adulte" : "",
      notes: "",
      website: "",
    },
    mode: "onTouched",
  });

  const coursTennis = (watch("cours_tennis") ?? []) as string[];
  const coursPadel = (watch("cours_padel") ?? []) as string[];
  const coursPickleball = (watch("cours_pickleball") ?? []) as string[];
  const licenceFftCode = watch("licence_fft");
  const hasPickleball = coursPickleball.length > 0;

  const prixTotal = useMemo(() => {
    let total = 0;
    for (const code of coursTennis) {
      total += COURS_TENNIS.find((c) => c.code === code)?.prix ?? 0;
    }
    for (const code of coursPadel) {
      total += COURS_PADEL.find((c) => c.code === code)?.prix ?? 0;
    }
    for (const code of coursPickleball) {
      total += COURS_PICKLEBALL.find((c) => c.code === code)?.prix ?? 0;
    }
    if (licenceFftCode) {
      total += LICENCE_FFT.find((l) => l.code === licenceFftCode)?.prix ?? 0;
    }
    // Licence Pickle Ball obligatoire (incluse) dès qu'un cours pickleball
    // adulte est pris.
    if (coursPickleball.length > 0) {
      total += PRIX_LICENCE_PICKLEBALL;
    }
    return total;
  }, [
    coursTennis,
    coursPadel,
    coursPickleball,
    licenceFftCode,
    COURS_TENNIS,
    COURS_PADEL,
    COURS_PICKLEBALL,
    LICENCE_FFT,
  ]);

  async function onSubmit(values: EcoleFormInput) {
    setServerError(null);
    setSubmitting(true);
    // La licence pickleball est OBLIGATOIRE avec le cours pickleball adultes,
    // et sans objet sinon → on la déduit directement du cours.
    const payload: EcoleFormInput = {
      ...values,
      licence_pickleball: (values.cours_pickleball?.length ?? 0) > 0,
    };
    try {
      const res = await fetch("/api/ecole", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur serveur");
      router.push(`/ecole/confirmation?id=${json.id}`);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Erreur lors de l'envoi.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
        {...register("website")}
      />

      <Section step={1} title="Identité de l'élève">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nom" htmlFor="nom" required error={errors.nom?.message}>
            <input
              id="nom"
              type="text"
              autoComplete="family-name"
              className={inputClass}
              {...register("nom")}
            />
          </Field>
          <Field
            label="Prénom"
            htmlFor="prenom"
            required
            error={errors.prenom?.message}
          >
            <input
              id="prenom"
              type="text"
              autoComplete="given-name"
              className={inputClass}
              {...register("prenom")}
            />
          </Field>
        </div>
        <Field
          label="Date de naissance"
          htmlFor="date_naissance"
          required
          error={errors.date_naissance?.message}
        >
          <Controller
            control={control}
            name="date_naissance"
            render={({ field }) => (
              <DateNaissanceInput
                id="date_naissance"
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
      </Section>

      <Section step={2} title="Coordonnées">
        <Field
          label="Adresse"
          htmlFor="adresse"
          required
          error={errors.adresse?.message}
        >
          <input
            id="adresse"
            type="text"
            autoComplete="street-address"
            className={inputClass}
            {...register("adresse")}
          />
        </Field>
        <Field
          label="Code postal et ville"
          htmlFor="code_postal_ville"
          required
          error={errors.code_postal_ville?.message}
        >
          <input
            id="code_postal_ville"
            type="text"
            className={inputClass}
            {...register("code_postal_ville")}
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Téléphone"
            htmlFor="telephone"
            required
            error={errors.telephone?.message}
          >
            <input
              id="telephone"
              type="tel"
              autoComplete="tel"
              placeholder="06 XX XX XX XX"
              className={inputClass}
              {...register("telephone")}
            />
          </Field>
          <Field
            label="Email"
            htmlFor="email"
            required
            error={errors.email?.message}
          >
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={inputClass}
              {...register("email")}
            />
          </Field>
        </div>
        <Field
          label="Niveau tennis (couleur ou classement, si connu)"
          htmlFor="niveau"
          error={errors.niveau?.message}
        >
          <Controller
            control={control}
            name="niveau"
            render={({ field }) => (
              <NiveauSelect
                id="niveau"
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
      </Section>

      <Section
        step={3}
        title="Choix des cours"
        description="Sélectionnez tous les cours souhaités. Le total se met à jour automatiquement."
      >
        {COURS_TENNIS.length > 0 ? (
        <Controller
          control={control}
          name="cours_tennis"
          render={({ field }) => (
            <Field
              label="Cours TENNIS"
              error={errors.cours_tennis?.message as string | undefined}
            >
              <div className="grid gap-2">
                {COURS_TENNIS.map((c: CoursEcole) => {
                  const checked = (field.value ?? []).includes(c.code);
                  const ferme = c.ferme;
                  return (
                    <label
                      key={c.id}
                      aria-disabled={ferme}
                      className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2.5 text-sm ${
                        ferme
                          ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-70"
                          : checked
                            ? "border-ocre bg-ocre/10 cursor-pointer"
                            : "border-gray-300 hover:border-ocre/50 cursor-pointer"
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="accent-ocre mt-0.5"
                          checked={checked && !ferme}
                          disabled={ferme}
                          onChange={() =>
                            field.onChange(
                              toggleInArray<string>(
                                (field.value as string[]) ?? [],
                                c.code,
                              ),
                            )
                          }
                        />
                        <span>
                          <span
                            className={`font-medium ${
                              ferme ? "line-through text-gray-500" : ""
                            }`}
                          >
                            {c.label}
                          </span>
                          {ferme ? (
                            <span className="ml-2 inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700 align-middle">
                              Complet
                            </span>
                          ) : null}
                          {c.description ? (
                            <span className="block text-xs text-gray-500 mt-0.5">
                              {c.description}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span
                        className={`font-bold whitespace-nowrap ${
                          ferme ? "text-gray-400 line-through" : "text-navy"
                        }`}
                      >
                        {c.prix}€
                      </span>
                    </label>
                  );
                })}
              </div>
            </Field>
          )}
        />
        ) : null}

        {COURS_PADEL.length > 0 ? (
        <Controller
          control={control}
          name="cours_padel"
          render={({ field }) => (
            <Field
              label="Cours PADEL"
              error={errors.cours_padel?.message as string | undefined}
            >
              <div className="grid gap-2">
                {COURS_PADEL.map((c: CoursEcole) => {
                  const checked = (field.value ?? []).includes(c.code);
                  const ferme = c.ferme;
                  return (
                    <label
                      key={c.id}
                      aria-disabled={ferme}
                      className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2.5 text-sm ${
                        ferme
                          ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-70"
                          : checked
                            ? "border-ocre bg-ocre/10 cursor-pointer"
                            : "border-gray-300 hover:border-ocre/50 cursor-pointer"
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="accent-ocre mt-0.5"
                          checked={checked && !ferme}
                          disabled={ferme}
                          onChange={() =>
                            field.onChange(
                              toggleInArray<string>(
                                (field.value as string[]) ?? [],
                                c.code,
                              ),
                            )
                          }
                        />
                        <span>
                          <span
                            className={`font-medium ${
                              ferme ? "line-through text-gray-500" : ""
                            }`}
                          >
                            {c.label}
                          </span>
                          {ferme ? (
                            <span className="ml-2 inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700 align-middle">
                              Complet
                            </span>
                          ) : null}
                          {c.description ? (
                            <span className="block text-xs text-gray-500 mt-0.5">
                              {c.description}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span
                        className={`font-bold whitespace-nowrap ${
                          ferme ? "text-gray-400 line-through" : "text-navy"
                        }`}
                      >
                        {c.prix}€
                      </span>
                    </label>
                  );
                })}
              </div>
            </Field>
          )}
        />
        ) : null}

        {COURS_PICKLEBALL.length > 0 ? (
        <Controller
          control={control}
          name="cours_pickleball"
          render={({ field }) => (
            <Field
              label="Cours PICKLEBALL"
              error={errors.cours_pickleball?.message as string | undefined}
            >
              <div className="grid gap-2">
                {COURS_PICKLEBALL.map((c: CoursEcole) => {
                  const checked = (field.value ?? []).includes(c.code);
                  const ferme = c.ferme;
                  return (
                    <label
                      key={c.id}
                      aria-disabled={ferme}
                      className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2.5 text-sm ${
                        ferme
                          ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-70"
                          : checked
                            ? "border-ocre bg-ocre/10 cursor-pointer"
                            : "border-gray-300 hover:border-ocre/50 cursor-pointer"
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="accent-ocre mt-0.5"
                          checked={checked && !ferme}
                          disabled={ferme}
                          onChange={() =>
                            field.onChange(
                              toggleInArray<string>(
                                (field.value as string[]) ?? [],
                                c.code,
                              ),
                            )
                          }
                        />
                        <span>
                          <span
                            className={`font-medium ${
                              ferme ? "line-through text-gray-500" : ""
                            }`}
                          >
                            {c.label}
                          </span>
                          {ferme ? (
                            <span className="ml-2 inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700 align-middle">
                              Complet
                            </span>
                          ) : null}
                          {c.description ? (
                            <span className="block text-xs text-gray-500 mt-0.5">
                              {c.description}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span
                        className={`font-bold whitespace-nowrap ${
                          ferme ? "text-gray-400 line-through" : "text-navy"
                        }`}
                      >
                        {c.prix}€
                      </span>
                    </label>
                  );
                })}
              </div>
            </Field>
          )}
        />
        ) : null}

      </Section>

      <Section
        step={4}
        title="Disponibilités"
        description="Cochez tous les créneaux qui vous arrangent. Les créneaux affichés dépendent des cours sélectionnés ci-dessus."
      >
        <Controller
          control={control}
          name="dispo_semaine"
          render={({ field }) => {
            const checked = (field.value ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);

            function toggle(creneau: string) {
              const next = checked.includes(creneau)
                ? checked.filter((j) => j !== creneau)
                : [...checked, creneau];
              field.onChange(next.join(", "));
            }

            const coursTennisSel = (watch("cours_tennis") ?? []) as string[];
            const coursPadelSel = (watch("cours_padel") ?? []) as string[];
            const coursPickleballSel = (watch("cours_pickleball") ??
              []) as string[];

            const YOUTH_CODES = new Set([
              "baby_tennis",
              "mini_tennis",
              "initiation",
              "perfectionnement",
              "centre_entrainement",
              "demi_journee",
            ]);
            const ADULTE_TENNIS_CODES = new Set([
              "cours_adultes_annuel",
              "cours_adultes_trimestre",
            ]);

            const hasJeune = coursTennisSel.some((c) => YOUTH_CODES.has(c));
            const hasAdulteTennis = coursTennisSel.some((c) =>
              ADULTE_TENNIS_CODES.has(c),
            );
            const hasPadel = coursPadelSel.length > 0;
            // Padel jeunes = cours « Perfectionnement Padel » (code
            // "perfectionnement"). Padel adultes = tout autre cours padel
            // (cours_adultes_*). On sépare les deux pour n'afficher les
            // créneaux jeunes qu'aux jeunes, et inversement.
            const hasPadelJeunes = coursPadelSel.includes("perfectionnement");
            const hasPadelAdulte = coursPadelSel.some(
              (c) => c !== "perfectionnement",
            );
            const hasPickleballCours = coursPickleballSel.length > 0;
            const rienChoisi =
              !hasJeune && !hasAdulteTennis && !hasPadel && !hasPickleballCours;

            // Les créneaux et leur structure viennent de la source unique
            // lib/data/creneaux-ecole.ts. On affiche les sections selon les
            // cours cochés. Le NOMBRE de places vient des capacités (admin).
            const sections = SECTIONS_CRENEAUX.filter(
              (s) =>
                (s.categorie === "jeunes" && hasJeune) ||
                (s.categorie === "adultes_tennis" && hasAdulteTennis) ||
                (s.categorie === "padel" && hasPadelAdulte) ||
                (s.categorie === "padel_jeunes" && hasPadelJeunes) ||
                (s.categorie === "pickleball" && hasPickleballCours),
            );

            if (rienChoisi) {
              return (
                <p className="text-sm text-gray-600 italic bg-gray-50 border border-gray-200 rounded-md px-4 py-3">
                  ⬆ Sélectionnez d&apos;abord un ou plusieurs cours ci-dessus
                  pour voir les créneaux disponibles.
                </p>
              );
            }

            return (
              <div className="space-y-5">
                {sections.map((sec) => (
                  <div key={sec.titre} className="space-y-3">
                    <p className="text-sm font-bold text-navy">{sec.titre}</p>
                    {sec.groupes.map((g) => (
                      <div key={g.titre} className="pl-2">
                        <p className="text-xs font-bold uppercase text-gray-500 tracking-wide mb-1.5">
                          {g.titre}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {g.options.map((opt) => {
                            const isChecked = checked.includes(opt.label);
                            const key = normalizeSlot(opt.label);
                            const occupes = slotsOccupes[key] ?? 0;
                            // Capacité effective = override admin sinon défaut.
                            const max = capaciteEffective(opt, capacites);
                            const reste =
                              max !== undefined
                                ? Math.max(0, max - occupes)
                                : undefined;
                            const complet =
                              max !== undefined && reste === 0 && !isChecked;
                            return (
                              <label
                                key={opt.label}
                                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition ${
                                  complet
                                    ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed line-through"
                                    : isChecked
                                      ? "border-navy bg-navy text-white cursor-pointer"
                                      : "border-gray-300 bg-white hover:border-navy cursor-pointer"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="accent-navy"
                                  checked={isChecked}
                                  disabled={complet}
                                  onChange={() => toggle(opt.label)}
                                />
                                <span>
                                  {opt.display}
                                  {opt.note ? (
                                    <span className="text-xs opacity-70">
                                      {" "}
                                      ({opt.note})
                                    </span>
                                  ) : null}
                                  {max !== undefined ? (
                                    <span
                                      className={`ml-2 text-[11px] font-bold ${
                                        complet
                                          ? "text-red-600"
                                          : reste! <= 2
                                            ? isChecked
                                              ? "text-yellow-club"
                                              : "text-orange-600"
                                            : isChecked
                                              ? "text-white/70"
                                              : "text-gray-500"
                                      }`}
                                    >
                                      {complet
                                        ? "COMPLET"
                                        : reste === 1
                                          ? "reste 1 place"
                                          : `reste ${reste}/${max}`}
                                    </span>
                                  ) : null}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {checked.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">
                    Aucun créneau sélectionné (= aucune préférence).
                  </p>
                ) : (
                  <p className="text-xs text-navy">
                    <strong>{checked.length}</strong> créneau
                    {checked.length > 1 ? "x" : ""} sélectionné
                    {checked.length > 1 ? "s" : ""}.
                  </p>
                )}
              </div>
            );
          }}
        />
      </Section>

      <Section
        step={5}
        title={estAdultes ? "Licence" : "Licence FFT (obligatoire)"}
        description={
          estAdultes
            ? hasPickleball
              ? "Pas de licence FFT requise. La licence Pickle Ball est obligatoire pour le cours de pickleball."
              : "Pas de licence FFT requise pour les cours adultes."
            : "La licence FFT est obligatoire pour les cours."
        }
      >
        {/* Licence FFT (jeunes uniquement — les adultes n'en ont pas besoin) */}
        {!estAdultes ? (
          <Controller
            control={control}
            name="licence_fft"
            render={({ field }) => (
              <Field
                label="Tarif licence"
                required
                error={errors.licence_fft?.message as string | undefined}
              >
                <div className="grid gap-2">
                  {LICENCE_FFT.map((l) => {
                    const checked = field.value === l.code;
                    return (
                      <label
                        key={l.id}
                        className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 cursor-pointer text-sm ${
                          checked
                            ? "border-ocre bg-ocre/10"
                            : "border-gray-300 hover:border-ocre/50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            className="accent-ocre"
                            checked={checked}
                            onChange={() => field.onChange(l.code)}
                          />
                          <span>{l.label}</span>
                        </span>
                        {l.prix > 0 ? (
                          <span className="font-bold text-navy whitespace-nowrap">
                            +{l.prix}€
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </Field>
            )}
          />
        ) : null}

        {/* Licence Pickleball — OBLIGATOIRE (incluse) dès qu'un cours
            Pickleball adultes est sélectionné. Non décochable. */}
        {hasPickleball ? (
          <div className={estAdultes ? "" : "mt-4"}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Licence Pickle Ball — Multi raquettes (obligatoire)
            </p>
            <div className="flex items-start justify-between gap-3 rounded-md border border-ocre bg-ocre/10 px-3 py-2.5 text-sm">
              <span className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="accent-ocre mt-0.5"
                  checked
                  readOnly
                  disabled
                  aria-label="Licence Pickle Ball incluse (obligatoire)"
                />
                <span>
                  <span className="font-medium">
                    Licence Pickle Ball (Multi raquettes)
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    Incluse — obligatoire pour pratiquer le pickleball au club.
                  </span>
                </span>
              </span>
              <span className="font-bold text-navy whitespace-nowrap">
                +{PRIX_LICENCE_PICKLEBALL}€
              </span>
            </div>
          </div>
        ) : null}
      </Section>

      <Section step={6} title="Règlement">
        <Controller
          control={control}
          name="mode_reglement"
          render={({ field }) => (
            <Field
              label="Mode de règlement"
              required
              error={errors.mode_reglement?.message as string | undefined}
            >
              <div className="flex flex-wrap gap-3">
                {MODES_REGLEMENT.map((m) => {
                  const checked = field.value === m.id;
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm ${
                        checked
                          ? "border-ocre bg-ocre/10"
                          : "border-gray-300 hover:border-ocre/50"
                      }`}
                    >
                      <input
                        type="radio"
                        className="accent-ocre"
                        checked={checked}
                        onChange={() => field.onChange(m.id)}
                      />
                      <span>{m.label}</span>
                    </label>
                  );
                })}
              </div>
            </Field>
          )}
        />

        <Controller
          control={control}
          name="nb_paiements"
          render={({ field }) => (
            <Field
              label="Paiement en plusieurs fois"
              required
              error={errors.nb_paiements?.message as string | undefined}
            >
              <div className="flex flex-wrap gap-3">
                {[1, 2, 3, 4].map((n) => {
                  const checked = field.value === n;
                  return (
                    <label
                      key={n}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm ${
                        checked
                          ? "border-ocre bg-ocre/10"
                          : "border-gray-300 hover:border-ocre/50"
                      }`}
                    >
                      <input
                        type="radio"
                        className="accent-ocre"
                        checked={checked}
                        onChange={() => field.onChange(n)}
                      />
                      <span>{n === 1 ? "1 fois" : `${n} fois`}</span>
                    </label>
                  );
                })}
              </div>
            </Field>
          )}
        />
      </Section>

      <Section step={7} title="Informations complémentaires (optionnel)">
        <Field
          label="Allergies, particularités, remarques"
          htmlFor="notes"
          error={errors.notes?.message}
        >
          <textarea
            id="notes"
            rows={3}
            className={inputClass}
            {...register("notes")}
          />
        </Field>
      </Section>

      <div className="rounded-xl bg-navy text-white px-5 py-3 sticky bottom-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <span className="text-[10px] uppercase tracking-widest text-white/60 font-semibold">
              Total estimé
            </span>
            <span className="text-2xl font-extrabold leading-none">{prixTotal}€</span>
            <span className="hidden md:inline text-xs text-white/50 truncate">
              · Le club confirmera créneau et règlement
            </span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-ocre px-5 py-2.5 font-bold text-white text-sm hover:bg-ocre-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Envoi…" : "Valider l'inscription"}
          </button>
        </div>
        {serverError ? (
          <p className="mt-2 rounded-md bg-red-100 text-red-700 px-3 py-1.5 text-xs">
            {serverError}
          </p>
        ) : null}
      </div>
    </form>
  );
}
