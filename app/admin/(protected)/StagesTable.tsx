"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { InscriptionStageRow } from "@/lib/types/db";
import type { Semaine } from "@/lib/data/tarifs-types";
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

const STATUTS = ["en_attente", "paye", "annule"] as const;

export default function StagesTable({
  rows,
  semaines,
  currentSemaine,
  currentStatut,
}: {
  rows: InscriptionStageRow[];
  semaines: Semaine[];
  currentSemaine?: string;
  currentStatut?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);

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
        <a
          href={`/api/admin/export/stages?${params.toString()}`}
          className="ml-auto rounded-md bg-yellow-club text-navy px-3 py-1.5 text-xs font-semibold hover:bg-yellow-hover"
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Enfant</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Téléphone</th>
              <th className="text-left p-3">Semaine</th>
              <th className="text-left p-3">Formule</th>
              <th className="text-right p-3">Prix</th>
              <th className="text-left p-3">Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  Aucune inscription pour le moment.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <RowGroup
                  key={r.id}
                  row={r}
                  open={openId === r.id}
                  toggle={() => setOpenId(openId === r.id ? null : r.id)}
                  patch={(p) => patchInscription(r.id, p)}
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
  open,
  toggle,
  patch,
  pending,
}: {
  row: InscriptionStageRow;
  open: boolean;
  toggle: () => void;
  patch: (p: object) => void;
  pending: boolean;
}) {
  return (
    <>
      <tr className={`border-t ${statutRowClass(row.statut)}`}>
        <td className="p-3 whitespace-nowrap text-gray-600">
          {formatDateTime(row.created_at)}
        </td>
        <td className="p-3">
          <div className="font-semibold text-navy">
            {row.prenom} {row.nom}
          </div>
          <div className="text-xs text-gray-500">
            {age(row.date_naissance)} ans
            {row.niveau ? ` • ${row.niveau}` : ""}
          </div>
        </td>
        <td className="p-3 text-xs">
          <a
            href={`mailto:${row.email}`}
            className="text-navy hover:text-yellow-hover hover:underline"
          >
            {row.email}
          </a>
        </td>
        <td className="p-3 text-xs whitespace-nowrap">
          <a
            href={`tel:${row.telephone.replace(/\s/g, "")}`}
            className="text-navy hover:text-yellow-hover hover:underline"
          >
            {row.telephone}
          </a>
        </td>
        <td className="p-3 text-xs">{row.semaine_label}</td>
        <td className="p-3 text-xs">
          <div>{formuleLabel(row.formule)}</div>
          <div className="text-gray-500">
            {creneauLabel(row.formule_creneau)}
            {row.formule_dejeuner ? " + déjeuner" : ""}
            {row.formule === "formule_4"
              ? f4SelectionLabel(row.formule_4_selection)
              : ""}
          </div>
        </td>
        <td className="p-3 text-right font-bold text-navy">
          {row.prix_total}€
        </td>
        <td className="p-3">
          <div className="flex flex-col gap-1">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statutBadgeClass(
                row.statut,
              )}`}
            >
              {statutLabel(row.statut)}
            </span>
            <div className="flex gap-1 text-base leading-none">
              {row.paiement_info ? (
                <span title={`Règlement : ${row.paiement_info}`}>💳</span>
              ) : null}
              {row.notes_admin ? (
                <span title={`Note : ${row.notes_admin}`}>💬</span>
              ) : null}
            </div>
          </div>
        </td>
        <td className="p-3 whitespace-nowrap">
          <button
            onClick={toggle}
            className={`text-xs font-semibold px-3 py-1.5 rounded ${
              open
                ? "bg-navy text-white"
                : "bg-yellow-club text-navy hover:bg-yellow-hover"
            }`}
          >
            {open ? "Fermer" : "Éditer"}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="border-t bg-navy/5">
          <td colSpan={9} className="p-4">
            <EditPanel row={row} patch={patch} pending={pending} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function EditPanel({
  row,
  patch,
  pending,
}: {
  row: InscriptionStageRow;
  patch: (p: object) => void;
  pending: boolean;
}) {
  const [statut, setStatut] = useState(row.statut);
  const [paiement, setPaiement] = useState(row.paiement_info ?? "");
  const [notes, setNotes] = useState(row.notes_admin ?? "");

  // Re-sync si le row a changé en arrière-plan (refresh)
  useEffect(() => {
    setStatut(row.statut);
    setPaiement(row.paiement_info ?? "");
    setNotes(row.notes_admin ?? "");
  }, [row.statut, row.paiement_info, row.notes_admin]);

  function save() {
    patch({ statut, paiement_info: paiement, notes_admin: notes });
  }

  const dirty =
    statut !== row.statut ||
    paiement !== (row.paiement_info ?? "") ||
    notes !== (row.notes_admin ?? "");

  return (
    <div className="space-y-3">
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
