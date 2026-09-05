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
import { horaireOptionsFor } from "@/lib/data/horaires-ecole";
import {
  formatDateTime,
  age,
  coursTennisLabels,
  coursPadelLabels,
  coursPickleballLabels,
  modeReglementLabel,
  licenceFftLabel,
  statutLabel,
  statutBadgeClass,
  statutRowClass,
} from "@/lib/admin/format";
import InlineStatusBadge from "./InlineStatusBadge";
import CoordonneesEditor from "./CoordonneesEditor";
import CreneauxEcoleEditor from "./CreneauxEcoleEditor";
import CoursEcoleEditor from "./CoursEcoleEditor";
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
  coursPickleball,
  horaires,
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
  coursPickleball: CoursEcole[];
  /** Horaires exacts saisis en admin (cle -> horaire) pour la saison active. */
  horaires: Record<string, string>;
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
  // Aperçu email « Prévenir » avant envoi (solo).
  const [preview, setPreview] = useState<{ id: string; label: string } | null>(
    null,
  );

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
    // Regroupe par (type, libellé) : deux cours homonymes (même nom, codes
    // différents en base — ex. deux « Cours Adultes ») apparaissent comme UNE
    // seule entrée. Le filtre matche alors n'importe lequel de leurs codes.
    type CoursType = "tennis" | "padel" | "pickleball";
    type Opt = {
      key: string;
      label: string;
      type: CoursType;
      order: number;
      codes: string[];
    };
    const byKey = new Map<string, Opt>();
    const add = (type: CoursType, c: CoursEcole) => {
      const k = `${type}:${c.label.trim().toLowerCase()}`;
      const existing = byKey.get(k);
      if (existing) {
        existing.codes.push(c.code);
        existing.order = Math.min(existing.order, c.order_idx);
      } else {
        byKey.set(k, {
          key: k,
          label: c.label,
          type,
          order: c.order_idx,
          codes: [c.code],
        });
      }
    };
    for (const c of coursTennis) add("tennis", c);
    for (const c of coursPadel) add("padel", c);
    for (const c of coursPickleball) add("pickleball", c);
    const rank: Record<CoursType, number> = {
      tennis: 0,
      padel: 1,
      pickleball: 2,
    };
    return Array.from(byKey.values()).sort((a, b) => {
      if (a.type !== b.type) return rank[a.type] - rank[b.type];
      return a.order - b.order;
    });
  }, [coursTennis, coursPadel, coursPickleball]);

  // Créneau : la liste COMPLÈTE proposée par le formulaire école
  // (lib/data/creneaux-ecole.ts), groupée par catégorie.
  const creneauOptionsByCategorie = useMemo(() => {
    const byCat: Record<CreneauCategorie, string[]> = {
      jeunes: [],
      adultes_tennis: [],
      padel: [],
      padel_jeunes: [],
      pickleball: [],
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
        if (
          currentType === "pickleball" &&
          !(r.cours_pickleball ?? []).length &&
          !r.licence_pickleball
        )
          return false;
      }
      // Cours précis : la clé regroupe tous les codes de même libellé.
      // On matche si l'inscription contient AU MOINS un de ces codes.
      if (currentCours) {
        const opt = coursOptions.find((o) => o.key === currentCours);
        if (opt) {
          const arr =
            opt.type === "tennis"
              ? r.cours_tennis ?? []
              : opt.type === "padel"
                ? r.cours_padel ?? []
                : r.cours_pickleball ?? [];
          if (!opt.codes.some((code) => arr.includes(code))) return false;
        }
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
    coursOptions,
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

  // ---- « Prévenir » : email de confirmation d'inscription (validation JPO) ----
  // Envoi par lots de 25 (limites SMTP + timeout). prevenu_at posé côté serveur.
  async function prevenirBatch(
    ids: string[],
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < ids.length; i += 25) {
      const chunk = ids.slice(i, i + 25);
      try {
        const res = await fetch("/api/admin/inscriptions/ecole/prevenir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: chunk }),
        });
        if (res.ok) {
          const j = await res.json();
          sent += j.sent ?? 0;
          failed += Array.isArray(j.failed) ? j.failed.length : 0;
        } else {
          failed += chunk.length;
        }
      } catch {
        failed += chunk.length;
      }
    }
    return { sent, failed };
  }

  // Inscriptions du filtre courant, non annulées / non désactivées, pas encore
  // prévenues → cible du bouton « en masse ».
  const aPrevenir = filteredRows.filter(
    (r) => !r.prevenu_at && r.statut !== "annule" && !r.desactive,
  );

  // Solo : ouvre d'abord l'aperçu de l'email ; l'envoi se fait depuis la fenêtre.
  function prevenirSolo(id: string, label: string) {
    setPreview({ id, label });
  }

  function envoyerDepuisApercu() {
    if (!preview) return;
    const id = preview.id;
    startTransition(async () => {
      const { failed } = await prevenirBatch([id]);
      if (failed) window.alert("L'email n'a pas pu être envoyé. Réessaye.");
      setPreview(null);
      router.refresh();
    });
  }

  function prevenirEnMasse() {
    if (aPrevenir.length === 0) {
      window.alert(
        "Personne à prévenir : toutes les inscriptions de ce filtre ont déjà été prévenues.",
      );
      return;
    }
    // Double confirmation : l'envoi en masse est irréversible.
    if (
      !window.confirm(
        `Envoyer l'email de confirmation à ${aPrevenir.length} inscrit(s) non encore prévenu(s) ?\n\n⚠️ Cela envoie de vrais emails aux familles.`,
      )
    ) {
      return;
    }
    if (
      !window.confirm(
        `Êtes-vous vraiment sûr ?\n\n${aPrevenir.length} email(s) vont partir MAINTENANT. Cette action ne peut pas être annulée.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const { sent, failed } = await prevenirBatch(aPrevenir.map((r) => r.id));
      window.alert(
        `✅ ${sent} email(s) de confirmation envoyé(s).` +
          (failed ? `\n⚠️ ${failed} échec(s) — réessaye pour les restants.` : ""),
      );
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
            .filter((o) => !currentType || o.type === currentType)
            .map((o) => (
              <option key={o.key} value={o.key}>
                {o.type === "tennis"
                  ? "Tennis — "
                  : o.type === "padel"
                    ? "Padel — "
                    : "Pickleball — "}
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
          {(["jeunes", "adultes_tennis", "padel", "pickleball"] as const)
            .filter((cat) => {
              // Cohérence avec le filtre Type : si Tennis sélectionné, on
              // n'affiche que les créneaux tennis ; Padel → padel ;
              // Pickleball → pickleball.
              if (currentType === "tennis")
                return cat === "jeunes" || cat === "adultes_tennis";
              if (currentType === "padel") return cat === "padel";
              if (currentType === "pickleball") return cat === "pickleball";
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
          Export Excel
        </a>
        <button
          type="button"
          onClick={prevenirEnMasse}
          disabled={pending || aPrevenir.length === 0}
          title="Envoyer l'email de confirmation d'inscription à tous les inscrits (du filtre en cours) pas encore prévenus"
          className="rounded-md bg-navy text-white px-3 py-1.5 text-xs font-semibold hover:bg-navy-dark disabled:opacity-40"
        >
          ✉️ Prévenir les non-prévenus ({aPrevenir.length})
        </button>
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
                  horaires={horaires}
                  coursTennis={coursTennis}
                  coursPadel={coursPadel}
                  coursPickleball={coursPickleball}
                  open={openId === r.id}
                  toggle={() => setOpenId(openId === r.id ? null : r.id)}
                  patch={(p) => patchInscription(r.id, p)}
                  prevenir={() =>
                    prevenirSolo(r.id, `${r.prenom} ${r.nom}`)
                  }
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

      {/* Fenêtre d'aperçu de l'email « Prévenir » avant envoi (solo) */}
      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !pending && setPreview(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h3 className="font-bold text-navy">Aperçu de l&apos;email</h3>
                <p className="text-xs text-gray-500">
                  Confirmation d&apos;inscription — {preview.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                disabled={pending}
                className="text-gray-400 hover:text-navy text-xl leading-none disabled:opacity-40"
                aria-label="Fermer"
              >
                ✕
              </button>
            </header>
            <iframe
              src={`/api/admin/inscriptions/ecole/${preview.id}/preview-prevenir`}
              title="Aperçu de l'email"
              className="w-full flex-1 min-h-[380px] bg-gray-50"
            />
            <footer className="flex items-center justify-end gap-3 border-t px-4 py-3">
              <button
                type="button"
                onClick={() => setPreview(null)}
                disabled={pending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={envoyerDepuisApercu}
                disabled={pending}
                className="rounded-lg bg-navy text-white px-5 py-2 text-sm font-bold hover:bg-navy-dark disabled:opacity-40"
              >
                {pending ? "Envoi…" : "✉️ Envoyer l'email"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EcoleRowGroup({
  row,
  paiements,
  niveauAttribue,
  horaires,
  coursTennis,
  coursPadel,
  coursPickleball,
  open,
  toggle,
  patch,
  prevenir,
  remove,
  pending,
}: {
  row: InscriptionEcoleRow;
  paiements: PaiementClient[];
  niveauAttribue: string | null;
  horaires: Record<string, string>;
  coursTennis: CoursEcole[];
  coursPadel: CoursEcole[];
  coursPickleball: CoursEcole[];
  open: boolean;
  toggle: () => void;
  patch: (p: object) => void;
  prevenir: () => void;
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

  // Options du menu déroulant « horaire exact » : dérivées des créneaux
  // choisis (dispo_*) × cours tennis de l'élève × horaires saisis en admin.
  const dispoLabels = [row.dispo_mercredi, row.dispo_samedi, row.dispo_semaine]
    .filter((x): x is string => Boolean(x && x.trim()))
    .flatMap((s) => s.split(",").map((x) => x.trim()).filter(Boolean));
  const horaireOptions = horaireOptionsFor(
    horaires,
    (row.cours_tennis ?? []) as string[],
    dispoLabels,
  );
  // Un seul horaire possible → présélectionné (sans forcer l'enregistrement).
  const effectiveHoraire =
    row.horaire_confirme ??
    (horaireOptions.length === 1 ? horaireOptions[0] : "");

  // Champ horaire = liste (propositions) + saisie libre (datalist). État local
  // resynchronisé quand la valeur en base change (après enregistrement).
  const [horaireInput, setHoraireInput] = useState(effectiveHoraire || "");
  useEffect(() => {
    setHoraireInput(effectiveHoraire || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.horaire_confirme]);

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
          {coursPickleballLabels(row.cours_pickleball) ? (
            <div>
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mr-1">
                Pickleball
              </span>
              {coursPickleballLabels(row.cours_pickleball)}
            </div>
          ) : null}
          {row.licence_pickleball ? (
            <div className="text-gray-500">+ Licence Pickleball</div>
          ) : null}
          {dispo ? (
            <div className="text-gray-500 italic mt-1">{dispo}</div>
          ) : null}
          <div className="text-[10px] text-gray-400 mt-1">
            {modeReglementLabel(row.mode_reglement)} × {row.nb_paiements} ·{" "}
            {licenceFftLabel(row.licence_fft)}
          </div>
          {row.prevenu_at ? (
            <div className="mt-1 inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
              ✅ Prévenu le{" "}
              {new Date(row.prevenu_at).toLocaleDateString("fr-FR")}
            </div>
          ) : null}
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
          {/* Prévenir : visible directement dans la ligne (sans déplier) */}
          <div className="mt-2">
            {row.prevenu_at ? (
              <span
                className="inline-block text-[10px] font-semibold text-emerald-600"
                title={`Prévenu le ${new Date(row.prevenu_at).toLocaleDateString("fr-FR")} — déplier pour renvoyer`}
              >
                ✅ Prévenu le{" "}
                {new Date(row.prevenu_at).toLocaleDateString("fr-FR")}
              </span>
            ) : (
              <button
                type="button"
                onClick={prevenir}
                disabled={pending}
                className="rounded bg-yellow-club text-navy px-2 py-1 text-[11px] font-bold hover:bg-yellow-hover disabled:opacity-40"
                title="Envoyer l'email de confirmation d'inscription"
              >
                🔔 Prévenir
              </button>
            )}
          </div>
          {/* Suivi : élève placé dans son groupe (post-JPO) */}
          <label
            className="mt-2 flex items-center gap-1.5 text-[11px] font-medium cursor-pointer select-none"
            title="Cocher une fois l'élève placé dans son groupe"
          >
            <input
              type="checkbox"
              className="accent-emerald-600"
              checked={!!row.ajoute_au_groupe}
              disabled={pending}
              onChange={() =>
                patch({ ajoute_au_groupe: !row.ajoute_au_groupe })
              }
            />
            <span
              className={
                row.ajoute_au_groupe ? "text-emerald-600" : "text-gray-500"
              }
            >
              Ajouté au groupe
            </span>
          </label>
          {/* Horaire exact : propositions (liste) OU saisie libre (datalist).
              Indispensable pour le Centre d'Entraînement dont les combinaisons
              sont propres à chaque élève. */}
          {horaireOptions.length > 0 ? (
            <>
              <input
                list={`hor-${row.id}`}
                value={horaireInput}
                disabled={pending}
                onChange={(e) => setHoraireInput(e.target.value)}
                onBlur={() => {
                  const v = horaireInput.trim();
                  if (v !== (row.horaire_confirme ?? "")) {
                    patch({ horaire_confirme: v || null });
                  }
                }}
                placeholder="Horaire exact…"
                title="Choisir un horaire proposé ou saisir l'horaire précis"
                className={`mt-2 w-full max-w-[200px] rounded border px-1.5 py-1 text-[11px] ${
                  horaireInput
                    ? "border-navy bg-navy/5 text-navy font-semibold"
                    : "border-gray-300 text-gray-600"
                }`}
              />
              <datalist id={`hor-${row.id}`}>
                {horaireOptions.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </>
          ) : null}
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
                prevenir={prevenir}
                coursTennis={coursTennis}
                coursPadel={coursPadel}
                coursPickleball={coursPickleball}
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
  prevenir,
  coursTennis,
  coursPadel,
  coursPickleball,
  pending,
}: {
  row: InscriptionEcoleRow;
  paiements: PaiementClient[];
  patch: (p: object) => void;
  prevenir: () => void;
  coursTennis: CoursEcole[];
  coursPadel: CoursEcole[];
  coursPickleball: CoursEcole[];
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
      {/* ✉️ Prévenir de l'inscription (email de confirmation) */}
      {row.prevenu_at ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <span className="text-sm font-semibold text-emerald-700">
            ✅ Inscription confirmée — prévenu le{" "}
            {new Date(row.prevenu_at).toLocaleDateString("fr-FR")}
          </span>
          <button
            type="button"
            onClick={prevenir}
            disabled={pending}
            className="rounded border border-emerald-300 bg-white text-emerald-700 px-2.5 py-1 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-40"
          >
            Renvoyer l&apos;email
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={prevenir}
          disabled={pending}
          className="w-full rounded-lg bg-yellow-club text-navy px-4 py-2.5 text-sm font-bold hover:bg-yellow-hover disabled:opacity-40"
        >
          ✉️ Prévenir de l&apos;inscription (envoyer la confirmation par email)
        </button>
      )}

      {/* 💰 Paiements (en haut, geste le plus fréquent) */}
      <PaiementsPanel
        inscriptionType="ecole"
        inscriptionId={row.id}
        prixTotal={row.prix_total}
        initial={paiements}
      />

      {/* Coordonnées éditables (corrections admin) */}
      <CoordonneesEditor
        row={row}
        patch={patch}
        pending={pending}
        withCodePostal
      />

      {/* Cours éditables (correction : mauvais cours choisi) */}
      <CoursEcoleEditor
        row={row}
        coursTennis={coursTennis}
        coursPadel={coursPadel}
        coursPickleball={coursPickleball}
        patch={patch}
        pending={pending}
      />

      {/* Créneaux / disponibilités éditables */}
      <CreneauxEcoleEditor row={row} patch={patch} pending={pending} />

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
