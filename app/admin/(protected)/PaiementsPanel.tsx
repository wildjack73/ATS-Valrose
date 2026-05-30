"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type MoyenPaiement = "especes" | "cheque" | "virement" | "cb" | "autre";

export interface PaiementClient {
  id: string;
  montant: number;
  moyen: MoyenPaiement;
  reference: string | null;
  date_paiement: string;
  notes: string | null;
}

const MOYENS: { code: MoyenPaiement; label: string }[] = [
  { code: "especes", label: "Espèces" },
  { code: "cheque", label: "Chèque" },
  { code: "virement", label: "Virement" },
  { code: "cb", label: "Carte bleue" },
  { code: "autre", label: "Autre" },
];

function moyenLabel(m: MoyenPaiement): string {
  return MOYENS.find((x) => x.code === m)?.label ?? m;
}

function formatDateFR(d: string): string {
  // YYYY-MM-DD → DD/MM/YYYY
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function todayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Badge compact affiché sur la ligne d'inscription. */
export function PaiementBadge({
  totalPaye,
  prixTotal,
  statut,
}: {
  totalPaye: number;
  prixTotal: number;
  statut: string;
}) {
  if (statut === "annule") return null;
  if (prixTotal <= 0) return null;

  const reste = prixTotal - totalPaye;
  if (reste <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
        Soldé
      </span>
    );
  }
  if (totalPaye <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
        0 / {prixTotal}€
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
      {totalPaye} / {prixTotal}€
    </span>
  );
}

/** Panneau complet : liste des paiements + formulaire d'ajout. */
export function PaiementsPanel({
  inscriptionType,
  inscriptionId,
  prixTotal,
  initial,
}: {
  inscriptionType: "stages" | "ecole";
  inscriptionId: string;
  prixTotal: number;
  initial: PaiementClient[];
}) {
  const router = useRouter();
  const [paiements, setPaiements] = useState<PaiementClient[]>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPaiements(initial);
  }, [initial]);

  const totalPaye = paiements.reduce((s, p) => s + p.montant, 0);
  const reste = Math.max(0, prixTotal - totalPaye);

  // Form state
  const [montant, setMontant] = useState<string>(reste > 0 ? String(reste) : "");
  const [moyen, setMoyen] = useState<MoyenPaiement>("cheque");
  const [reference, setReference] = useState("");
  const [datePaiement, setDatePaiement] = useState(todayYMD());
  const [notes, setNotes] = useState("");

  // Si reste change après ajout/suppression, recale le montant par défaut tant
  // que l'utilisateur n'a pas tapé autre chose.
  useEffect(() => {
    setMontant(reste > 0 ? String(reste) : "");
  }, [reste]);

  async function addPaiement() {
    setError(null);
    const m = Math.round(Number(montant));
    if (!Number.isFinite(m) || m <= 0) {
      setError("Montant invalide");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/paiements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inscription_type: inscriptionType,
          inscription_id: inscriptionId,
          montant: m,
          moyen,
          reference: reference || null,
          date_paiement: datePaiement,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Échec de l'enregistrement");
        return;
      }
      const data = (await res.json()) as { paiement: PaiementClient };
      setPaiements((prev) =>
        [data.paiement, ...prev].sort((a, b) =>
          a.date_paiement < b.date_paiement ? 1 : -1,
        ),
      );
      // Reset form (montant sera recalé par useEffect)
      setReference("");
      setNotes("");
      router.refresh();
    });
  }

  async function deletePaiement(id: string) {
    if (!window.confirm("Supprimer ce paiement ?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/paiements/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        window.alert("Échec de la suppression");
        return;
      }
      setPaiements((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    });
  }

  const soldStateClass =
    reste === 0
      ? "border-emerald-300 bg-emerald-50"
      : totalPaye === 0
        ? "border-amber-300 bg-amber-50"
        : "border-blue-300 bg-blue-50";

  return (
    <div className={`rounded-md border ${soldStateClass} p-3`}>
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <span className="text-xs font-semibold text-navy uppercase tracking-wide">
          Paiements
        </span>
        <span className="text-xs font-bold text-navy">
          Reçu&nbsp;: <span>{totalPaye}€</span> / <span>{prixTotal}€</span>
          {reste > 0 ? (
            <span className="text-amber-800"> · reste {reste}€</span>
          ) : (
            <span className="text-emerald-700"> · soldé ✓</span>
          )}
        </span>
      </div>

      {paiements.length > 0 ? (
        <ul className="space-y-1 mb-3">
          {paiements.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 bg-white rounded border border-gray-200 px-2 py-1.5 text-xs"
            >
              <span className="font-semibold text-navy whitespace-nowrap tabular-nums">
                {p.montant}€
              </span>
              <span className="text-gray-500 whitespace-nowrap tabular-nums">
                {formatDateFR(p.date_paiement)}
              </span>
              <span className="text-gray-700">{moyenLabel(p.moyen)}</span>
              {p.reference ? (
                <span className="text-gray-600 italic truncate">
                  · {p.reference}
                </span>
              ) : null}
              {p.notes ? (
                <span className="text-gray-500 italic truncate">
                  · {p.notes}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => deletePaiement(p.id)}
                disabled={pending}
                className="ml-auto text-gray-400 hover:text-red-600 disabled:opacity-30"
                title="Supprimer ce paiement"
                aria-label="Supprimer ce paiement"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                  aria-hidden
                >
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-gray-500 italic mb-3">
          Aucun paiement enregistré pour le moment.
        </div>
      )}

      <div className="bg-white rounded border border-gray-300 p-2">
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Ajouter un paiement
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <label className="block">
            <span className="text-[10px] text-gray-500">Montant (€)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Moyen</span>
            <select
              value={moyen}
              onChange={(e) => setMoyen(e.target.value as MoyenPaiement)}
              className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs bg-white"
            >
              {MOYENS.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Date</span>
            <input
              type="date"
              value={datePaiement}
              onChange={(e) => setDatePaiement(e.target.value)}
              className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[10px] text-gray-500">
              Référence{" "}
              <span className="text-gray-400">
                (n° chèque, libellé virement…)
              </span>
            </span>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="ex: BNP 123456"
              className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
            />
          </label>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optionnel)"
            className="flex-1 rounded border border-gray-300 px-1.5 py-1 text-xs"
          />
          <button
            type="button"
            onClick={addPaiement}
            disabled={pending || !montant}
            className="rounded bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 whitespace-nowrap"
          >
            {pending ? "…" : "+ Ajouter"}
          </button>
        </div>
        {error ? (
          <div className="mt-2 text-xs text-red-600">{error}</div>
        ) : null}
      </div>
    </div>
  );
}
