"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  COURS_TENNIS,
  COURS_PADEL,
  MODES_REGLEMENT,
  LICENCE_FFT,
  PRIX_LICENCE_FFT,
  calculerPrixEcole,
  type CoursTennisId,
  type CoursPadelId,
} from "@/lib/data/ecole";
import { ecoleFormSchema, type EcoleFormInput } from "@/lib/schemas/ecole";
import { Field, inputClass } from "@/components/ui/Field";
import { Section } from "@/components/ui/Section";

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export default function EcoleForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

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
      licence_pickleball: false,
      dispo_mercredi: "",
      dispo_samedi: "",
      dispo_semaine: "",
      mode_reglement: undefined,
      nb_paiements: undefined,
      licence_fft: undefined,
      notes: "",
      website: "",
    },
    mode: "onTouched",
  });

  const coursTennis = watch("cours_tennis") ?? [];
  const coursPadel = watch("cours_padel") ?? [];
  const licenceFft = watch("licence_fft");

  const prixTotal = useMemo(() => {
    if (!licenceFft) {
      // calcul sans licence si pas encore choisi
      return (
        (coursTennis as CoursTennisId[]).reduce(
          (s, id) => s + (COURS_TENNIS.find((c) => c.id === id)?.prix ?? 0),
          0,
        ) +
        (coursPadel as CoursPadelId[]).reduce(
          (s, id) => s + (COURS_PADEL.find((c) => c.id === id)?.prix ?? 0),
          0,
        )
      );
    }
    return calculerPrixEcole({
      cours_tennis: coursTennis as CoursTennisId[],
      cours_padel: coursPadel as CoursPadelId[],
      licence_fft: licenceFft,
    });
  }, [coursTennis, coursPadel, licenceFft]);

  async function onSubmit(values: EcoleFormInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/ecole", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Erreur serveur");
      }
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
      {/* Honeypot */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
        {...register("website")}
      />

      {/* 1. Identité */}
      <Section step={1} title="Identité de l'élève">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Nom"
            htmlFor="nom"
            required
            error={errors.nom?.message}
          >
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
          <input
            id="date_naissance"
            type="date"
            className={inputClass}
            {...register("date_naissance")}
          />
        </Field>
      </Section>

      {/* 2. Contact */}
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
          hint="Ex: rouge, orange, vert, jaune, 30/5, débutant…"
        >
          <input
            id="niveau"
            type="text"
            className={inputClass}
            {...register("niveau")}
          />
        </Field>
      </Section>

      {/* 3. Cours souhaités */}
      <Section
        step={3}
        title="Choix des cours"
        description="Sélectionnez tous les cours souhaités. Le total se met à jour automatiquement."
      >
        <Controller
          control={control}
          name="cours_tennis"
          render={({ field }) => (
            <Field
              label="Cours TENNIS"
              error={errors.cours_tennis?.message as string | undefined}
            >
              <div className="grid gap-2">
                {COURS_TENNIS.map((c) => {
                  const checked = (field.value ?? []).includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 cursor-pointer text-sm ${
                        checked
                          ? "border-ocre bg-ocre/10"
                          : "border-gray-300 hover:border-ocre/50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="accent-ocre"
                          checked={checked}
                          onChange={() =>
                            field.onChange(
                              toggleInArray<CoursTennisId>(
                                (field.value as CoursTennisId[]) ?? [],
                                c.id,
                              ),
                            )
                          }
                        />
                        <span>{c.label}</span>
                      </span>
                      <span className="font-bold text-navy whitespace-nowrap">
                        {c.prix}€
                      </span>
                    </label>
                  );
                })}
              </div>
            </Field>
          )}
        />

        <Controller
          control={control}
          name="cours_padel"
          render={({ field }) => (
            <Field
              label="Cours PADEL"
              error={errors.cours_padel?.message as string | undefined}
            >
              <div className="grid gap-2">
                {COURS_PADEL.map((c) => {
                  const checked = (field.value ?? []).includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 cursor-pointer text-sm ${
                        checked
                          ? "border-ocre bg-ocre/10"
                          : "border-gray-300 hover:border-ocre/50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="accent-ocre"
                          checked={checked}
                          onChange={() =>
                            field.onChange(
                              toggleInArray<CoursPadelId>(
                                (field.value as CoursPadelId[]) ?? [],
                                c.id,
                              ),
                            )
                          }
                        />
                        <span>{c.label}</span>
                      </span>
                      <span className="font-bold text-navy whitespace-nowrap">
                        {c.prix}€
                      </span>
                    </label>
                  );
                })}
              </div>
            </Field>
          )}
        />

        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            className="accent-ocre"
            {...register("licence_pickleball")}
          />
          <span>J&apos;ajoute la licence Pickleball</span>
        </label>
      </Section>

      {/* 4. Disponibilités */}
      <Section
        step={4}
        title="Disponibilités"
        description="Indiquez les créneaux qui vous arrangent (texte libre)."
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Mercredi" htmlFor="dispo_mercredi">
            <input
              id="dispo_mercredi"
              type="text"
              className={inputClass}
              placeholder="ex: 14h-17h"
              {...register("dispo_mercredi")}
            />
          </Field>
          <Field label="Samedi" htmlFor="dispo_samedi">
            <input
              id="dispo_samedi"
              type="text"
              className={inputClass}
              placeholder="ex: matin"
              {...register("dispo_samedi")}
            />
          </Field>
          <Field label="Semaine (lun-ven)" htmlFor="dispo_semaine">
            <input
              id="dispo_semaine"
              type="text"
              className={inputClass}
              placeholder="ex: lundi 18h"
              {...register("dispo_semaine")}
            />
          </Field>
        </div>
      </Section>

      {/* 5. Licence FFT */}
      <Section
        step={5}
        title="Licence FFT (obligatoire)"
        description="La licence FFT est obligatoire pour les cours."
      >
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
                  const checked = field.value === l.id;
                  const prix = PRIX_LICENCE_FFT[l.id];
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
                          onChange={() => field.onChange(l.id)}
                        />
                        <span>{l.label}</span>
                      </span>
                      {prix > 0 ? (
                        <span className="font-bold text-navy whitespace-nowrap">
                          +{prix}€
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </Field>
          )}
        />
      </Section>

      {/* 6. Paiement */}
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

      {/* 7. Notes */}
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

      {/* Submit + total */}
      <div className="rounded-2xl bg-navy text-white p-6 sm:p-8 sticky bottom-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/70 uppercase tracking-wide">
              Total annuel estimé
            </p>
            <p className="text-3xl sm:text-4xl font-extrabold">
              {prixTotal}€
            </p>
            <p className="text-xs text-white/60 mt-1">
              Le club vous confirmera le créneau et le détail du règlement.
            </p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-ocre px-6 py-3 font-bold text-white hover:bg-ocre-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Envoi en cours…" : "Valider l'inscription"}
          </button>
        </div>
        {serverError ? (
          <p className="mt-4 rounded-md bg-red-100 text-red-700 px-3 py-2 text-sm">
            {serverError}
          </p>
        ) : null}
      </div>
    </form>
  );
}
