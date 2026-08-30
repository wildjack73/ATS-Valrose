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
import CoordonneesEditor from "./CoordonneesEditor";
import CreneauStageEditor from "./CreneauStageEditor";
import {
  PaiementsPanel,
  PaiementBadge,
  type PaiementClient,
} from "./PaiementsPanel";
import { IconMail, IconPhone, IconTrash, IconPause, IconPlay } from "./Icons";
import { NiveauEleveSelect, NiveauFilter, matchesNiveau } from "./NiveauUI";
import { eleveKey } from "@/lib/data/niveaux";

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
  niveauxEleves,
  currentSemaine,
  currentStatut,
  currentFormule,
}: {
  rows: InscriptionStageRow[];
  semaines: Semaine[];
  optionsF4: OptionF4[];
  paiementsByInscription: Record<string, PaiementClient[]>;
  niveauxEleves: Record<string, string>;
  currentSemaine?: string;
  currentStatut?: string;
  currentFormule?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterNiveau, setFilterNiveau] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "age_asc" | "age_desc">("date");

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (q) {
        const hay = `${r.prenom} ${r.nom} ${r.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterNiveau) {
        const lvl = niveauxEleves[eleveKey(r.nom, r.prenom)] ?? null;
        if (!matchesNiveau(lvl, filterNiveau)) return false;
      }
      return true;
    });
    // Tri par âge (client). « date » = ordre serveur (plus récent d'abord).
    // Les inscriptions sans date de naissance valide vont toujours en bas.
    if (sortBy !== "date") {
      out.sort((a, b) => {
        const aa = age(a.date_naissance);
        const bb = age(b.date_naissance);
        if (aa == null && bb == null) return 0;
        if (aa == null) return 1;
        if (bb == null) return -1;
        return sortBy === "age_asc" ? aa - bb : bb - aa;
      });
    }
    return out;
  }, [rows, search, filterNiveau, niveauxEleves, sortBy]);

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

  // ---- « Prévenir » : email de confirmation d'inscription stage ----
  async function prevenirBatch(
    ids: string[],
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < ids.length; i += 25) {
      const chunk = ids.slice(i, i + 25);
      try {
        const res = await fetch("/api/admin/inscriptions/stages/prevenir", {
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

  const aPrevenir = filteredRows.filter(
    (r) => !r.prevenu_at && r.statut !== "annule" && !r.desactive,
  );

  function prevenirSolo(id: string, label: string) {
    if (
      !window.confirm(
        `Envoyer l'email de confirmation d'inscription à ${label} ?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const { failed } = await prevenirBatch([id]);
      if (failed) window.alert("L'email n'a pas pu être envoyé. Réessaye.");
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
        <NiveauFilter value={filterNiveau} onChange={setFilterNiveau} />
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          title="Trier la liste"
        >
          <option value="date">Tri : Date d&apos;inscription</option>
          <option value="age_asc">Tri : Âge croissant (plus jeune)</option>
          <option value="age_desc">Tri : Âge décroissant (plus âgé)</option>
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher nom ou email…"
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm w-52"
        />
        <a
          href={`/api/admin/export/stages?${params.toString()}`}
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
              <th className="text-left p-3">Enfant</th>
              <th className="text-left p-3 w-24">Niveau</th>
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
                <td colSpan={9} className="p-8 text-center text-gray-500">
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
                  semaines={semaines}
                  optionsF4={optionsF4}
                  paiements={paiementsByInscription[r.id] ?? []}
                  niveauAttribue={niveauxEleves[eleveKey(r.nom, r.prenom)] ?? null}
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
    </div>
  );
}

// -- Composant ligne (en deux <tr> : la ligne + le panneau d'édition) -------

function RowGroup({
  row,
  semaines,
  optionsF4,
  paiements,
  niveauAttribue,
  open,
  toggle,
  patch,
  prevenir,
  remove,
  pending,
}: {
  row: InscriptionStageRow;
  semaines: Semaine[];
  optionsF4: OptionF4[];
  paiements: PaiementClient[];
  niveauAttribue: string | null;
  open: boolean;
  toggle: () => void;
  patch: (p: object) => void;
  prevenir: () => void;
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
        <tr className="border-t bg-navy/5">
          <td colSpan={9} className="p-0 sticky left-0">
            <div className="p-4 w-[min(100vw,900px)]">
              <EditPanel
                row={row}
                semaines={semaines}
                optionsF4={optionsF4}
                paiements={paiements}
                patch={patch}
                prevenir={prevenir}
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
  semaines,
  optionsF4,
  paiements,
  patch,
  prevenir,
  pending,
}: {
  row: InscriptionStageRow;
  semaines: Semaine[];
  optionsF4: OptionF4[];
  paiements: PaiementClient[];
  patch: (p: object) => void;
  prevenir: () => void;
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

      {/* 💰 Paiements (en haut, c'est le geste le plus fréquent) */}
      <PaiementsPanel
        inscriptionType="stages"
        inscriptionId={row.id}
        prixTotal={row.prix_total}
        initial={paiements}
      />

      {/* Coordonnées éditables (corrections admin) */}
      <CoordonneesEditor row={row} patch={patch} pending={pending} />

      {/* Semaine & créneau (matin/après-midi) éditables */}
      <CreneauStageEditor
        row={row}
        semaines={semaines}
        patch={patch}
        pending={pending}
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
