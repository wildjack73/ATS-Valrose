"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  COURS_HORAIRES,
  CRENEAUX_HORAIRES,
  horaireCle,
} from "@/lib/data/horaires-ecole";

/**
 * Grille de saisie des horaires exacts par cours (tennis jeunes) × créneau.
 * Les valeurs sont enregistrées en base et réutilisées dans l'email de
 * confirmation « Prévenir ».
 */
export default function HorairesEditor({
  initial,
}: {
  initial: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const dirty = useMemo(() => {
    const keys = new Set([...Object.keys(initial), ...Object.keys(values)]);
    for (const k of keys) {
      if ((initial[k] ?? "").trim() !== (values[k] ?? "").trim()) return true;
    }
    return false;
  }, [initial, values]);

  function setOne(cle: string, v: string) {
    setValues((prev) => ({ ...prev, [cle]: v }));
  }

  function save() {
    const entries = COURS_HORAIRES.flatMap((c) =>
      CRENEAUX_HORAIRES.map((cr) => {
        const cle = horaireCle(c.code, cr);
        return { cle, horaire: values[cle] ?? "" };
      }),
    );
    startTransition(async () => {
      const res = await fetch("/api/admin/horaires-ecole", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) {
        window.alert("Échec de l'enregistrement. Réessaye.");
        return;
      }
      setSavedAt(new Date().toLocaleTimeString("fr-FR"));
      router.refresh();
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-b-xl rounded-tr-xl shadow-sm p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-navy">
          Horaires exacts — Cours Tennis jeunes
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Renseigne l&apos;horaire exact de chaque cours pour chaque créneau
          proposé (ex.&nbsp;: <strong>9h00 - 10h00</strong>). Laisse vide un
          créneau non proposé. Ces horaires apparaissent automatiquement dans
          l&apos;email de confirmation envoyé aux familles.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Le padel, le pickleball et les cours adultes ont déjà leur horaire
          dans leur libellé&nbsp;: ils n&apos;ont pas besoin d&apos;être saisis
          ici.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {COURS_HORAIRES.map((c) => (
          <section
            key={c.code}
            className="rounded-xl border border-gray-200 overflow-hidden"
          >
            <header className="bg-navy/5 px-4 py-2 border-b">
              <h3 className="font-bold text-navy text-sm">
                {c.label}{" "}
                <span className="font-normal text-gray-400 text-xs">
                  · {c.detail}
                </span>
              </h3>
            </header>
            <div className="p-3 space-y-1.5">
              {CRENEAUX_HORAIRES.map((cr) => {
                const cle = horaireCle(c.code, cr);
                return (
                  <label
                    key={cle}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="w-40 shrink-0 text-gray-600">{cr}</span>
                    <input
                      type="text"
                      value={values[cle] ?? ""}
                      onChange={(e) => setOne(cle, e.target.value)}
                      placeholder="ex : 9h00 - 10h00"
                      disabled={pending}
                      className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-navy focus:outline-none"
                    />
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 mt-5">
        {savedAt ? (
          <span className="text-xs text-emerald-600 font-semibold">
            ✅ Enregistré à {savedAt}
          </span>
        ) : null}
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="rounded-lg bg-navy text-white px-5 py-2 text-sm font-bold hover:bg-navy-dark disabled:opacity-40"
        >
          {pending ? "…" : "Enregistrer les horaires"}
        </button>
      </div>
    </div>
  );
}
