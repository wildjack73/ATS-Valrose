"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { InscriptionEcoleRow } from "@/lib/types/db";
import {
  formatDateTime,
  age,
  coursTennisLabels,
  coursPadelLabels,
  modeReglementLabel,
  licenceFftLabel,
  statutLabel,
  statutBadgeClass,
  statutRowClass,
} from "@/lib/admin/format";
import InlineStatusBadge from "./InlineStatusBadge";

const STATUTS = ["en_attente", "paye", "annule"] as const;

export default function EcoleTable({
  rows,
  currentStatut,
}: {
  rows: InscriptionEcoleRow[];
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
    next.set("tab", "ecole");
    router.push(`/admin?${next.toString()}`);
  }

  async function patchInscription(id: string, patch: object) {
    startTransition(async () => {
      await fetch(`/api/admin/inscriptions/ecole/${id}`, {
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
      const res = await fetch(`/api/admin/inscriptions/ecole/${id}`, {
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
          href={`/api/admin/export/ecole?${params.toString()}`}
          className="ml-auto rounded-md bg-yellow-club text-navy px-3 py-1.5 text-xs font-semibold hover:bg-yellow-hover"
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="text-left p-3 w-24">Date</th>
              <th className="text-left p-3">Élève</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3 w-32">Téléphone</th>
              <th className="text-left p-3">Cours & dispo</th>
              <th className="text-right p-3 w-20">Total</th>
              <th className="text-left p-3 w-40">Statut</th>
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  Aucune inscription pour le moment.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <EcoleRowGroup
                  key={r.id}
                  row={r}
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

function EcoleRowGroup({
  row,
  open,
  toggle,
  patch,
  remove,
  pending,
}: {
  row: InscriptionEcoleRow;
  open: boolean;
  toggle: () => void;
  patch: (p: object) => void;
  remove: () => void;
  pending: boolean;
}) {
  const dispo = [
    row.dispo_mercredi ? `Mer: ${row.dispo_mercredi}` : null,
    row.dispo_samedi ? `Sam: ${row.dispo_samedi}` : null,
    row.dispo_semaine ? `Sem: ${row.dispo_semaine}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  function handleRowClick(e: React.MouseEvent<HTMLTableRowElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("a, button, input, select, textarea, label")) return;
    toggle();
  }

  return (
    <>
      <tr
        onClick={handleRowClick}
        className={`border-t cursor-pointer hover:bg-ocre/5 transition-colors ${statutRowClass(row.statut)}`}
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
            {row.code_postal_ville ? ` • ${row.code_postal_ville}` : ""}
          </div>
        </td>
        <td className="p-3 text-xs align-top break-all">
          <a
            href={`mailto:${row.email}`}
            className="text-navy hover:text-yellow-hover hover:underline"
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
          {coursTennisLabels(row.cours_tennis) ? (
            <div>
              <span className="text-gray-500">🎾</span>{" "}
              {coursTennisLabels(row.cours_tennis)}
            </div>
          ) : null}
          {coursPadelLabels(row.cours_padel) ? (
            <div>
              <span className="text-purple-500">🏓</span>{" "}
              {coursPadelLabels(row.cours_padel)}
            </div>
          ) : null}
          {row.licence_pickleball ? (
            <div className="text-gray-500">+ Pickleball</div>
          ) : null}
          {dispo ? (
            <div className="text-gray-500 italic mt-1">{dispo}</div>
          ) : null}
          <div className="text-[10px] text-gray-400 mt-1">
            {modeReglementLabel(row.mode_reglement)} × {row.nb_paiements} ·{" "}
            {licenceFftLabel(row.licence_fft)}
          </div>
        </td>
        <td className="p-3 text-right font-bold text-navy align-top">
          {row.prix_total}€
        </td>
        <td className="p-3 align-top">
          <InlineStatusBadge
            value={row.statut}
            disabled={pending}
            onChange={(s) => patch({ statut: s })}
            paiementInfo={row.paiement_info}
            notesAdmin={row.notes_admin}
          />
        </td>
        <td className="p-3 whitespace-nowrap">
          <div className="flex items-center gap-1">
            <a
              href={`mailto:${row.email}?subject=${encodeURIComponent(`Inscription École ${row.prenom} ${row.nom}`)}`}
              className="text-base hover:scale-110 transition"
              title={`Écrire à ${row.email}`}
            >
              📧
            </a>
            <a
              href={`tel:${row.telephone.replace(/\s/g, "")}`}
              className="text-base hover:scale-110 transition"
              title={`Appeler ${row.telephone}`}
            >
              📞
            </a>
            <button
              onClick={remove}
              disabled={pending}
              className="text-base hover:scale-110 transition opacity-60 hover:opacity-100 disabled:opacity-30"
              title="Supprimer cette inscription"
            >
              🗑️
            </button>
          </div>
        </td>
      </tr>
      {open ? (
        <tr className="border-t bg-ocre/5">
          <td colSpan={8} className="p-4">
            <EcoleEditPanel row={row} patch={patch} pending={pending} />
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
      className={`w-3.5 h-3.5 mt-0.5 text-clay shrink-0 transition-transform ${
        open ? "rotate-90" : ""
      }`}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function EcoleEditPanel({
  row,
  patch,
  pending,
}: {
  row: InscriptionEcoleRow;
  patch: (p: object) => void;
  pending: boolean;
}) {
  const [statut, setStatut] = useState(row.statut);
  const [paiement, setPaiement] = useState(row.paiement_info ?? "");
  const [notes, setNotes] = useState(row.notes_admin ?? "");

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
            placeholder="ex: 4 chèques mensuels n°123-126, espèces…"
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
        ) : (
          <span />
        )}
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
