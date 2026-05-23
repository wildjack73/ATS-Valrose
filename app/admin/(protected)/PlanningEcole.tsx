"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type Coach,
  type GroupeWithMembers,
  type GroupeMembre,
  type JourSemaine,
  JOURS_LABELS,
  JOURS_ORDER,
  formatHeure,
} from "@/lib/data/planning-types";
import { age } from "@/lib/admin/format";

interface Props {
  saisonId: string;
  groupes: GroupeWithMembers[];
  coaches: Coach[];
  inscriptionsSansGroupe: GroupeMembre[];
}

export default function PlanningEcole({
  saisonId,
  groupes,
  coaches,
  inscriptionsSansGroupe,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [filterJour, setFilterJour] = useState<JourSemaine | "all">("all");

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

  // Grouper par jour
  const groupesByJour = useMemo(() => {
    const map = new Map<JourSemaine, GroupeWithMembers[]>();
    for (const g of groupes) {
      const arr = map.get(g.jour) ?? [];
      arr.push(g);
      map.set(g.jour, arr);
    }
    return map;
  }, [groupes]);

  const visibleJours = filterJour === "all" ? JOURS_ORDER : [filterJour];

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          ⚠ {error}
        </div>
      ) : null}

      {/* Barre d'actions */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase text-gray-500">
            Jour :
          </label>
          <select
            value={filterJour}
            onChange={(e) =>
              setFilterJour(e.target.value as JourSemaine | "all")
            }
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="all">Tous les jours</option>
            {JOURS_ORDER.map((j) => (
              <option key={j} value={j}>
                {JOURS_LABELS[j]}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-xs text-gray-600">
          <strong>{groupes.length}</strong> groupes ·{" "}
          <strong>
            {groupes.reduce((s, g) => s + g.membres.length, 0)}
          </strong>{" "}
          élèves placés ·{" "}
          <strong className="text-orange-600">
            {inscriptionsSansGroupe.length}
          </strong>{" "}
          à placer
        </div>
        <button
          onClick={() => setCreating(true)}
          className="rounded bg-ocre text-white px-4 py-1.5 text-sm font-bold hover:bg-ocre-dark"
        >
          + Nouveau groupe
        </button>
      </div>

      {creating ? (
        <CreateGroupeForm
          saisonId={saisonId}
          coaches={coaches}
          onCancel={() => setCreating(false)}
          onCreate={async (data) => {
            await withError(async () => {
              const res = await fetch("/api/admin/groupes-ecole", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error ?? "Échec création");
              }
            });
            setCreating(false);
          }}
        />
      ) : null}

      {/* Élèves non placés */}
      {inscriptionsSansGroupe.length > 0 ? (
        <section className="rounded-xl bg-orange-50 border border-orange-200 p-4">
          <h3 className="font-bold text-orange-900 mb-2">
            ⚠ {inscriptionsSansGroupe.length} élève
            {inscriptionsSansGroupe.length > 1 ? "s" : ""} non placé
            {inscriptionsSansGroupe.length > 1 ? "s" : ""}
          </h3>
          <div className="text-xs text-orange-800 mb-3">
            Ces élèves se sont inscrits mais ne sont assignés à aucun groupe.
            Utilise le bouton <strong>+ Ajouter</strong> sur un groupe pour les
            placer.
          </div>
          <div className="flex flex-wrap gap-2">
            {inscriptionsSansGroupe.map((i) => (
              <div
                key={i.inscription_id}
                className="rounded-full bg-white border border-orange-300 px-3 py-1 text-xs"
              >
                {i.prenom} {i.nom}
                {i.niveau ? (
                  <span className="text-orange-700"> · {i.niveau}</span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Groupes par jour */}
      {visibleJours.map((jour) => {
        const list = groupesByJour.get(jour) ?? [];
        if (list.length === 0 && filterJour !== "all") {
          return (
            <section key={jour} className="rounded-xl bg-white border border-gray-200 p-6 text-center text-gray-500">
              Aucun groupe le {JOURS_LABELS[jour].toLowerCase()} pour le moment.
            </section>
          );
        }
        if (list.length === 0) return null;
        return (
          <section key={jour}>
            <h2 className="text-lg font-extrabold text-navy mb-3 sticky top-16 bg-gradient-to-r from-white to-transparent px-2 py-1 rounded -ml-2 z-10">
              📅 {JOURS_LABELS[jour]}
            </h2>
            <div className="grid lg:grid-cols-2 gap-3">
              {list.map((g) => (
                <GroupeCard
                  key={g.id}
                  groupe={g}
                  coaches={coaches}
                  inscriptionsSansGroupe={inscriptionsSansGroupe}
                  pending={pending}
                  onUpdate={(patch) =>
                    withError(async () => {
                      const res = await fetch(
                        `/api/admin/groupes-ecole/${g.id}`,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(patch),
                        },
                      );
                      if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        throw new Error(j.error ?? "Échec mise à jour");
                      }
                    })
                  }
                  onDelete={() =>
                    withError(async () => {
                      const res = await fetch(
                        `/api/admin/groupes-ecole/${g.id}`,
                        { method: "DELETE" },
                      );
                      if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        throw new Error(j.error ?? "Échec suppression");
                      }
                    })
                  }
                  onAddMember={(inscription_id) =>
                    withError(async () => {
                      const res = await fetch(
                        `/api/admin/groupes-ecole/${g.id}/membres`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ inscription_id }),
                        },
                      );
                      if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        throw new Error(j.error ?? "Échec ajout");
                      }
                    })
                  }
                  onRemoveMember={(inscription_id) =>
                    withError(async () => {
                      const res = await fetch(
                        `/api/admin/groupes-ecole/${g.id}/membres?inscription_id=${encodeURIComponent(inscription_id)}`,
                        { method: "DELETE" },
                      );
                      if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        throw new Error(j.error ?? "Échec retrait");
                      }
                    })
                  }
                />
              ))}
            </div>
          </section>
        );
      })}

      {groupes.length === 0 ? (
        <section className="rounded-xl bg-white border border-gray-200 p-10 text-center">
          <p className="text-gray-600">
            Aucun groupe créé pour le moment.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="mt-4 rounded bg-ocre text-white px-4 py-2 text-sm font-bold hover:bg-ocre-dark"
          >
            + Créer le premier groupe
          </button>
        </section>
      ) : null}
    </div>
  );
}

