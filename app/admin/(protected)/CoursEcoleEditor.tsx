"use client";

import { useEffect, useMemo, useState } from "react";
import type { CoursEcole } from "@/lib/data/tarifs-types";

/**
 * Édition des cours d'une inscription école (correction admin : un parent a
 * coché Baby au lieu de Mini, etc.). Coche/décoche → enregistre les cours et
 * recalcule le prix côté serveur.
 */
export default function CoursEcoleEditor({
  row,
  coursTennis,
  coursPadel,
  coursPickleball,
  patch,
  pending,
}: {
  row: {
    cours_tennis?: string[] | null;
    cours_padel?: string[] | null;
    cours_pickleball?: string[] | null;
  };
  coursTennis: CoursEcole[];
  coursPadel: CoursEcole[];
  coursPickleball: CoursEcole[];
  patch: (p: object) => void;
  pending: boolean;
}) {
  const init = useMemo(
    () => ({
      tennis: new Set((row.cours_tennis ?? []) as string[]),
      padel: new Set((row.cours_padel ?? []) as string[]),
      pickleball: new Set((row.cours_pickleball ?? []) as string[]),
    }),
    [row.cours_tennis, row.cours_padel, row.cours_pickleball],
  );

  const [tennis, setTennis] = useState<Set<string>>(init.tennis);
  const [padel, setPadel] = useState<Set<string>>(init.padel);
  const [pickleball, setPickleball] = useState<Set<string>>(init.pickleball);

  useEffect(() => {
    setTennis(init.tennis);
    setPadel(init.padel);
    setPickleball(init.pickleball);
  }, [init]);

  function toggle(
    set: Set<string>,
    setter: (s: Set<string>) => void,
    code: string,
  ) {
    const next = new Set(set);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setter(next);
  }

  const sameSet = (a: Set<string>, b: Set<string>) =>
    a.size === b.size && [...a].every((x) => b.has(x));
  const dirty =
    !sameSet(tennis, init.tennis) ||
    !sameSet(padel, init.padel) ||
    !sameSet(pickleball, init.pickleball);

  function save() {
    patch({
      cours_tennis: [...tennis],
      cours_padel: [...padel],
      cours_pickleball: [...pickleball],
    });
  }

  function Group({
    titre,
    cours,
    set,
    setter,
  }: {
    titre: string;
    cours: CoursEcole[];
    set: Set<string>;
    setter: (s: Set<string>) => void;
  }) {
    if (cours.length === 0) return null;
    return (
      <div>
        <p className="text-[11px] font-bold uppercase text-gray-500 tracking-wide mb-1">
          {titre}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {cours.map((c) => {
            const on = set.has(c.code);
            return (
              <label
                key={c.id}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs cursor-pointer ${
                  on
                    ? "border-navy bg-navy text-white"
                    : "border-gray-300 bg-white hover:border-navy"
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-navy"
                  checked={on}
                  disabled={pending}
                  onChange={() => toggle(set, setter, c.code)}
                />
                <span>
                  {c.label} · {c.prix}€
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-bold text-navy uppercase tracking-wide mb-2">
        Cours{" "}
        <span className="font-normal text-gray-400 normal-case">
          (modifiable — le prix est recalculé)
        </span>
      </p>
      <div className="space-y-2">
        <Group titre="Tennis" cours={coursTennis} set={tennis} setter={setTennis} />
        <Group titre="Padel" cours={coursPadel} set={padel} setter={setPadel} />
        <Group
          titre="Pickleball"
          cours={coursPickleball}
          set={pickleball}
          setter={setPickleball}
        />
      </div>
      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="rounded bg-navy text-white px-3 py-1.5 text-xs font-bold hover:bg-navy-dark disabled:opacity-40"
        >
          {pending ? "…" : "Enregistrer les cours"}
        </button>
      </div>
    </div>
  );
}
