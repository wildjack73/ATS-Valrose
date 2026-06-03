"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { InscriptionStageRow } from "@/lib/types/db";
import type { Semaine, OptionF4 } from "@/lib/data/tarifs-types";
import {
  formatDateTime,
  age,
  formuleLabel,
  creneauLabel,
  f4SelectionLabel,
  statutLabel,
  statutBadgeClass,
  statutRowClass,
} from "@/lib/admin/format";
import InlineStatusBadge from "./InlineStatusBadge";
import {
  PaiementsPanel,
  PaiementBadge,
  type PaiementClient,
} from "./PaiementsPanel";
import { IconMail, IconPhone, IconTrash, IconPause, IconPlay } from "./Icons";

const STATUTS = ["en_attente", "paye", "annule"] as const;

const FORMULES_FILTRE = [
  { code: "formule_1", label: "Formule 1 — Baby" },
  { code: "formule_2", label: "Formule 2 — Demi-journée" },
  { code: "formule_3", label: "Formule 3 — Journée" },
  { code: "formule_4", label: "Formule 4 — À la carte" },
] as const;

export default function StagesTable({
  rows,
  semaines,
  optionsF4,
  paiementsByInscription,
  currentSemaine,
  currentStatut,
  currentFormule,
}: {
  rows: InscriptionStageRow[];
  semaines: Semaine[];
  optionsF4: OptionF4[];
  paiementsByInscription: Record<string, PaiementClient[]>;
  currentSemaine?: string;
  currentStatut?: string;
  currentFormule?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Filtre par nom / prénom / email (les autres filtres sont déjà appliqués
  // côté serveur via les query params).
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${r.prenom} ${r.nom} ${r.email}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("tab", "stages");
    router.push(`/admin?${next.toString()}`);
  }

  async function patchInscription(id: string, patch: object) {
    startTransition(async () => {
      await fetch(`/api/admin/inscriptions/stages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      router.refresh();
    });
  }

  async function deleteInscription(id: string, label: string) {
    if (
      !window.confirm(
        `Supprimer définitivement l'inscription de ${label} ?\n\nCette action est irréversible.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/admin/inscriptions/stages/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        window.alert("Échec de la suppression. Réessaye.");
        return;
      }
      if (openId === id) setOpenId(null);
      router.refresh();
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-b-xl rounded-tr-xl shadow-sm">
      <div className="p-4 border-b flex flex-wrap items-center gap-3">
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={currentSemaine ?? ""}
          onChange={(e) => updateParam("semaine", e.target.value)}
        >
          <option value="">Toutes les semaines</option>
          {semaines
            .filter((s) => s.ouverte)
            .map((s) => (
              <option key={s.id} value={s.code}>
                {s.periode} — {s.label}
              </option>
            ))}
        </select>
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={currentFormule ?? ""}
          onChange={(e) => updateParam("formule", e.target.value)}
        >
          <option value="">Toutes les formules</option>
          {FORMULES_FILTRE.map((f) => (
            <option key={f.code} value={f.code}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={currentStatut ?? ""}
          onChange={(e) => updateParam("statut", e.target.value)}
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {statutLabel(s)}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher nom ou email…"
          className="ml-auto rounded-md border border-gray-300 px-2 py-1.5 text-sm w-56"
        />
        <a
          href={`/api/admin/export/stages?${params.toString()}`}
          className="rounded-md bg-yellow-club text-navy px-3 py-1.5 text-xs font-semibold hover:bg-yellow-hover"
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="text-left p-3 w-24">Date</th>
              <th className="text-left p-3">Enfant</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3 w-32">Téléphone</th>
              <th className="text-left p-3">Stage</th>
              <th className="text-right p-3 w-16">Prix</th>
              <th className="text-left p-3 w-40">Statut</th>
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  {rows.length === 0
                    ? "Aucune inscription pour le moment."
                    : "Aucune inscription ne correspond à la recherche."}
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <RowGroup
                  key={r.id}
                  row={r}
                  optionsF4={optionsF4}
                  paiements={paiementsByInscription[r.id] ?? []}
                  open={openId === r.id}
                  toggle={() => setOpenId(openId === r.id ? null : r.id)}
                  patch={(p) => patchInscription(r.id, p)}
                  remove={() =>
                    deleteInscription(r.id, `${r.prenom} ${r.nom}`)
                  }
                  pending={pending}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- Composant ligne (en deux <tr> : la ligne + le panneau d'édition) -------

function RowGroup({
  row,
  optionsF4,
  paiements,
  open,
  toggle,
  patch,
  remove,
  pending,
}: {
  row: InscriptionStageRow;
  optionsF4: OptionF4[];
  paiements: PaiementClient[];
  open: boolean;
  toggle: () => void;
  patch: (p: object) => void;
  remove: () => void;
  pending: boolean;
}) {
  const totalPaye = paiements.reduce((s, p) => s + p.montant, 0);
  // Clic sur la ligne = toggle, mais on évite si le clic vient d'un élément
  // interactif (lien, bouton, input) — sinon on bloque mailto:, tel:, etc.
  function handleRowClick(e: React.MouseEvent<HTMLTableRowElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("a, button, input, select, textarea, label")) return;
    toggle();
  }

  return (
    <>
      <tr
        onClick={handleRowClick}
        className={`border-t cursor-pointer hover:bg-yellow-club/5 transition-colors ${statutRowClass(row.statut)} ${
          row.desactive ? "opacity-50 [&_*]:line-through" : ""
        }`}
      >
        <td className="p-3 whitespace-nowrap text-gray-600 text-xs align-top">
          <div className="flex items-start gap-2">
            <Chevron open={open} />
            <span>{formatDateTime(row.created_at)}</span>
          </div>
        </td>
        <td className="p-3 align-top">
          <div className="font-semibold text-navy">
            {row.prenom} {row.nom}
          </div>
          <div className="text-xs text-gray-500">
            {age(row.date_naissance)} ans
            {row.niveau ? ` • ${row.niveau}` : ""}
          </div>
        </td>
        <td className="p-3 text-xs align-top max-w-[180px]">
          <a
            href={`mailto:${row.email}`}
            title={row.email}
            className="block truncate text-navy hover:text-yellow-hover hover:underline"
          >
            {row.email}
          </a>
        </td>
        <td className="p-3 text-xs whitespace-nowrap align-top">
          <a
            href={`tel:${row.telephone.replace(/\s/g, "")}`}
            className="text-navy hover:text-yellow-hover hover:underline"
          >
            {row.telephone}
          </a>
        </td>
        <td className="p-3 text-xs align-top">
          <div className="font-semibold text-navy">{row.semaine_label}</div>
          <div className="text-gray-600">{formuleLabel(row.formule)}</div>
          <div className="text-gray-500 text-[11px]">
            {creneauLabel(row.formule_creneau)}
            {row.formule_dejeuner ? " · + déjeuner" : ""}
            {row.formule === "formule_4"
              ? f4SelectionLabel(row.formule_4_selection)
              : ""}
          </div>
        </td>
        <td className="p-3 text-right font-bold text-navy align-top whitespace-nowrap">
          <div>{row.prix_total}€</div>
          <div className="mt-1 flex justify-end">
            <PaiementBadge
              totalPaye={totalPaye}
              prixTotal={row.prix_total}
              statut={row.statut}
            />
          </div>
        </td>
        <td className="p-3">
          <InlineStatusBadge
            value={row.statut}
            disabled={pending}
            onChange={(s) => patch({ statut: s })}
            paiementInfo={row.paiement_info}
            notesAdmin={row.notes_admin}
          />
        </td>
        <td className="p-3 whitespace-nowrap">
          <div className="flex items-center gap-2 text-gray-400">
            <a
              href={`mailto:${row.email}?subject=${encodeURIComponent(`Inscription stage ${row.semaine_label} - ${row.prenom} ${row.nom}`)}`}
              className="hover:text-navy transition no-underline"
              title={`Écrire à ${row.email}`}
              aria-label={`Écrire à ${row.email}`}
            >
              <IconMail />
            </a>
            <a
              href={`tel:${row.telephone.replace(/\s/g, "")}`}
              className="hover:text-navy transition no-underline"
              title={`Appeler ${row.telephone}`}
              aria-label={`Appeler ${row.telephone}`}
            >
              <IconPhone />
            </a>
            <button
              onClick={() => patch({ desactive: !row.desactive })}
              disabled={pending}
              className={`transition disabled:opacity-30 no-underline ${
                row.desactive
                  ? "text-emerald-600 hover:text-emerald-700"
                  : "hover:text-amber-600"
              }`}
              title={
                row.desactive
                  ? "Réactiver cette inscription"
                  : "Désactiver temporairement (libère la place, exclut des chiffres)"
              }
              aria-label={
                row.desactive ? "Réactiver" : "Désactiver temporairement"
              }
            >
              {row.desactive ? <IconPlay /> : <IconPause />}
            </button>
            <button
              onClick={remove}
              disabled={pending}
              className="hover:text-red-600 transition disabled:opacity-30 no-underline"
              title="Supprimer cette inscription"
              aria-label="Supprimer cette inscription"
            >
              <IconTrash />
            </button>
          </div>
        </td>
      </tr>
      {!open && (row.notes || row.notes_admin || row.paiement_info) ? (
        <tr
          onClick={toggle}
          className={`cursor-pointer ${statutRowClass(row.statut)}`}
        >
          <td colSpan={8} className="px-3 pb-2 pt-0">
            <div className="ml-5 text-xs space-y-1">
              {row.notes ? (
                <div className="text-gray-700">
                  <span className="font-semibold text-navy">
                    Note famille&nbsp;:
                  </span>{" "}
                  <span className="italic">{row.notes}</span>
                </div>
              ) : null}
              {row.notes_admin ? (
                <div className="text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  <span className="font-semibold">Note admin&nbsp;:</span>{" "}
                  {row.notes_admin}
                </div>
              ) : null}
              {row.paiement_info ? (
                <div className="text-emerald-900 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                  <span className="font-semibold">Règlement&nbsp;:</span>{" "}
                  {row.paiement_info}
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
      {open ? (
        <tr className="border-t bg-navy/5">
          <td colSpan={8} className="p-4">
            <EditPanel
              row={row}
              optionsF4={optionsF4}
              paiements={paiements}
              patch={patch}
              pending={pending}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`w-3.5 h-3.5 mt-0.5 text-navy shrink-0 transition-transform ${
        open ? "rotate-90" : ""
      }`}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

const JOURS_F4 = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"] as const;

function EditPanel({
  row,
  optionsF4,
  paiements,
  patch,
  pending,
}: {
  row: InscriptionStageRow;
  optionsF4: OptionF4[];
  paiements: PaiementClient[];
  patch: (p: object) => void;
  pending: boolean;
}) {
  const [statut, setStatut] = useState(row.statut);
  const [paiement, setPaiement] = useState(row.paiement_info ?? "");
  const [notes, setNotes] = useState(row.notes_admin ?? "");

  type Creneau = "matin" | "apres_midi" | null;
  function needsCreneau(opt: OptionF4 | undefined): boolean {
    if (!opt) return false;
    const d = (opt.detail ?? "").toLowerCase();
    return (
      d.includes("matin") &&
      (d.includes("après-midi") || d.includes("apres-midi"))
    );
  }

  // État éditable de la sélection F4 : jour -> code option ("" = aucun)
  const initialF4: Record<string, string> = {};
  const initialCreneau: Record<string, Creneau> = {};
  for (const j of JOURS_F4) {
    initialF4[j] = "";
    initialCreneau[j] = null;
  }
  const existing = (row.formule_4_selection ?? []) as {
    jour: string;
    option: string;
    creneau?: Creneau;
  }[];
  for (const it of existing) {
    if (it.jour) {
      initialF4[it.jour] = it.option;
      initialCreneau[it.jour] = it.creneau ?? null;
    }
  }
  const [f4, setF4] = useState<Record<string, string>>(initialF4);
  const [f4Creneau, setF4Creneau] =
    useState<Record<string, Creneau>>(initialCreneau);

  // Re-sync si le row a changé en arrière-plan (refresh)
  useEffect(() => {
    setStatut(row.statut);
    setPaiement(row.paiement_info ?? "");
    setNotes(row.notes_admin ?? "");
    const next: Record<string, string> = {};
    const nextCre: Record<string, Creneau> = {};
    for (const j of JOURS_F4) {
      next[j] = "";
      nextCre[j] = null;
    }
    for (const it of (row.formule_4_selection ?? []) as {
      jour: string;
      option: string;
      creneau?: Creneau;
    }[]) {
      if (it.jour) {
        next[it.jour] = it.option;
        nextCre[it.jour] = it.creneau ?? null;
      }
    }
    setF4(next);
    setF4Creneau(nextCre);
  }, [row.statut, row.paiement_info, row.notes_admin, row.formule_4_selection]);

  function save() {
    patch({ statut, paiement_info: paiement, notes_admin: notes });
  }

  function saveF4() {
    const selection = JOURS_F4.filter((j) => f4[j]).map((j) => {
      const opt = optionsF4.find((o) => o.code === f4[j]);
      return {
        jour: j,
        option: f4[j],
        creneau: needsCreneau(opt) ? f4Creneau[j] ?? null : null,
      };
    });
    patch({ formule_4_selection: selection });
  }

  // Prix prévisionnel des options F4 (hors repas, recalculé serveur)
  const f4Total = JOURS_F4.reduce((sum, j) => {
    const opt = optionsF4.find((o) => o.code === f4[j]);
    return sum + (opt?.prix ?? 0);
  }, 0);

  const f4Dirty =
    JSON.stringify(
      JOURS_F4.filter((j) => f4[j]).map((j) => {
        const opt = optionsF4.find((o) => o.code === f4[j]);
        return {
          jour: j,
          option: f4[j],
          creneau: needsCreneau(opt) ? f4Creneau[j] ?? null : null,
        };
      }),
    ) !==
    JSON.stringify(
      existing
        .filter((it) => it.jour)
        .map((it) => ({
          jour: it.jour,
          option: it.option,
          creneau: it.creneau ?? null,
        })),
    );

  const dirty =
    statut !== row.statut ||
    paiement !== (row.paiement_info ?? "") ||
    notes !== (row.notes_admin ?? "");

  return (
    <div className="space-y-3">
      {/* 💰 Paiements (en haut, c'est le geste le plus fréquent) */}
      <PaiementsPanel
        inscriptionType="stages"
        inscriptionId={row.id}
        prixTotal={row.prix_total}
        initial={paiements}
      />

      {/* Éditeur Formule 4 : option par jour */}
      {row.formule === "formule_4" ? (
        <div className="rounded-lg border-2 border-cyan-club/40 bg-cyan-club/5 p-3">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span className="text-xs font-bold text-navy uppercase tracking-wide">
              Formule 4 — option par jour
            </span>
            <span className="text-xs text-gray-600">
              Total activités&nbsp;:{" "}
              <strong className="text-navy">{f4Total}€</strong>
              {row.formule_dejeuner ? " + repas (recalculé à l'enregistrement)" : ""}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {JOURS_F4.map((j) => {
              const opt = optionsF4.find((o) => o.code === f4[j]);
              const showCreneau = needsCreneau(opt);
              return (
                <label key={j} className="block">
                  <span className="block text-[11px] font-semibold text-gray-600 capitalize mb-0.5">
                    {j}
                  </span>
                  <select
                    value={f4[j]}
                    disabled={pending}
                    onChange={(e) => setF4({ ...f4, [j]: e.target.value })}
                    className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs bg-white"
                  >
                    <option value="">— Aucun —</option>
                    {optionsF4.map((o) => (
                      <option key={o.code} value={o.code}>
                        {o.label} ({o.prix}€)
                      </option>
                    ))}
                  </select>
                  {showCreneau ? (
                    <select
                      value={f4Creneau[j] ?? ""}
                      disabled={pending}
                      onChange={(e) =>
                        setF4Creneau({
                          ...f4Creneau,
                          [j]:
                            e.target.value === ""
                              ? null
                              : (e.target.value as "matin" | "apres_midi"),
                        })
                      }
                      className={`w-full rounded border px-1.5 py-1 text-xs bg-white mt-1 ${
                        f4Creneau[j]
                          ? "border-gray-300"
                          : "border-amber-400 text-amber-700"
                      }`}
                    >
                      <option value="">— Créneau ? —</option>
                      <option value="matin">Matin</option>
                      <option value="apres_midi">Après-midi</option>
                    </select>
                  ) : null}
                </label>
              );
            })}
          </div>
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={saveF4}
              disabled={pending || !f4Dirty}
              className="rounded bg-cyan-club text-navy px-3 py-1.5 text-xs font-bold hover:bg-cyan-light disabled:opacity-40"
            >
              {pending ? "…" : "Enregistrer les jours F4"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Statut :
        </span>
        {STATUTS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => setStatut(s)}
            className={`text-xs px-3 py-1.5 rounded font-semibold border ${
              statut === s
                ? statutBadgeClass(s) + " border-current"
                : "bg-white border-gray-300 hover:border-navy text-gray-700"
            }`}
          >
            {statutLabel(s)}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-gray-600 uppercase">
            Comment réglé
          </span>
          <input
            type="text"
            value={paiement}
            onChange={(e) => setPaiement(e.target.value)}
            placeholder="ex: Chèque BNP n°123456, espèces, virement 12/05…"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-gray-600 uppercase">
            Commentaire admin
          </span>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Note privée (ne sera pas envoyée à la famille). Allergies, niveau précis, particularités…"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm resize-y"
          />
        </label>
      </div>

      <div className="flex items-center justify-between">
        {row.notes ? (
          <div className="text-xs text-gray-600">
            <strong>Note du parent :</strong> {row.notes}
          </div>
        ) : <span />}
        <button
          onClick={save}
          disabled={pending || !dirty}
          className="rounded bg-navy text-white px-4 py-1.5 text-sm font-bold hover:bg-navy-dark disabled:opacity-40"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
