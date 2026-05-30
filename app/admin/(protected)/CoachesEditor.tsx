"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Coach } from "@/lib/data/planning-types";

// Palette de couleurs proposées (couleurs club + neutres)
const COULEURS = [
  "#0d2e3f", // navy
  "#2db5d6", // cyan-club
  "#f3c503", // yellow-club
  "#c4733a", // ocre
  "#b85a2b", // clay
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#64748b", // slate
];

export default function CoachesEditor({ coaches }: { coaches: Coach[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function withError(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function createCoach(nom: string, couleur: string) {
    await withError(async () => {
      const res = await fetch("/api/admin/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, couleur }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Échec création");
      }
    });
  }

  async function patchCoach(id: string, patch: object) {
    await withError(async () => {
      const res = await fetch(`/api/admin/coaches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Échec mise à jour");
      }
    });
  }

  async function deleteCoach(id: string, nom: string) {
    if (
      !window.confirm(
        `Supprimer le coach ${nom} ?\n\n` +
          `Ses assignations sur l'organisation des stages seront effacées, ` +
          `et il sera désaffecté des groupes école. Cette action est irréversible.`,
      )
    )
      return;
    await withError(async () => {
      const res = await fetch(`/api/admin/coaches/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Échec suppression");
      }
    });
  }

  const actifs = coaches.filter((c) => c.actif);
  const inactifs = coaches.filter((c) => !c.actif);

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          ⚠ {error}
        </div>
      ) : null}

      {/* Header + bouton ajouter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy">👨‍🏫 Coachs du club</h2>
          <p className="text-xs text-gray-500">
            {coaches.length} coach{coaches.length > 1 ? "s" : ""}
            {actifs.length !== coaches.length
              ? ` (${actifs.length} actif${actifs.length > 1 ? "s" : ""})`
              : ""}
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          disabled={pending}
          className="ml-auto rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
        >
          + Ajouter un coach
        </button>
      </div>

      {/* Form ajout */}
      {adding ? (
        <AddCoachForm
          onCancel={() => setAdding(false)}
          onCreate={async (nom, couleur) => {
            await createCoach(nom, couleur);
            setAdding(false);
          }}
        />
      ) : null}

      {/* Liste actifs */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <header className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-800">
          ✓ Actifs
        </header>
        <div className="divide-y divide-gray-100">
          {actifs.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500 italic">
              Aucun coach actif. Clique sur « + Ajouter un coach » pour
              commencer.
            </p>
          ) : (
            actifs.map((c) => (
              <CoachRow
                key={c.id}
                coach={c}
                disabled={pending}
                onSave={(patch) => patchCoach(c.id, patch)}
                onDelete={() => deleteCoach(c.id, c.nom)}
                onToggleActif={() => patchCoach(c.id, { actif: false })}
              />
            ))
          )}
        </div>
      </section>

      {/* Liste inactifs (repliée si vide) */}
      {inactifs.length > 0 ? (
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden opacity-75">
          <header className="bg-gray-100 border-b border-gray-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-600">
            Inactifs (n&apos;apparaissent plus dans les sélecteurs)
          </header>
          <div className="divide-y divide-gray-100">
            {inactifs.map((c) => (
              <CoachRow
                key={c.id}
                coach={c}
                disabled={pending}
                onSave={(patch) => patchCoach(c.id, patch)}
                onDelete={() => deleteCoach(c.id, c.nom)}
                onToggleActif={() => patchCoach(c.id, { actif: true })}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CoachRow({
  coach,
  disabled,
  onSave,
  onDelete,
  onToggleActif,
}: {
  coach: Coach;
  disabled: boolean;
  onSave: (patch: object) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onToggleActif: () => Promise<void> | void;
}) {
  const [nom, setNom] = useState(coach.nom);
  const [couleur, setCouleur] = useState(coach.couleur ?? "#0d2e3f");

  const dirty = nom !== coach.nom || couleur !== (coach.couleur ?? "#0d2e3f");

  function save() {
    if (!dirty) return;
    onSave({ nom, couleur });
  }

  return (
    <div className="px-4 py-3 flex flex-wrap items-center gap-3">
      {/* Pastille couleur */}
      <span
        className="inline-block w-6 h-6 rounded-full border-2 border-white shadow shrink-0"
        style={{ backgroundColor: couleur }}
        aria-hidden
      />

      {/* Nom */}
      <input
        type="text"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        disabled={disabled}
        className="rounded border border-gray-300 px-2 py-1 text-sm min-w-[140px] flex-1 sm:flex-none sm:w-48"
      />

      {/* Couleur */}
      <div className="flex items-center gap-1 flex-wrap">
        {COULEURS.map((col) => (
          <button
            key={col}
            type="button"
            disabled={disabled}
            onClick={() => setCouleur(col)}
            title={col}
            className={`w-5 h-5 rounded-full border-2 transition ${
              couleur === col
                ? "border-navy scale-110 shadow"
                : "border-white hover:scale-105"
            }`}
            style={{ backgroundColor: col }}
          />
        ))}
        <input
          type="color"
          value={couleur}
          onChange={(e) => setCouleur(e.target.value)}
          disabled={disabled}
          title="Personnalisée"
          className="w-6 h-6 rounded cursor-pointer border border-gray-300"
        />
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-1">
        {dirty ? (
          <button
            onClick={save}
            disabled={disabled}
            className="rounded bg-navy text-white px-3 py-1 text-xs font-bold hover:bg-navy-dark disabled:opacity-40"
          >
            Enregistrer
          </button>
        ) : null}
        <button
          onClick={() => onToggleActif()}
          disabled={disabled}
          className="rounded text-xs px-2 py-1 hover:bg-gray-100 text-gray-600"
          title={coach.actif ? "Mettre en sommeil" : "Réactiver"}
        >
          {coach.actif ? "💤 Désactiver" : "🔄 Réactiver"}
        </button>
        <button
          onClick={() => onDelete()}
          disabled={disabled}
          className="rounded text-base hover:scale-110 transition opacity-60 hover:opacity-100 disabled:opacity-30"
          title="Supprimer définitivement"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function AddCoachForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (nom: string, couleur: string) => Promise<void>;
}) {
  const [nom, setNom] = useState("");
  const [couleur, setCouleur] = useState(COULEURS[0]);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!nom.trim()) return;
    setSubmitting(true);
    try {
      await onCreate(nom.trim(), couleur);
      setNom("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl bg-white border-2 border-emerald-500 shadow-sm p-4 flex flex-wrap items-center gap-3">
      <span
        className="inline-block w-6 h-6 rounded-full border-2 border-white shadow shrink-0"
        style={{ backgroundColor: couleur }}
      />
      <input
        type="text"
        autoFocus
        placeholder="Nom du coach (ex: Julien)"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm min-w-[180px] flex-1"
      />
      <div className="flex items-center gap-1 flex-wrap">
        {COULEURS.map((col) => (
          <button
            key={col}
            type="button"
            onClick={() => setCouleur(col)}
            className={`w-5 h-5 rounded-full border-2 transition ${
              couleur === col
                ? "border-navy scale-110 shadow"
                : "border-white hover:scale-105"
            }`}
            style={{ backgroundColor: col }}
          />
        ))}
      </div>
      <div className="ml-auto flex gap-2">
        <button
          onClick={submit}
          disabled={submitting || !nom.trim()}
          className="rounded bg-emerald-600 text-white px-4 py-1.5 text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? "…" : "Créer"}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="text-gray-600 hover:text-gray-900 px-3 py-1.5 text-sm"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
