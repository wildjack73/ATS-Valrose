"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  JOURS_SEMAINE,
  type Formule,
  type OptionF4,
  type Semaine,
  type TarifsBundle,
} from "@/lib/data/tarifs-types";
import { stageFormSchema, type StageFormInput } from "@/lib/schemas/stage";
import { Field, inputClass } from "@/components/ui/Field";
import { NiveauSelect } from "@/components/ui/NiveauSelect";
import { DateNaissanceInput } from "@/components/ui/DateNaissanceInput";
import { Section } from "@/components/ui/Section";

type DaySelection = Record<string, string>; // jour -> optionCode | ""

const EMPTY_DAYS: DaySelection = {
  lundi: "",
  mardi: "",
  mercredi: "",
  jeudi: "",
  vendredi: "",
};

function groupSemaines(semaines: Semaine[]): Record<string, Semaine[]> {
  const out: Record<string, Semaine[]> = {};
  for (const s of semaines) {
    if (!s.ouverte) continue;
    out[s.periode] ||= [];
    out[s.periode].push(s);
  }
  return out;
}

export default function StageForm({ bundle }: { bundle: TarifsBundle }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [daySelection, setDaySelection] = useState<DaySelection>(EMPTY_DAYS);

  const FORMULES = bundle.formules;
  const OPTIONS_F4 = bundle.optionsF4;
  const SEMAINES = bundle.semaines;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<StageFormInput>({
    resolver: zodResolver(stageFormSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      date_naissance: "",
      adresse: "",
      telephone: "",
      email: "",
      niveau: "",
      formule: "",
      formule_creneau: null,
      formule_dejeuner_jours: [],
      formule_4_selection: [],
      semaine: "",
      notes: "",
      website: "",
    },
    mode: "onTouched",
  });

  const formuleCode = watch("formule");
  const dejeunerJours = (watch("formule_dejeuner_jours") ?? []) as string[];
  const semaineCode = watch("semaine");
  const formule: Formule | undefined = FORMULES.find(
    (f) => f.code === formuleCode,
  );
  const semaineChoisie = SEMAINES.find((s) => s.code === semaineCode);
  // Le déjeuner ne s'affiche QUE si la formule le propose ET qu'une semaine
  // a bien été choisie ET que cette semaine accepte le déjeuner.
  const semaineAccepteDejeuner =
    !!semaineChoisie && semaineChoisie.dejeuner_disponible !== false;
  // Une semaine est explicitement « sans déjeuner » → on cache la mention
  // « Option déjeuner disponible » dans la description des formules.
  const semaineSansDejeuner =
    !!semaineChoisie && semaineChoisie.dejeuner_disponible === false;
  const dejeunerActif =
    !!formule?.has_dejeuner_option && semaineAccepteDejeuner;

  // Reset auto des jours déjeuner si on bascule sur une semaine sans déjeuner
  // (ou si on désélectionne la semaine). Évite la facturation fantôme.
  useEffect(() => {
    if (!semaineAccepteDejeuner && dejeunerJours.length > 0) {
      setValue("formule_dejeuner_jours", [], { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semaineCode, semaineAccepteDejeuner]);

  function updateDay(jour: string, option: string) {
    const next = { ...daySelection, [jour]: option };
    setDaySelection(next);
    const arr = Object.entries(next)
      .filter(([, v]) => v !== "")
      .map(([j, o]) => ({
        jour: j as "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi",
        option: o,
      }));
    setValue("formule_4_selection", arr, { shouldValidate: true });
    // Si on retire un jour (Aucun), on enlève aussi son éventuel déjeuner
    if (option === "") {
      const dejActuels = (watch("formule_dejeuner_jours") ?? []) as string[];
      if (dejActuels.includes(jour)) {
        setValue(
          "formule_dejeuner_jours",
          dejActuels.filter((j) => j !== jour) as StageFormInput["formule_dejeuner_jours"],
          { shouldValidate: false },
        );
      }
    }
  }

  const prixDejeuner = useMemo(() => {
    if (!dejeunerActif || dejeunerJours.length === 0) return 0;
    if (dejeunerJours.length >= 5) return formule?.prix_dejeuner ?? 0;
    return dejeunerJours.length * (formule?.prix_dejeuner_jour ?? 0);
  }, [dejeunerActif, dejeunerJours, formule]);

  const prixCalcule = useMemo(() => {
    if (!formule) return 0;
    if (formule.is_a_la_carte) {
      const optionsTotal = Object.values(daySelection)
        .filter((v) => v !== "")
        .reduce(
          (sum, optCode) =>
            sum + (OPTIONS_F4.find((o) => o.code === optCode)?.prix ?? 0),
          0,
        );
      // Le déjeuner s'ajoute aussi pour la formule à la carte
      return optionsTotal + prixDejeuner;
    }
    return (formule.prix ?? 0) + prixDejeuner;
  }, [formule, daySelection, OPTIONS_F4, prixDejeuner]);

  async function onSubmit(values: StageFormInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur serveur");
      router.push(`/stages/confirmation?id=${json.id}`);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Erreur lors de l'envoi.",
      );
      setSubmitting(false);
    }
  }

  const groupedSemaines = groupSemaines(SEMAINES);

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

      {/* 1. Identité */}
      <Section step={1} title="Identité de l'enfant">
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

      {/* 2. Contact */}
      <Section step={2} title="Coordonnées des parents">
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
          label="Niveau tennis (si connu)"
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

      {/* 3. Choix de la semaine (placé AVANT la formule pour que les
            sous-options déjeuner sachent si elles peuvent s'afficher) */}
      <Section
        step={3}
        title="Choix de la semaine"
        description="Sélectionnez la semaine de stage."
      >
        <Controller
          control={control}
          name="semaine"
          render={({ field }) => (
            <div className="space-y-4">
              {Object.entries(groupedSemaines).map(([periode, items]) => (
                <div key={periode}>
                  <h3 className="text-sm font-bold text-navy mb-2 uppercase tracking-wide">
                    {periode}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {items.map((s) => {
                      const checked = field.value === s.code;
                      return (
                        <label
                          key={s.code}
                          className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer text-sm ${
                            checked
                              ? "border-yellow-club bg-yellow-club/10"
                              : "border-gray-300 hover:border-cyan-club"
                          }`}
                        >
                          <input
                            type="radio"
                            className="accent-navy"
                            value={s.code}
                            checked={checked}
                            onChange={() => field.onChange(s.code)}
                          />
                          <span className="flex-1">{s.label}</span>
                          {s.dejeuner_disponible === false ? (
                            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                              sans déjeuner encadré
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              {Object.keys(groupedSemaines).length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  Aucune semaine disponible pour le moment. Reviens
                  prochainement ou contacte le club.
                </p>
              ) : null}
            </div>
          )}
        />
        {errors.semaine ? (
          <p className="text-xs text-red-600">{errors.semaine.message}</p>
        ) : null}
      </Section>

      {/* 4. Choix de la formule */}
      <Section
        step={4}
        title="Choix de la formule"
        description="Choisissez la formule qui correspond à votre enfant."
      >
        <Controller
          control={control}
          name="formule"
          render={({ field }) => (
            <div className="grid gap-3">
              {FORMULES.map((f) => {
                const checked = field.value === f.code;
                return (
                  <label
                    key={f.code}
                    className={`block rounded-xl border-2 p-4 cursor-pointer transition ${
                      checked
                        ? "border-yellow-club bg-yellow-club/10"
                        : "border-gray-200 hover:border-cyan-club"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        className="mt-1 accent-navy"
                        value={f.code}
                        checked={checked}
                        onChange={() => field.onChange(f.code)}
                      />
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between gap-2 flex-wrap">
                          <div>
                            <h3 className="font-bold text-navy">{f.titre}</h3>
                            <p className="text-sm text-gray-600">
                              {f.sous_titre}
                            </p>
                          </div>
                          <div className="text-right">
                            {typeof f.prix === "number" ? (
                              <span className="text-2xl font-extrabold text-navy">
                                {f.prix}€
                              </span>
                            ) : (
                              <span className="text-lg font-bold text-navy">
                                À la carte
                              </span>
                            )}
                            <span className="block text-xs text-gray-500">
                              / semaine
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-gray-700">
                          {semaineSansDejeuner
                            ? retirerMentionDejeuner(f.description ?? "")
                            : f.description}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {f.details_horaires}
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        />
        {errors.formule ? (
          <p className="text-xs text-red-600">{errors.formule.message}</p>
        ) : null}

        {/* Sous-options */}
        {formule?.needs_creneau ? (
          <div className="rounded-lg bg-cyan-club/10 border border-cyan-club/30 p-4">
            <Field
              label="Créneau souhaité"
              required
              error={errors.formule_creneau?.message}
            >
              <Controller
                control={control}
                name="formule_creneau"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-3">
                    {(
                      [
                        { v: "matin", l: "Matin" },
                        { v: "apres_midi", l: "Après-midi" },
                      ] as const
                    ).map((opt) => (
                      <label
                        key={opt.v}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer ${
                          field.value === opt.v
                            ? "border-navy bg-white"
                            : "border-gray-300 bg-white/60"
                        }`}
                      >
                        <input
                          type="radio"
                          className="accent-navy"
                          value={opt.v}
                          checked={field.value === opt.v}
                          onChange={() => field.onChange(opt.v)}
                        />
                        <span className="text-sm">{opt.l}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
            </Field>
          </div>
        ) : null}

        {/* Table à la carte (F4) AVANT le déjeuner, pour que le repas ne
            propose que les jours réservés */}
        {formule?.is_a_la_carte ? (
          <div className="rounded-lg bg-cyan-club/10 border border-cyan-club/30 p-4 space-y-3">
            <p className="text-sm text-gray-700">
              Choisissez une option pour chaque jour souhaité.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500">
                    <th className="py-2 pr-3">Jour</th>
                    <th className="py-2 pr-3">Aucun</th>
                    {OPTIONS_F4.map((opt: OptionF4) => (
                      <th key={opt.code} className="py-2 pr-3">
                        {opt.label}
                        <span className="block font-normal text-gray-500">
                          {opt.prix}€ — {opt.detail}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {JOURS_SEMAINE.map((j) => (
                    <tr key={j.id} className="border-t">
                      <td className="py-2 pr-3 font-medium">{j.label}</td>
                      <td className="py-2 pr-3">
                        <input
                          type="radio"
                          name={`f4-${j.id}`}
                          className="accent-navy"
                          checked={daySelection[j.id] === ""}
                          onChange={() => updateDay(j.id, "")}
                        />
                      </td>
                      {OPTIONS_F4.map((opt) => (
                        <td key={opt.code} className="py-2 pr-3">
                          <input
                            type="radio"
                            name={`f4-${j.id}`}
                            className="accent-navy"
                            checked={daySelection[j.id] === opt.code}
                            onChange={() => updateDay(j.id, opt.code)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {errors.formule_4_selection?.message ? (
              <p className="text-xs text-red-600">
                {errors.formule_4_selection.message as string}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Bloc déjeuner — pour toutes les formules qui ont l'option (F2/F3/F4).
            Pour la F4 (à la carte) on ne propose le repas que sur les jours
            effectivement réservés. */}
        {formule?.has_dejeuner_option ? (
          dejeunerActif ? (
            (() => {
              const joursDejeuner = formule.is_a_la_carte
                ? JOURS_SEMAINE.filter((j) => daySelection[j.id] !== "")
                : JOURS_SEMAINE;
              if (formule.is_a_la_carte && joursDejeuner.length === 0) {
                return (
                  <p className="text-xs text-gray-500 italic">
                    Choisissez d&apos;abord vos jours ci-dessus pour ajouter le
                    déjeuner.
                  </p>
                );
              }
              return (
                <div className="rounded-lg bg-cyan-club/10 border border-cyan-club/30 p-4">
                  <Controller
                    control={control}
                    name="formule_dejeuner_jours"
                    render={({ field }) => {
                      const selected = (field.value ?? []) as string[];
                      const all5 = selected.length >= 5;
                      function toggle(jour: string) {
                        const next = selected.includes(jour)
                          ? selected.filter((j) => j !== jour)
                          : [...selected, jour];
                        field.onChange(next);
                      }
                      return (
                        <div>
                          <p className="text-sm font-medium text-navy mb-2">
                            Déjeuner encadré (optionnel)
                          </p>
                          <p className="text-xs text-gray-600 mb-3">
                            {formule.prix_dejeuner_jour}€ / jour, ou{" "}
                            {formule.prix_dejeuner}€ la semaine entière (5 jours).
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {joursDejeuner.map((j) => {
                              const checked = selected.includes(j.id);
                              return (
                                <label
                                  key={j.id}
                                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 cursor-pointer text-sm ${
                                    checked
                                      ? "border-navy bg-white"
                                      : "border-gray-300 bg-white/60"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="accent-navy"
                                    checked={checked}
                                    onChange={() => toggle(j.id)}
                                  />
                                  <span>{j.label}</span>
                                </label>
                              );
                            })}
                          </div>
                          {selected.length > 0 ? (
                            <p className="mt-3 text-sm text-navy">
                              {all5 ? (
                                <>
                                  Forfait semaine entière :{" "}
                                  <strong>+{formule.prix_dejeuner}€</strong>
                                </>
                              ) : (
                                <>
                                  {selected.length} jour
                                  {selected.length > 1 ? "s" : ""} ×{" "}
                                  {formule.prix_dejeuner_jour}€ ={" "}
                                  <strong>
                                    +{selected.length * formule.prix_dejeuner_jour}€
                                  </strong>
                                </>
                              )}
                            </p>
                          ) : null}
                        </div>
                      );
                    }}
                  />
                </div>
              );
            })()
          ) : semaineChoisie ? (
            <p className="text-xs text-gray-500 italic">
              Déjeuner non proposé pour cette semaine.
            </p>
          ) : null
        ) : null}
      </Section>

      {/* 5. Notes */}
      <Section step={5} title="Informations complémentaires (optionnel)">
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

      {/* Récap + submit */}
      <div className="rounded-xl bg-navy text-white px-5 py-3 sticky bottom-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <span className="text-[10px] uppercase tracking-widest text-white/60 font-semibold">
              Total
            </span>
            <span className="text-2xl font-extrabold leading-none">{prixCalcule}€</span>
            <span className="hidden md:inline text-xs text-white/50 truncate">
              · Règlement le jour du stage (espèces / chèque)
            </span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-yellow-club px-5 py-2.5 font-bold text-navy text-sm hover:bg-yellow-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
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

/**
 * Retire de la description d'une formule la phrase « Option déjeuner
 * encadré disponible (35€ la semaine ou 8€ le jour). » quand la semaine
 * choisie ne propose pas de déjeuner. Nettoie aussi les espaces doubles.
 */
function retirerMentionDejeuner(desc: string): string {
  return desc
    .replace(/\s*Option déjeuner encadré disponible[^.]*\.\s*/giu, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
