"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  TarifsBundle,
  Formule,
  OptionF4,
  Semaine,
  CoursEcole,
  LicenceFftRow,
  TarifAutre,
  Saison,
} from "@/lib/data/tarifs-types";

type Resource =
  | "formules"
  | "options-f4"
  | "semaines"
  | "cours-ecole"
  | "licence-fft"
  | "autres";

async function apiPatch(resource: Resource, id: string, body: object) {
  const res = await fetch(`/api/admin/tarifs/${resource}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? "Échec mise à jour");
  }
}

async function apiPost(resource: Resource, body: object) {
  const res = await fetch(`/api/admin/tarifs/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? "Échec création");
  }
}

async function apiDelete(resource: Resource, id: string) {
  const res = await fetch(`/api/admin/tarifs/${resource}/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? "Échec suppression");
  }
}

type Domaine = "stages" | "ecole";

export default function TarifsEditor({
  bundle,
  saisonsStages,
  saisonsEcole,
}: {
  bundle: TarifsBundle;
  saisonsStages: Saison[];
  saisonsEcole: Saison[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creatingFor, setCreatingFor] = useState<Domaine | null>(null);

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

  async function setActive(saisonId: string) {
    await withError(async () => {
      const res = await fetch(`/api/admin/saisons/${saisonId}/activate`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Échec activation");
      }
    });
  }

  async function createSaison(
    domaine: Domaine,
    code: string,
    label: string,
    cloneFrom?: string,
  ) {
    await withError(async () => {
      const res = await fetch(`/api/admin/saisons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, label, domaine, cloneFrom }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Échec création");
      }
      // Naviguer vers la nouvelle saison du bon domaine
      const param = domaine === "stages" ? "saisonStages" : "saisonEcole";
      router.push(`/admin?tab=tarifs&${param}=${encodeURIComponent(code)}`);
    });
  }

  function switchSaison(domaine: Domaine, code: string) {
    const param = domaine === "stages" ? "saisonStages" : "saisonEcole";
    // Conserver l'autre param si présent
    const other =
      domaine === "stages"
        ? `saisonEcole=${encodeURIComponent(bundle.saisonEcole.code)}`
        : `saisonStages=${encodeURIComponent(bundle.saisonStages.code)}`;
    router.push(`/admin?tab=tarifs&${param}=${encodeURIComponent(code)}&${other}`);
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          ⚠ {error}
        </div>
      ) : null}

      {/* Sélecteurs : une saison stages + une saison école, indépendantes */}
      <div className="grid sm:grid-cols-2 gap-3">
        <SaisonSwitcher
          domaine="stages"
          accent="cyan"
          icon="🎾"
          current={bundle.saisonStages}
          all={saisonsStages}
          pending={pending}
          onSwitch={(code) => switchSaison("stages", code)}
          onSetActive={() => setActive(bundle.saisonStages.id)}
          onCreate={() => setCreatingFor("stages")}
        />
        <SaisonSwitcher
          domaine="ecole"
          accent="ocre"
          icon="🏫"
          current={bundle.saisonEcole}
          all={saisonsEcole}
          pending={pending}
          onSwitch={(code) => switchSaison("ecole", code)}
          onSetActive={() => setActive(bundle.saisonEcole.id)}
          onCreate={() => setCreatingFor("ecole")}
        />
      </div>

      {creatingFor ? (
        <CreateSaisonForm
          domaine={creatingFor}
          existingSaisons={
            creatingFor === "stages" ? saisonsStages : saisonsEcole
          }
          onCancel={() => setCreatingFor(null)}
          onCreate={async (code, label, cloneFrom) => {
            await createSaison(creatingFor, code, label, cloneFrom);
            setCreatingFor(null);
          }}
        />
      ) : null}

      <Section title={`🎾 Stages — Formules (saison ${bundle.saisonStages.label})`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-gray-500 border-b">
              <th className="text-left py-2 pr-2">Code</th>
              <th className="text-left py-2 pr-2">Titre</th>
              <th className="text-left py-2 pr-2">Sous-titre</th>
              <th className="text-right py-2 pr-2">Prix</th>
              <th className="text-right py-2 pr-2">Déjeuner</th>
              <th className="text-right py-2 pr-2 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {bundle.formules.map((f) => (
              <FormuleRow
                key={f.id}
                row={f}
                disabled={pending}
                onSave={(patch) =>
                  withError(() => apiPatch("formules", f.id, patch))
                }
              />
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="🎾 Stages — Formule 4 (à la carte)">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-gray-500 border-b">
              <th className="text-left py-2 pr-2">Code</th>
              <th className="text-left py-2 pr-2">Label</th>
              <th className="text-left py-2 pr-2">Détail</th>
              <th className="text-right py-2 pr-2">Prix</th>
              <th className="text-right py-2 pr-2 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {bundle.optionsF4.map((o) => (
              <OptionF4Row
                key={o.id}
                row={o}
                disabled={pending}
                onSave={(patch) =>
                  withError(() => apiPatch("options-f4", o.id, patch))
                }
              />
            ))}
          </tbody>
        </table>
      </Section>

      <Section
        title="📅 Semaines de stages (vacances scolaires)"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <ImportVacancesButton
              saisonId={bundle.saisonStages.id}
              saisonCode={bundle.saisonStages.code}
              onImport={async (replaceExisting) => {
                await withError(async () => {
                  const res = await fetch(
                    "/api/admin/semaines/import",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        saisonId: bundle.saisonStages.id,
                        location: "Nice",
                        anneeScolaire: bundle.saisonStages.code,
                        replaceExisting,
                      }),
                    },
                  );
                  if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j.error ?? "Échec import");
                  }
                });
              }}
            />
            <AddSemaineButton
              saisonId={bundle.saisonStages.id}
              onAdd={(data) => withError(() => apiPost("semaines", data))}
            />
          </div>
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-gray-500 border-b">
              <th className="text-left py-2 pr-2">Code</th>
              <th className="text-left py-2 pr-2">Période</th>
              <th className="text-left py-2 pr-2">Dates</th>
              <th className="text-left py-2 pr-2">Début</th>
              <th className="text-center py-2 pr-2">Ouverte</th>
              <th className="text-center py-2 pr-2">Déjeuner</th>
              <th className="text-right py-2 pr-2 w-40"></th>
            </tr>
          </thead>
          <tbody>
            {bundle.semaines.map((s) => (
              <SemaineRow
                key={s.id}
                row={s}
                disabled={pending}
                onSave={(patch) =>
                  withError(() => apiPatch("semaines", s.id, patch))
                }
                onDelete={() =>
                  withError(() => apiDelete("semaines", s.id))
                }
              />
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="🏫 Cours École Tennis">
        <CoursTable
          rows={bundle.coursTennis}
          disabled={pending}
          onSave={(id, patch) =>
            withError(() => apiPatch("cours-ecole", id, patch))
          }
        />
      </Section>

      <Section title="🏫 Cours École Padel">
        <CoursTable
          rows={bundle.coursPadel}
          disabled={pending}
          onSave={(id, patch) =>
            withError(() => apiPatch("cours-ecole", id, patch))
          }
        />
      </Section>

      <Section title="📋 Licence FFT">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-gray-500 border-b">
              <th className="text-left py-2 pr-2">Code</th>
              <th className="text-left py-2 pr-2">Label</th>
              <th className="text-right py-2 pr-2">Prix</th>
              <th className="text-right py-2 pr-2 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {bundle.licenceFft.map((l) => (
              <LicenceRow
                key={l.id}
                row={l}
                disabled={pending}
                onSave={(patch) =>
                  withError(() => apiPatch("licence-fft", l.id, patch))
                }
              />
            ))}
          </tbody>
        </table>
      </Section>

      {(["lecons", "locations", "materiel"] as const).map((cat) => (
        <Section
          key={cat}
          title={
            cat === "lecons"
              ? "👤 Leçons individuelles"
              : cat === "locations"
                ? "🎾 Location de courts"
                : "🛍️ Matériel"
          }
          action={
            <AddAutreButton
              saisonId={bundle.saisonEcole.id}
              category={cat}
              onAdd={(data) => withError(() => apiPost("autres", data))}
            />
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-gray-500 border-b">
                <th className="text-left py-2 pr-2">Label</th>
                <th className="text-right py-2 pr-2">Tarif</th>
                <th className="text-left py-2 pr-2">Détail</th>
                <th className="text-right py-2 pr-2 w-40"></th>
              </tr>
            </thead>
            <tbody>
              {bundle.autres
                .filter((a) => a.category === cat)
                .map((a) => (
                  <AutreRow
                    key={a.id}
                    row={a}
                    disabled={pending}
                    onSave={(patch) =>
                      withError(() => apiPatch("autres", a.id, patch))
                    }
                    onDelete={() =>
                      withError(() => apiDelete("autres", a.id))
                    }
                  />
                ))}
            </tbody>
          </table>
        </Section>
      ))}
    </div>
  );
}

