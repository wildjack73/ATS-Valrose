"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { TarifsBundle, CoursEcole } from "@/lib/data/tarifs-types";
import { ecoleFormSchema, type EcoleFormInput } from "@/lib/schemas/ecole";
import { Field, inputClass } from "@/components/ui/Field";
import { NiveauSelect } from "@/components/ui/NiveauSelect";
import { DateNaissanceInput } from "@/components/ui/DateNaissanceInput";
import { Section } from "@/components/ui/Section";

const MODES_REGLEMENT = [
  { id: "especes", label: "Espèces" },
  { id: "cheque", label: "Chèque" },
] as const;

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export default function EcoleForm({ bundle }: { bundle: TarifsBundle }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const COURS_TENNIS = bundle.coursTennis;
  const COURS_PADEL = bundle.coursPadel;
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
      licence_pickleball: false,
      dispo_mercredi: "",
      dispo_samedi: "",
      dispo_semaine: "",
      mode_reglement: undefined,
      nb_paiements: undefined,
      licence_fft: "",
      notes: "",
      website: "",
    },
    mode: "onTouched",
  });

  const coursTennis = (watch("cours_tennis") ?? []) as string[];
  const coursPadel = (watch("cours_padel") ?? []) as string[];
  const licenceFftCode = watch("licence_fft");

  const prixTotal = useMemo(() => {
    let total = 0;
    for (const code of coursTennis) {
      total += COURS_TENNIS.find((c) => c.code === code)?.prix ?? 0;
    }
    for (const code of coursPadel) {
      total += COURS_PADEL.find((c) => c.code === code)?.prix ?? 0;
    }
    if (licenceFftCode) {
      total += LICENCE_FFT.find((l) => l.code === licenceFftCode)?.prix ?? 0;
    }
    return total;
  }, [coursTennis, coursPadel, licenceFftCode, COURS_TENNIS, COURS_PADEL, LICENCE_FFT]);

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
                  return (
                    <label
                      key={c.id}
                      className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2.5 cursor-pointer text-sm ${
                        checked
                          ? "border-ocre bg-ocre/10"
                          : "border-gray-300 hover:border-ocre/50"
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="accent-ocre mt-0.5"
                          checked={checked}
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
                          <span className="font-medium">{c.label}</span>
                          {c.description ? (
                            <span className="block text-xs text-gray-500 mt-0.5">
                              {c.description}
                            </span>
                          ) : null}
                        </span>
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
                {COURS_PADEL.map((c: CoursEcole) => {
                  const checked = (field.value ?? []).includes(c.code);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2.5 cursor-pointer text-sm ${
                        checked
                          ? "border-ocre bg-ocre/10"
                          : "border-gray-300 hover:border-ocre/50"
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="accent-ocre mt-0.5"
                          checked={checked}
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
                          <span className="font-medium">{c.label}</span>
                          {c.description ? (
                            <span className="block text-xs text-gray-500 mt-0.5">
                              {c.description}
                            </span>
                          ) : null}
                        </span>
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
            const rienChoisi = !hasJeune && !hasAdulteTennis && !hasPadel;

            const sections: {
              titre: string;
              groupes: { titre: string; options: string[] }[];
            }[] = [];

            if (hasJeune) {
              sections.push({
                titre: "🎾 Cours jeunes",
                groupes: [
                  {
                    titre: "Mercredi",
                    options: ["Mercredi matin", "Mercredi après-midi"],
                  },
                  {
                    titre: "Samedi",
                    options: ["Samedi matin", "Samedi après-midi"],
                  },
                  {
                    titre: "Soir en semaine",
                    options: [
                      "Lundi soir",
                      "Mardi soir",
                      "Jeudi soir",
                      "Vendredi soir",
                    ],
                  },
                ],
              });
            }

            if (hasAdulteTennis) {
              sections.push({
                titre: "🎾 Cours Adultes Tennis",
                groupes: [
                  {
                    titre: "Soir en semaine — 18h30-20h (5 places max)",
                    options: [
                      "Lundi 18h30-20h (5 places max)",
                      "Mardi 18h30-20h (5 places max)",
                      "Jeudi 18h30-20h (5 places max)",
                      "Vendredi 18h30-20h (5 places max)",
                    ],
                  },
                  {
                    titre: "Samedi",
                    options: [
                      "Samedi 9h-10h30 (15 places max)",
                      "Samedi après-midi (non débutant, 5 places max)",
                    ],
                  },
                ],
              });
            }

            if (hasPadel) {
              sections.push({
                titre: "🏓 Cours Padel",
                groupes: [
                  {
                    titre: "Après-midi (5 places max)",
                    options: [
                      "Mercredi après-midi (padel, 5 places max)",
                      "Samedi après-midi (padel, 5 places max)",
                    ],
                  },
                  {
                    titre: "Soir en semaine — 17h-18h30 (5 places max)",
                    options: [
                      "Lundi 17h-18h30 (padel, 5 places max)",
                      "Mardi 17h-18h30 (padel, 5 places max)",
                      "Jeudi 17h-18h30 (padel, 5 places max)",
                      "Vendredi 17h-18h30 (padel, 5 places max)",
                    ],
                  },
                ],
              });
            }

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
                            const isChecked = checked.includes(opt);
                            // Affiche un libellé court (sans le nom du jour
                            // déjà visible dans le sous-titre du groupe)
                            const label = opt
                              .replace(/^Mercredi\s/, "")
                              .replace(/^Samedi\s/, "")
                              .replace(/^Lundi\s/, "Lundi ")
                              .replace(/^Mardi\s/, "Mardi ")
                              .replace(/^Jeudi\s/, "Jeudi ")
                              .replace(/^Vendredi\s/, "Vendredi ");
                            return (
                              <label
                                key={opt}
                                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 cursor-pointer text-sm transition ${
                                  isChecked
                                    ? "border-navy bg-navy text-white"
                                    : "border-gray-300 bg-white hover:border-navy"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="accent-navy"
                                  checked={isChecked}
                                  onChange={() => toggle(opt)}
                                />
                                <span>{label}</span>
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
