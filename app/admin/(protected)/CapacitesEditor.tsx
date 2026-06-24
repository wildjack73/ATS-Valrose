"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  listCreneauxGerables,
  defaultMaxForLabel,
  type CreneauCategorie,
} from "@/lib/data/creneaux-ecole";

/**
 * Éditeur des capacités (nombre de places) par créneau École.
 *
 * La structure des créneaux vient du code (lib/data/creneaux-ecole.ts) ; ici on
 * ne modifie QUE le nombre de places, stocké par saison en base.
 * Champ vide = illimité (aucune limite affichée côté formulaire).
 */
export default function CapacitesEditor({
  saisonId,
  saisonLabel,
  capacites,
}: {
  saisonId: string;
  saisonLabel: string;
  /** Overrides actuels : label complet du créneau → nb places (null = illimité). */
  capacites: Record<string, number | null>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const creneaux = useMemo(() => listCreneauxGerables(), []);

  /** Valeur initiale (string) de chaque champ : override si présent, sinon
   *  défaut du code (vide = illimité, cas des créneaux jeunes). */
  function valeurInitiale(label: string): string {
    if (label in capacites) {
      const v = capacites[label];
      return v == null ? "" : String(v);
    }
    const def = defaultMaxForLabel(label);
    return def == null ? "" : String(def);
  }

  const [valeurs, setValeurs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const c of creneaux) {
      init[c.option.label] = valeurInitiale(c.option.label);
    }
    return init;
  });

  // Y a-t-il au moins un champ modifié par rapport à l'état initial ?
  const dirty = useMemo(() => {
    for (const c of creneaux) {
      if ((valeurs[c.option.label] ?? "") !== valeurInitiale(c.option.label))
        return true;
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valeurs, creneaux]);

  function setVal(label: string, raw: string) {
    // On n'autorise que des chiffres (ou vide = illimité).
    const clean = raw.replace(/[^0-9]/g, "");
    setValeurs((prev) => ({ ...prev, [label]: clean }));
    setSaved(false);
  }

  async function save() {
    setError(null);
    setSaved(false);
    // On n'envoie QUE les écarts par rapport au défaut du code : ainsi un
    // créneau laissé à sa valeur d'origine ne crée pas de ligne, et le
    // comportement par défaut (ex. samedi après-midi jeunes illimité) est
    // préservé. L'API remplace l'ensemble des overrides de la saison.
    const items = creneaux
      .map((c) => {
        const label = c.option.label;
        const raw = valeurs[label] ?? "";
        const current = raw === "" ? null : Number(raw);
        const def = defaultMaxForLabel(label) ?? null;
        return { creneauKey: label, capacite: current, isDefault: current === def };
      })
      .filter((x) => !x.isDefault)
      .map((x) => ({ creneauKey: x.creneauKey, capacite: x.capacite }));
    try {
      const res = await fetch("/api/admin/capacites-ecole", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saisonId, items }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Échec de l'enregistrement");
      }
      setSaved(true);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  // Regrouper les créneaux gérables par section puis par groupe (pour l'affichage).
  const parSection = useMemo(() => {
    const map = new Map<
      string,
      { categorie: CreneauCategorie; groupes: Map<string, typeof creneaux> }
    >();
    for (const c of creneaux) {
      if (!map.has(c.sectionTitre)) {
        map.set(c.sectionTitre, {
          categorie: c.categorie,
          groupes: new Map(),
        });
      }
      const sec = map.get(c.sectionTitre)!;
      if (!sec.groupes.has(c.groupeTitre)) sec.groupes.set(c.groupeTitre, []);
      sec.groupes.get(c.groupeTitre)!.push(c);
    }
    return map;
  }, [creneaux]);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-bold text-navy">
          👥 Places par créneau — École
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Saison <strong>{saisonLabel}</strong>. Définissez le nombre de places
          de chaque créneau. Laissez vide pour « illimité ». Le formulaire
          affiche « reste X » et bloque l&apos;inscription quand le créneau est
          complet.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Par défaut les cours jeunes sont illimités (champ vide). « Samedi
          Après-midi » est commun aux jeunes et aux adultes : le réglage est
          partagé.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          ⚠ {error}
        </div>
      ) : null}

      {[...parSection.entries()].map(([sectionTitre, sec]) => (
        <section
          key={sectionTitre}
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
        >
          <header className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-sm font-bold text-navy">
            {sectionTitre}
          </header>
          <div className="divide-y divide-gray-100">
            {[...sec.groupes.entries()].map(([groupeTitre, opts]) => (
              <div key={groupeTitre} className="px-4 py-3">
                <p className="text-xs font-bold uppercase text-gray-500 tracking-wide mb-2">
                  {groupeTitre}
                </p>
                <div className="space-y-2">
                  {opts.map((c) => {
                    const label = c.option.label;
                    return (
                      <div
                        key={label}
                        className="flex items-center gap-3 flex-wrap"
                      >
                        <span className="text-sm text-gray-800 min-w-[200px] flex-1">
                          {c.option.display}
                          <span className="text-gray-400"> · {label}</span>
                          {c.option.note ? (
                            <span className="text-xs text-gray-400">
                              {" "}
                              ({c.option.note})
                            </span>
                          ) : null}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={valeurs[label] ?? ""}
                            onChange={(e) => setVal(label, e.target.value)}
                            disabled={pending}
                            placeholder="illimité"
                            className="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-center"
                          />
                          <span className="text-xs text-gray-500 w-16">
                            {(valeurs[label] ?? "") === ""
                              ? "illimité"
                              : "places"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Barre d'actions collante en bas */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-200 -mx-4 px-4 py-3 flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending || !dirty}
          className="rounded-lg bg-navy text-white px-5 py-2 text-sm font-bold hover:bg-navy-dark disabled:opacity-40"
        >
          {pending ? "Enregistrement…" : "Enregistrer les capacités"}
        </button>
        {saved && !dirty ? (
          <span className="text-sm text-emerald-600 font-semibold">
            ✓ Enregistré
          </span>
        ) : dirty ? (
          <span className="text-sm text-orange-600">
            Modifications non enregistrées
          </span>
        ) : null}
      </div>
    </div>
  );
}