// ----- Components -----

function SaisonSwitcher({
  domaine,
  accent,
  icon,
  current,
  all,
  pending,
  onSwitch,
  onSetActive,
  onCreate,
}: {
  domaine: Domaine;
  accent: "cyan" | "ocre";
  icon: string;
  current: Saison;
  all: Saison[];
  pending: boolean;
  onSwitch: (code: string) => void;
  onSetActive: () => void;
  onCreate: () => void;
}) {
  const bg = accent === "cyan" ? "bg-cyan-club" : "bg-ocre";
  const label =
    domaine === "stages"
      ? "Saison stages (formules, semaines, options F4)"
      : "Saison école (cours, licence FFT, leçons, locations)";
  return (
    <div className={`rounded-xl ${bg} text-white p-4 flex flex-col gap-3`}>
      <div className="text-[10px] uppercase tracking-widest font-bold text-white/85">
        {icon} {label}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={current.code}
          onChange={(e) => onSwitch(e.target.value)}
          disabled={pending}
          className="rounded bg-white text-navy px-3 py-1.5 text-sm font-semibold"
        >
          {all.map((s) => (
            <option key={s.id} value={s.code}>
              {s.label} {s.active ? "(active)" : ""}
            </option>
          ))}
        </select>
        {current.active ? (
          <span className="rounded-full bg-green-500 text-white px-2.5 py-0.5 text-[11px] font-bold">
            ✓ active
          </span>
        ) : (
          <button
            onClick={onSetActive}
            disabled={pending}
            className="rounded bg-yellow-club text-navy px-3 py-1.5 text-xs font-bold hover:bg-yellow-hover disabled:opacity-50"
          >
            Activer
          </button>
        )}
        <button
          onClick={onCreate}
          disabled={pending}
          className="ml-auto rounded bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 text-xs font-bold border border-white/25"
        >
          + Nouvelle saison
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <header className="bg-navy text-white px-5 py-3 flex items-center justify-between gap-4">
        <h3 className="font-bold text-base">{title}</h3>
        {action}
      </header>
      <div className="p-5 overflow-x-auto">{children}</div>
    </section>
  );
}

