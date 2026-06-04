"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { InscriptionEcoleRow } from "@/lib/types/db";
import type { CoursEcole } from "@/lib/data/tarifs-types";
import {
  CRENEAUX_ECOLE,
  categorieLabel,
  type CreneauCategorie,
} from "@/lib/data/creneaux-ecole";
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
import {
  PaiementsPanel,
  PaiementBadge,
  type PaiementClient,
} from "./PaiementsPanel";
import { IconMail, IconPhone, IconTrash, IconPause, IconPlay } from "./Icons";
import { NiveauEleveSelect, NiveauFilter, matchesNiveau } from "./NiveauUI";
import { eleveKey } from "@/lib/data/niveaux";

const STATUTS = ["en_attente", "paye", "annule"] as const;

export default function EcoleTable({
  rows,
  paiementsByInscription,
  coursTennis,
  coursPadel,
  niveauxEleves,
  currentStatut,
  currentType,
  currentCours,
  currentCreneau,
}: {
  rows: InscriptionEcoleRow[];
  paiementsByInscription: Record<string, PaiementClient[]>;
  /** Tous les cours école de la saison active (pour peupler le filtre Cours
   *  même quand il n'y a pas encore d'inscription). */
  coursTennis: CoursEcole[];
  coursPadel: CoursEcole[];
  niveauxEleves: Record<string, string>;
  currentStatut?: string;
  currentType?: string;
  currentCours?: string;
  currentCreneau?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterNiveau, setFilterNiveau] = useState("");

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("tab", "ecole");
    router.push(`/admin?${next.toString()}`);
  }

  // ---- Calcul des options de filtres ----
  // Type : tennis / padel / pickleball (statique)
  // Cours : LISTE COMPLÈTE des cours de la saison (depuis bundle), pour pouvoir
  //          filtrer même sur un cours sans aucune inscription pour l'instant.
  // Créneau : valeurs uniques de dispo_mercredi + samedi + semaine (dérivé des
  //          inscriptions existantes, suffisant en pratique)
  const coursOptions = useMemo(() => {
    const all = [
      ...coursTennis.map((c) => ({
        key: `tennis:${c.code}`,
        label: c.label,
        type: "tennis" as const,
        order: c.order_idx,
      })),
      ...coursPadel.map((c) => ({
        key: `padel:${c.code}`,
        label: c.label,
        type: "padel" as const,
        order: c.order_idx,
      })),
    ];
    return all.sort((a, b) => {
      if (a.type !== b.type) return a.type === "tennis" ? -1 : 1;
      return a.order - b.order;
    });
  }, [coursTennis, coursPadel]);

  // Créneau : la liste COMPLÈTE proposée par le formulaire école
  // (lib/data/creneaux-ecole.ts), groupée par catégorie.
  const creneauOptionsByCategorie = useMemo(() => {
    const byCat: Record<CreneauCategorie, string[]> = {
      jeunes: [],
      adultes_tennis: [],
      padel: [],
    };
    for (const c of CRENEAUX_ECOLE) byCat[c.categorie].push(c.label);
    return byCat;
  }, []);

  // ---- Filtrage client (statut déjà appliqué côté serveur) ----
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Type : tennis / padel / pickleball
      if (currentType) {
        if (currentType === "tennis" && !(r.cours_tennis ?? []).length)
          return false;
        if (currentType === "padel" && !(r.cours_padel ?? []).length)
          return false;
        if (currentType === "pickleball" && !r.licence_pickleball) return false;
      }
      // Cours précis (format "tennis:CODE" ou "padel:CODE")
      if (currentCours) {
        const [t, code] = currentCours.split(":");
        if (t === "tennis" && !(r.cours_tennis ?? []).includes(code))
          return false;
        if (t === "padel" && !(r.cours_padel ?? []).includes(code))
          return false;
      }
      // Créneau : doit apparaître dans une des 3 dispos
      if (currentCreneau) {
        const hay = [r.dispo_mercredi, r.dispo_samedi, r.dispo_semaine]
          .filter(Boolean)
          .join(",")
          .toLowerCase();
        if (!hay.includes(currentCreneau.toLowerCase())) return false;
      }
      // Recherche libre nom / prénom / email
      const q = search.trim().toLowerCase();
      if (q) {
        const hay = `${r.prenom} ${r.nom} ${r.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // Filtre niveau (sur le niveau attribué par le prof, par élève)
      if (filterNiveau) {
        const lvl = niveauxEleves[eleveKey(r.nom, r.prenom)] ?? null;
        if (!matchesNiveau(lvl, filterNiveau)) return false;
      }
      return true;
    });
  }, [
    rows,
    currentType,
    currentCours,
    currentCreneau,
    search,
    filterNiveau,
    niveauxEleves,
  ]);

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
      <div className="p-4 border-b flex flex-wrap items-center gap-2">
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={currentType ?? ""}
          onChange={(e) => updateParam("type", e.target.value)}
        >
          <option value="">Tous types</option>
          <option value="tennis">Tennis</option>
          <option value="padel">Padel</option>
          <option value="pickleball">Pickleball</option>
        </select>
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm max-w-[220px]"
          value={currentCours ?? ""}
          onChange={(e) => updateParam("cours", e.target.value)}
        >
          <option value="">Tous les cours</option>
          {coursOptions
            .filter(
              (o) =>
                !currentType ||
                currentType === "pickleball" ||
                o.type === currentType,
            )
            .map((o) => (
              <option key={o.key} value={o.key}>
                {o.type === "tennis" ? "Tennis — " : "Padel — "}
                {o.label}
              </option>
            ))}
        </select>
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm max-w-[280px]"
          value={currentCreneau ?? ""}
          onChange={(e) => updateParam("creneau", e.target.value)}
        >
          <option value="">Tous créneaux</option>
          {(["jeunes", "adultes_tennis", "padel"] as const)
            .filter((cat) => {
              // Cohérence avec le filtre Type : si Tennis sélectionné, on
              // cache les créneaux Padel ; si Padel sélectionné, on cache
              // les créneaux Jeunes/Adultes (qui sont tous tennis).
              if (currentType === "tennis") return cat !== "padel";
              if (currentType === "padel") return cat === "padel";
              return true;
            })
            .map((cat) => (
              <optgroup key={cat} label={categorieLabel(cat)}>
                {creneauOptionsByCategorie[cat].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={currentStatut ?? ""}
          onChange={(e) => updateParam("statut", e.target.value)}
        >
          <option value="">Tous statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {statutLabel(s)}
            </option>
          ))}
        </select>
        {(currentType || currentCours || currentCreneau || currentStatut) ? (
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams();
              next.set("tab", "ecole");
              router.push(`/admin?${next.toString()}`);
            }}
            className="text-xs text-gray-500 hover:text-navy underline"
          >
            Réinitialiser
          </button>
        ) : null}
        <NiveauFilter value={filterNiveau} onChange={setFilterNiveau} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher nom ou email…"
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm w-52"
        />
        <a
          href={`/api/admin/export/ecole?${params.toString()}`}
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
              <th className="text-left p-3">Élève</th>
              <th className="text-left p-3 w-24">Niveau</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3 w-32">Téléphone</th>
              <th className="text-left p-3">Cours & dispo</th>
              <th className="text-right p-3 w-20">Total</th>
              <th className="text-left p-3 w-40">Statut</th>
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  {rows.length === 0
                    ? "Aucune inscription pour le moment."
                    : "Aucune inscription ne correspond à ces filtres."}
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <EcoleRowGroup
                  key={r.id}
                  row={r}
                  paiements={paiementsByInscription[r.id] ?? []}
                  niveauAttribue={niveauxEleves[eleveKey(r.nom, r.prenom)] ?? null}
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
  paiements,
  niveauAttribue,
  open,
  toggle,
  patch,
  remove,
  pending,
}: {
  row: InscriptionEcoleRow;
  paiements: PaiementClient[];
  niveauAttribue: string | null;
  open: boolean;
  toggle: () => void;
  patch: (p: object) => void;
  remove: () => void;
  pending: boolean;
}) {
  const totalPaye = paiements.reduce((s, p) => s + p.montant, 0);
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
        className={`border-t cursor-pointer hover:bg-ocre/5 transition-colors ${statutRowClass(row.statut)} ${
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
            {row.code_postal_ville ? ` • ${row.code_postal_ville}` : ""}
          </div>
        </td>
        <td className="p-3 align-top">
          <NiveauEleveSelect
            eleveKey={eleveKey(row.nom, row.prenom)}
            nom={row.nom}
            prenom={row.prenom}
            dateNaissance={row.date_naissance}
            value={niveauAttribue}
            declared={row.niveau}
          />
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
          {coursTennisLabels(row.cours_tennis) ? (
            <div>
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mr-1">
                Tennis
              </span>
              {coursTennisLabels(row.cours_tennis)}
            </div>
          ) : null}
          {coursPadelLabels(row.cours_padel) ? (
            <div>
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mr-1">
                Padel
              </span>
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
          <div className="flex items-center gap-2 text-gray-400">
            <a
              href={`mailto:${row.email}?subject=${encodeURIComponent(`Inscription École ${row.prenom} ${row.nom}`)}`}
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
          <td colSpan={9} className="px-3 pb-2 pt-0">
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
        <tr className="border-t bg-ocre/5">
          <td colSpan={9} className="p-0 sticky left-0">
            <div className="p-4 w-[min(100vw,900px)]">
              <EcoleEditPanel
                row={row}
                paiements={paiements}
                patch={patch}
                pending={pending}
              />
            </div>
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
  paiements,
  patch,
  pending,
}: {
  row: InscriptionEcoleRow;
  paiements: PaiementClient[];
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
      {/* 💰 Paiements (en haut, geste le plus fréquent) */}
      <PaiementsPanel
        inscriptionType="ecole"
        inscriptionId={row.id}
        prixTotal={row.prix_total}
        initial={paiements}
      />

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