// --- Carte d'un groupe ------------------------------------------------------

function GroupeCard({
  groupe,
  coaches,
  inscriptionsSansGroupe,
  pending,
  onUpdate,
  onDelete,
  onAddMember,
  onRemoveMember,
}: {
  groupe: GroupeWithMembers;
  coaches: Coach[];
  inscriptionsSansGroupe: GroupeMembre[];
  pending: boolean;
  onUpdate: (patch: object) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddMember: (inscription_id: string) => Promise<void>;
  onRemoveMember: (inscription_id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  const coachColor = groupe.coach?.couleur ?? "#0d2e3f";
  const placesLibres = Math.max(0, groupe.capacite_max - groupe.membres.length);
  const isFull = placesLibres === 0;

  return (
    <article
      className="rounded-xl bg-white border-2 shadow-sm overflow-hidden"
      style={{ borderColor: `${coachColor}40` }}
    >
      <header
        className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
        style={{ backgroundColor: `${coachColor}15` }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="rounded-full px-3 py-1 text-xs font-bold text-white"
            style={{ backgroundColor: coachColor }}
          >
            {groupe.coach?.nom ?? "—"}
          </span>
          <span className="font-bold text-navy">
            {formatHeure(groupe.heure_debut)}
            {groupe.heure_fin ? ` – ${formatHeure(groupe.heure_fin)}` : ""}
          </span>
          {groupe.court ? (
            <span className="text-sm text-gray-700">· {groupe.court}</span>
          ) : null}
          {groupe.niveau ? (
            <span className="text-sm font-semibold text-navy">
              · {groupe.niveau}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isFull
                ? "bg-red-100 text-red-700"
                : groupe.membres.length === 0
                  ? "bg-gray-100 text-gray-600"
                  : "bg-green-100 text-green-700"
            }`}
          >
            {groupe.membres.length} / {groupe.capacite_max}
          </span>
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs text-navy hover:underline"
            disabled={pending}
          >
            {editing ? "Fermer" : "✏️"}
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  `Supprimer ce groupe ?\n${groupe.coach?.nom ?? ""} ${formatHeure(groupe.heure_debut)} ${groupe.niveau ?? ""}`,
                )
              )
                onDelete();
            }}
            className="text-xs text-red-600 hover:underline"
            disabled={pending}
          >
            🗑️
          </button>
        </div>
      </header>

      {editing ? (
        <EditGroupeForm
          groupe={groupe}
          coaches={coaches}
          onSave={async (patch) => {
            await onUpdate(patch);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
          disabled={pending}
        />
      ) : null}

      {/* Membres */}
      <ul className="px-4 py-3 space-y-1.5">
        {groupe.membres.length === 0 ? (
          <li className="text-sm text-gray-400 italic">Aucun élève placé.</li>
        ) : (
          groupe.membres.map((m) => (
            <li
              key={m.inscription_id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span>
                <strong className="text-navy">{m.prenom} {m.nom}</strong>
                <span className="text-xs text-gray-500 ml-2">
                  {age(m.date_naissance)} ans
                  {m.niveau ? ` · ${m.niveau}` : ""}
                </span>
              </span>
              <button
                onClick={() => onRemoveMember(m.inscription_id)}
                className="text-xs text-red-600 hover:underline"
                disabled={pending}
              >
                Retirer
              </button>
            </li>
          ))
        )}
      </ul>

      {/* Ajouter un élève */}
      <footer className="px-4 py-3 border-t bg-gray-50/50">
        {adding ? (
          <div className="flex items-center gap-2">
            <select
              autoFocus
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  onAddMember(e.target.value);
                  setAdding(false);
                }
              }}
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">— Choisir un élève à placer —</option>
              {inscriptionsSansGroupe.map((i) => (
                <option key={i.inscription_id} value={i.inscription_id}>
                  {i.prenom} {i.nom}
                  {i.niveau ? ` (${i.niveau})` : ""}
                </option>
              ))}
            </select>
            <button
              onClick={() => setAdding(false)}
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            disabled={isFull || pending || inscriptionsSansGroupe.length === 0}
            className="text-xs font-semibold text-ocre hover:underline disabled:opacity-40 disabled:no-underline"
            title={
              isFull
                ? "Groupe complet"
                : inscriptionsSansGroupe.length === 0
                  ? "Aucun élève à placer"
                  : "Ajouter un élève"
            }
          >
            + Ajouter un élève
          </button>
        )}
      </footer>
    </article>
  );
}

// --- Formulaire création groupe --------------------------------------------

function CreateGroupeForm({
  saisonId,
  coaches,
  onCancel,
  onCreate,
}: {
  saisonId: string;
  coaches: Coach[];
  onCancel: () => void;
  onCreate: (data: object) => Promise<void>;
}) {
  const [jour, setJour] = useState<JourSemaine>("mercredi");
  const [heureDebut, setHeureDebut] = useState("17:00");
  const [heureFin, setHeureFin] = useState("18:30");
  const [court, setCourt] = useState("");
  const [coachId, setCoachId] = useState(coaches[0]?.id ?? "");
  const [niveau, setNiveau] = useState("");
  const [capacite, setCapacite] = useState("8");

  async function submit() {
    await onCreate({
      saison_id: saisonId,
      jour,
      heure_debut: heureDebut,
      heure_fin: heureFin || null,
      court: court || null,
      coach_id: coachId || null,
      niveau: niveau || null,
      capacite_max: parseInt(capacite, 10) || 8,
    });
  }

  return (
    <div className="rounded-xl bg-white border-2 border-ocre p-5 shadow-md">
      <h3 className="font-bold text-navy mb-4">Nouveau groupe</h3>
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <Field label="Jour">
          <select
            className={inputCls}
            value={jour}
            onChange={(e) => setJour(e.target.value as JourSemaine)}
          >
            {JOURS_ORDER.map((j) => (
              <option key={j} value={j}>
                {JOURS_LABELS[j]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Heure début">
          <input
            type="time"
            className={inputCls}
            value={heureDebut}
            onChange={(e) => setHeureDebut(e.target.value)}
          />
        </Field>
        <Field label="Heure fin">
          <input
            type="time"
            className={inputCls}
            value={heureFin}
            onChange={(e) => setHeureFin(e.target.value)}
          />
        </Field>
        <Field label="Coach">
          <select
            className={inputCls}
            value={coachId}
            onChange={(e) => setCoachId(e.target.value)}
          >
            <option value="">— Aucun —</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Court">
          <input
            className={inputCls}
            value={court}
            onChange={(e) => setCourt(e.target.value)}
            placeholder="Court 3, Padel 1…"
          />
        </Field>
        <Field label="Niveau">
          <input
            className={inputCls}
            value={niveau}
            onChange={(e) => setNiveau(e.target.value)}
            placeholder="Baby tennis, Rouge, Adultes…"
          />
        </Field>
        <Field label="Capacité max">
          <input
            type="number"
            min="1"
            className={inputCls}
            value={capacite}
            onChange={(e) => setCapacite(e.target.value)}
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <button
          onClick={submit}
          className="rounded bg-ocre text-white px-4 py-2 text-sm font-bold hover:bg-ocre-dark"
        >
          Créer
        </button>
        <button
          onClick={onCancel}
          className="rounded text-gray-600 hover:text-gray-900 px-4 py-2 text-sm"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function EditGroupeForm({
  groupe,
  coaches,
  onSave,
  onCancel,
  disabled,
}: {
  groupe: GroupeWithMembers;
  coaches: Coach[];
  onSave: (patch: object) => Promise<void>;
  onCancel: () => void;
  disabled: boolean;
}) {
  const [jour, setJour] = useState<JourSemaine>(groupe.jour);
  const [heureDebut, setHeureDebut] = useState(formatHeure(groupe.heure_debut));
  const [heureFin, setHeureFin] = useState(formatHeure(groupe.heure_fin));
  const [court, setCourt] = useState(groupe.court ?? "");
  const [coachId, setCoachId] = useState(groupe.coach_id ?? "");
  const [niveau, setNiveau] = useState(groupe.niveau ?? "");
  const [capacite, setCapacite] = useState(groupe.capacite_max.toString());
  const [notes, setNotes] = useState(groupe.notes ?? "");

  async function save() {
    await onSave({
      jour,
      heure_debut: heureDebut,
      heure_fin: heureFin || null,
      court: court || null,
      coach_id: coachId || null,
      niveau: niveau || null,
      capacite_max: parseInt(capacite, 10) || 8,
      notes: notes || null,
    });
  }

  return (
    <div className="px-4 py-3 bg-yellow-50/50 border-y border-yellow-200 space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Jour">
          <select
            className={inputCls}
            value={jour}
            onChange={(e) => setJour(e.target.value as JourSemaine)}
          >
            {JOURS_ORDER.map((j) => (
              <option key={j} value={j}>
                {JOURS_LABELS[j]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Heure début">
          <input
            type="time"
            className={inputCls}
            value={heureDebut}
            onChange={(e) => setHeureDebut(e.target.value)}
          />
        </Field>
        <Field label="Heure fin">
          <input
            type="time"
            className={inputCls}
            value={heureFin}
            onChange={(e) => setHeureFin(e.target.value)}
          />
        </Field>
        <Field label="Coach">
          <select
            className={inputCls}
            value={coachId}
            onChange={(e) => setCoachId(e.target.value)}
          >
            <option value="">— Aucun —</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Court">
          <input
            className={inputCls}
            value={court}
            onChange={(e) => setCourt(e.target.value)}
          />
        </Field>
        <Field label="Niveau">
          <input
            className={inputCls}
            value={niveau}
            onChange={(e) => setNiveau(e.target.value)}
          />
        </Field>
        <Field label="Capacité max">
          <input
            type="number"
            min="1"
            className={inputCls}
            value={capacite}
            onChange={(e) => setCapacite(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Notes">
        <input
          className={inputCls}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={disabled}
          className="rounded bg-navy text-white px-4 py-1.5 text-sm font-bold hover:bg-navy-dark disabled:opacity-50"
        >
          Enregistrer
        </button>
        <button
          onClick={onCancel}
          disabled={disabled}
          className="rounded text-gray-600 hover:text-gray-900 px-4 py-1.5 text-sm"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

// --- Helpers ---------------------------------------------------------------

const inputCls =
  "w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-ocre focus:ring-1 focus:ring-ocre/30 outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