const inputCls =
  "rounded border border-gray-300 px-2 py-1 text-sm w-full focus:border-cyan-club focus:ring-1 focus:ring-cyan-club/30 outline-none";

function FormuleRow({
  row,
  disabled,
  onSave,
}: {
  row: Formule;
  disabled: boolean;
  onSave: (patch: object) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [titre, setTitre] = useState(row.titre);
  const [sous, setSous] = useState(row.sous_titre ?? "");
  const [prix, setPrix] = useState(row.prix?.toString() ?? "");
  const [dej, setDej] = useState(row.prix_dejeuner.toString());
  const [dejJour, setDejJour] = useState(row.prix_dejeuner_jour?.toString() ?? "0");

  async function save() {
    await onSave({
      titre,
      sous_titre: sous || null,
      prix: prix === "" ? null : parseInt(prix, 10),
      prix_dejeuner: parseInt(dej, 10) || 0,
      prix_dejeuner_jour: parseInt(dejJour, 10) || 0,
    });
    setEditing(false);
  }

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-2 font-mono text-xs text-gray-500">{row.code}</td>
      {editing ? (
        <>
          <td className="py-2 pr-2">
            <input className={inputCls} value={titre} onChange={(e) => setTitre(e.target.value)} />
          </td>
          <td className="py-2 pr-2">
            <input className={inputCls} value={sous} onChange={(e) => setSous(e.target.value)} />
          </td>
          <td className="py-2 pr-2">
            <input
              type="number"
              className={`${inputCls} text-right`}
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              placeholder="vide = à la carte"
            />
          </td>
          <td className="py-2 pr-2">
            {row.has_dejeuner_option ? (
              <div className="space-y-1">
                <input
                  type="number"
                  className={`${inputCls} text-right`}
                  value={dej}
                  onChange={(e) => setDej(e.target.value)}
                  placeholder="35"
                  title="Forfait semaine"
                />
                <input
                  type="number"
                  className={`${inputCls} text-right`}
                  value={dejJour}
                  onChange={(e) => setDejJour(e.target.value)}
                  placeholder="8"
                  title="Par jour"
                />
              </div>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </td>
          <td className="py-2 pr-2 text-right">
            <RowButtons
              disabled={disabled}
              onSave={save}
              onCancel={() => setEditing(false)}
            />
          </td>
        </>
      ) : (
        <>
          <td className="py-2 pr-2">{row.titre}</td>
          <td className="py-2 pr-2 text-gray-600">{row.sous_titre}</td>
          <td className="py-2 pr-2 text-right font-bold text-navy">
            {row.prix !== null ? `${row.prix}€` : "—"}
          </td>
          <td className="py-2 pr-2 text-right text-xs">
            {row.has_dejeuner_option ? (
              <>
                <div>Semaine : {row.prix_dejeuner}€</div>
                <div className="text-gray-500">Jour : {row.prix_dejeuner_jour}€</div>
              </>
            ) : (
              "—"
            )}
          </td>
          <td className="py-2 pr-2 text-right">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-navy hover:text-yellow-hover underline"
              disabled={disabled}
            >
              Modifier
            </button>
          </td>
        </>
      )}
    </tr>
  );
}

function OptionF4Row({
  row,
  disabled,
  onSave,
}: {
  row: OptionF4;
  disabled: boolean;
  onSave: (patch: object) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(row.label);
  const [detail, setDetail] = useState(row.detail ?? "");
  const [prix, setPrix] = useState(row.prix.toString());

  async function save() {
    await onSave({
      label,
      detail: detail || null,
      prix: parseInt(prix, 10) || 0,
    });
    setEditing(false);
  }

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-2 font-mono text-xs text-gray-500">{row.code}</td>
      {editing ? (
        <>
          <td className="py-2 pr-2">
            <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} />
          </td>
          <td className="py-2 pr-2">
            <input className={inputCls} value={detail} onChange={(e) => setDetail(e.target.value)} />
          </td>
          <td className="py-2 pr-2">
            <input
              type="number"
              className={`${inputCls} text-right`}
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
            />
          </td>
          <td className="py-2 pr-2 text-right">
            <RowButtons disabled={disabled} onSave={save} onCancel={() => setEditing(false)} />
          </td>
        </>
      ) : (
        <>
          <td className="py-2 pr-2">{row.label}</td>
          <td className="py-2 pr-2 text-gray-600">{row.detail}</td>
          <td className="py-2 pr-2 text-right font-bold text-navy">{row.prix}€</td>
          <td className="py-2 pr-2 text-right">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-navy hover:text-yellow-hover underline"
              disabled={disabled}
            >
              Modifier
            </button>
          </td>
        </>
      )}
    </tr>
  );
}

function SemaineRow({
  row,
  disabled,
  onSave,
  onDelete,
}: {
  row: Semaine;
  disabled: boolean;
  onSave: (patch: object) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [periode, setPeriode] = useState(row.periode);
  const [label, setLabel] = useState(row.label);
  const [date, setDate] = useState(row.date_debut ?? "");
  const [ouverte, setOuverte] = useState(row.ouverte);
  const [dejDispo, setDejDispo] = useState(row.dejeuner_disponible !== false);

  async function save() {
    await onSave({
      periode,
      label,
      date_debut: date || null,
      ouverte,
      dejeuner_disponible: dejDispo,
    });
    setEditing(false);
  }

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-2 font-mono text-xs text-gray-500">{row.code}</td>
      {editing ? (
        <>
          <td className="py-2 pr-2">
            <input className={inputCls} value={periode} onChange={(e) => setPeriode(e.target.value)} />
          </td>
          <td className="py-2 pr-2">
            <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} />
          </td>
          <td className="py-2 pr-2">
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </td>
          <td className="py-2 pr-2 text-center">
            <input
              type="checkbox"
              checked={ouverte}
              onChange={(e) => setOuverte(e.target.checked)}
            />
          </td>
          <td className="py-2 pr-2 text-center">
            <input
              type="checkbox"
              checked={dejDispo}
              onChange={(e) => setDejDispo(e.target.checked)}
            />
          </td>
          <td className="py-2 pr-2 text-right">
            <RowButtons disabled={disabled} onSave={save} onCancel={() => setEditing(false)} />
          </td>
        </>
      ) : (
        <>
          <td className="py-2 pr-2">{row.periode}</td>
          <td className="py-2 pr-2">{row.label}</td>
          <td className="py-2 pr-2 text-gray-600 text-xs">{row.date_debut ?? "—"}</td>
          <td className="py-2 pr-2 text-center">
            <input
              type="checkbox"
              className="accent-navy w-4 h-4 cursor-pointer"
              checked={row.ouverte}
              disabled={disabled}
              onChange={(e) => onSave({ ouverte: e.target.checked })}
              title="Cliquer pour activer/désactiver l'inscription à cette semaine"
            />
          </td>
          <td className="py-2 pr-2 text-center">
            <input
              type="checkbox"
              className="accent-navy w-4 h-4 cursor-pointer"
              checked={row.dejeuner_disponible !== false}
              disabled={disabled}
              onChange={(e) =>
                onSave({ dejeuner_disponible: e.target.checked })
              }
              title="Cliquer pour proposer/retirer l'option déjeuner"
            />
          </td>
          <td className="py-2 pr-2 text-right space-x-2 whitespace-nowrap">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-navy hover:text-yellow-hover underline"
              disabled={disabled}
            >
              Modifier
            </button>
            <button
              onClick={() => {
                if (confirm(`Supprimer la semaine "${row.label}" ?`)) onDelete();
              }}
              className="text-xs text-red-600 hover:underline"
              disabled={disabled}
            >
              Supprimer
            </button>
          </td>
        </>
      )}
    </tr>
  );
}

function CoursTable({
  rows,
  disabled,
  onSave,
}: {
  rows: CoursEcole[];
  disabled: boolean;
  onSave: (id: string, patch: object) => Promise<void>;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs uppercase text-gray-500 border-b">
          <th className="text-left py-2 pr-2">Code</th>
          <th className="text-left py-2 pr-2">Label</th>
          <th className="text-left py-2 pr-2">Description</th>
          <th className="text-right py-2 pr-2">Prix annuel</th>
          <th className="text-right py-2 pr-2 w-32"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <CoursRow
            key={c.id}
            row={c}
            disabled={disabled}
            onSave={(patch) => onSave(c.id, patch)}
          />
        ))}
      </tbody>
    </table>
  );
}

function CoursRow({
  row,
  disabled,
  onSave,
}: {
  row: CoursEcole;
  disabled: boolean;
  onSave: (patch: object) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(row.label);
  const [description, setDescription] = useState(row.description ?? "");
  const [prix, setPrix] = useState(row.prix.toString());

  async function save() {
    await onSave({
      label,
      description: description || null,
      prix: parseInt(prix, 10) || 0,
    });
    setEditing(false);
  }

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-2 font-mono text-xs text-gray-500">{row.code}</td>
      {editing ? (
        <>
          <td className="py-2 pr-2">
            <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} />
          </td>
          <td className="py-2 pr-2">
            <input
              className={inputCls}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: À partir de 3 ans · 1h/semaine"
            />
          </td>
          <td className="py-2 pr-2">
            <input
              type="number"
              className={`${inputCls} text-right`}
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
            />
          </td>
          <td className="py-2 pr-2 text-right">
            <RowButtons disabled={disabled} onSave={save} onCancel={() => setEditing(false)} />
          </td>
        </>
      ) : (
        <>
          <td className="py-2 pr-2">{row.label}</td>
          <td className="py-2 pr-2 text-xs text-gray-600">
            {row.description ?? <span className="text-gray-400 italic">—</span>}
          </td>
          <td className="py-2 pr-2 text-right font-bold text-navy">{row.prix}€</td>
          <td className="py-2 pr-2 text-right">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-navy hover:text-yellow-hover underline"
              disabled={disabled}
            >
              Modifier
            </button>
          </td>
        </>
      )}
    </tr>
  );
}

function LicenceRow({
  row,
  disabled,
  onSave,
}: {
  row: LicenceFftRow;
  disabled: boolean;
  onSave: (patch: object) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(row.label);
  const [prix, setPrix] = useState(row.prix.toString());

  async function save() {
    await onSave({ label, prix: parseInt(prix, 10) || 0 });
    setEditing(false);
  }

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-2 font-mono text-xs text-gray-500">{row.code}</td>
      {editing ? (
        <>
          <td className="py-2 pr-2">
            <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} />
          </td>
          <td className="py-2 pr-2">
            <input
              type="number"
              className={`${inputCls} text-right`}
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
            />
          </td>
          <td className="py-2 pr-2 text-right">
            <RowButtons disabled={disabled} onSave={save} onCancel={() => setEditing(false)} />
          </td>
        </>
      ) : (
        <>
          <td className="py-2 pr-2">{row.label}</td>
          <td className="py-2 pr-2 text-right font-bold text-navy">{row.prix}€</td>
          <td className="py-2 pr-2 text-right">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-navy hover:text-yellow-hover underline"
              disabled={disabled}
            >
              Modifier
            </button>
          </td>
        </>
      )}
    </tr>
  );
}

function AutreRow({
  row,
  disabled,
  onSave,
  onDelete,
}: {
  row: TarifAutre;
  disabled: boolean;
  onSave: (patch: object) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(row.label);
  const [prix, setPrix] = useState(row.prix);
  const [detail, setDetail] = useState(row.detail ?? "");

  async function save() {
    await onSave({ label, prix, detail: detail || null });
    setEditing(false);
  }

  return (
    <tr className="border-b last:border-0">
      {editing ? (
        <>
          <td className="py-2 pr-2">
            <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} />
          </td>
          <td className="py-2 pr-2">
            <input className={inputCls} value={prix} onChange={(e) => setPrix(e.target.value)} />
          </td>
          <td className="py-2 pr-2">
            <input className={inputCls} value={detail} onChange={(e) => setDetail(e.target.value)} />
          </td>
          <td className="py-2 pr-2 text-right">
            <RowButtons disabled={disabled} onSave={save} onCancel={() => setEditing(false)} />
          </td>
        </>
      ) : (
        <>
          <td className="py-2 pr-2">{row.label}</td>
          <td className="py-2 pr-2 text-right font-bold text-navy whitespace-nowrap">
            {row.prix}
          </td>
          <td className="py-2 pr-2 text-gray-600">{row.detail}</td>
          <td className="py-2 pr-2 text-right space-x-2 whitespace-nowrap">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-navy hover:text-yellow-hover underline"
              disabled={disabled}
            >
              Modifier
            </button>
            <button
              onClick={() => {
                if (confirm(`Supprimer "${row.label}" ?`)) onDelete();
              }}
              className="text-xs text-red-600 hover:underline"
              disabled={disabled}
            >
              Supprimer
            </button>
          </td>
        </>
      )}
    </tr>
  );
}

function RowButtons({
  disabled,
  onSave,
  onCancel,
}: {
  disabled: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <span className="space-x-2 whitespace-nowrap">
      <button
        onClick={onSave}
        disabled={disabled}
        className="text-xs bg-navy text-white px-2 py-1 rounded hover:bg-navy-dark"
      >
        Enregistrer
      </button>
      <button
        onClick={onCancel}
        disabled={disabled}
        className="text-xs text-gray-600 hover:text-gray-900"
      >
        Annuler
      </button>
    </span>
  );
}

function AddSemaineButton({
  saisonId,
  onAdd,
}: {
  saisonId: string;
  onAdd: (data: object) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [periode, setPeriode] = useState("");
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");

  async function submit() {
    if (!code || !periode || !label) return;
    await onAdd({
      saison_id: saisonId,
      code,
      periode,
      label,
      date_debut: date || null,
      ouverte: true,
      order_idx: 0,
    });
    setOpen(false);
    setCode("");
    setPeriode("");
    setLabel("");
    setDate("");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-yellow-club text-navy text-xs font-bold px-3 py-1.5 rounded hover:bg-yellow-hover"
      >
        + Ajouter une semaine
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        className={`${inputCls} w-32`}
        placeholder="code (ex: ete_juillet_1)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <input
        className={`${inputCls} w-48`}
        placeholder="Période"
        value={periode}
        onChange={(e) => setPeriode(e.target.value)}
      />
      <input
        className={`${inputCls} w-48`}
        placeholder="Dates (ex: Du 29/06 au 03/07)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <input
        type="date"
        className={`${inputCls} w-36`}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <button
        onClick={submit}
        className="text-xs bg-navy text-white px-2 py-1 rounded"
      >
        Ajouter
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-xs text-white/80 hover:text-white"
      >
        Annuler
      </button>
    </div>
  );
}

function ImportVacancesButton({
  saisonId,
  saisonCode,
  onImport,
}: {
  saisonId: string;
  saisonCode: string;
  onImport: (replaceExisting: boolean) => Promise<void>;
}) {
  void saisonId;
  const [submitting, setSubmitting] = useState(false);

  async function handle(replaceExisting: boolean) {
    const msg = replaceExisting
      ? `Importer les vacances officielles de Nice pour ${saisonCode} ?\n\n⚠ Cela SUPPRIMERA toutes les semaines actuelles de cette saison.`
      : `Importer les vacances officielles de Nice pour ${saisonCode} ?\n\nLes semaines existantes ne seront pas supprimées (mais celles ayant le même code seront mises à jour).`;
    if (!confirm(msg)) return;
    setSubmitting(true);
    try {
      await onImport(replaceExisting);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handle(false)}
        disabled={submitting}
        title="Récupère les vacances scolaires Zone B Nice depuis data.education.gouv.fr"
        className="bg-cyan-club text-navy text-xs font-bold px-3 py-1.5 rounded hover:bg-cyan-light disabled:opacity-50"
      >
        🌐 {submitting ? "…" : "Importer vacances Nice"}
      </button>
      <button
        onClick={() => handle(true)}
        disabled={submitting}
        title="Supprime toutes les semaines actuelles avant d'importer"
        className="bg-white/10 hover:bg-white/20 text-white text-xs px-2 py-1.5 rounded border border-white/20"
      >
        (remplacer tout)
      </button>
    </div>
  );
}

function CreateSaisonForm({
  domaine,
  existingSaisons,
  onCreate,
  onCancel,
}: {
  domaine: Domaine;
  existingSaisons: Saison[];
  onCreate: (code: string, label: string, cloneFrom?: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [cloneFrom, setCloneFrom] = useState(existingSaisons[0]?.code ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!code) return;
    setSubmitting(true);
    try {
      await onCreate(code, label || `Saison ${code}`, cloneFrom || undefined);
    } finally {
      setSubmitting(false);
    }
  }

  const domainLabel = domaine === "stages" ? "🎾 Stages" : "🏫 École";
  return (
    <div className="rounded-xl bg-white border-2 border-yellow-club shadow-sm p-5">
      <h3 className="font-bold text-navy mb-3">
        Créer une nouvelle saison {domainLabel}
      </h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Code</span>
          <input
            className={inputCls}
            placeholder="ex: 2027-2028"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Libellé (optionnel)</span>
          <input
            className={inputCls}
            placeholder={`Saison ${code || "2027-2028"}`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-gray-600">
            Copier les tarifs depuis (optionnel)
          </span>
          <select
            className={inputCls}
            value={cloneFrom}
            onChange={(e) => setCloneFrom(e.target.value)}
          >
            <option value="">Saison vide (configurer manuellement)</option>
            {existingSaisons.map((s) => (
              <option key={s.id} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Si tu copies depuis une saison existante, pense à <strong>mettre à jour
        les dates des semaines</strong> pour le nouveau calendrier scolaire.
      </p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={submit}
          disabled={submitting || !code}
          className="rounded bg-navy text-white px-4 py-2 text-sm font-bold hover:bg-navy-dark disabled:opacity-50"
        >
          {submitting ? "Création…" : "Créer la saison"}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="rounded text-gray-600 hover:text-gray-900 px-4 py-2 text-sm"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function AddAutreButton({
  saisonId,
  category,
  onAdd,
}: {
  saisonId: string;
  category: "lecons" | "locations" | "materiel";
  onAdd: (data: object) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [prix, setPrix] = useState("");
  const [detail, setDetail] = useState("");

  async function submit() {
    if (!label || !prix) return;
    await onAdd({
      saison_id: saisonId,
      category,
      label,
      prix,
      detail: detail || null,
      order_idx: 0,
    });
    setOpen(false);
    setLabel("");
    setPrix("");
    setDetail("");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-yellow-club text-navy text-xs font-bold px-3 py-1.5 rounded hover:bg-yellow-hover"
      >
        + Ajouter
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        className={`${inputCls} w-48`}
        placeholder="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <input
        className={`${inputCls} w-32`}
        placeholder="Tarif (ex: 40€/h)"
        value={prix}
        onChange={(e) => setPrix(e.target.value)}
      />
      <input
        className={`${inputCls} w-48`}
        placeholder="Détail (optionnel)"
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
      />
      <button
        onClick={submit}
        className="text-xs bg-navy text-white px-2 py-1 rounded"
      >
        Ajouter
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-xs text-white/80 hover:text-white"
      >
        Annuler
      </button>
    </div>
  );
}
