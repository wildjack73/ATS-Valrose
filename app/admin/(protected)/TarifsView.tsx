import {
  FORMULES,
  OPTIONS_F4,
  SEMAINES,
  PRIX_DEJEUNER,
} from "@/lib/data/stages";
import {
  COURS_TENNIS,
  COURS_PADEL,
  LICENCE_FFT,
  PRIX_LICENCE_FFT,
} from "@/lib/data/ecole";
import {
  LECONS_INDIVIDUELLES,
  LOCATIONS,
  MATERIEL,
} from "@/lib/data/autres-tarifs";

/**
 * Vue admin lecture-seule de toute la configuration tarifaire.
 * Pour MODIFIER ces valeurs il faut éditer les fichiers `lib/data/*.ts`
 * puis pousser sur GitHub. Voir la note en bas de page.
 */
export default function TarifsView() {
  const semainesOuvertes = SEMAINES.filter((s) => s.ouverte);
  const semainesFermees = SEMAINES.filter((s) => !s.ouverte);

  return (
    <div className="space-y-6">
      <Section title="🎾 Stages — Formules">
        <Table
          headers={["Formule", "Sous-titre", "Prix"]}
          rows={FORMULES.map((f) => [
            f.titre,
            f.sousTitre,
            typeof f.prix === "number" ? `${f.prix}€` : "—",
          ])}
        />
        <Note>
          Formule 3 : option déjeuner encadré <strong>+{PRIX_DEJEUNER}€</strong> /
          semaine
        </Note>
      </Section>

      <Section title="🎾 Stages — Formule 4 (à la carte)">
        <Table
          headers={["Option", "Détail", "Prix / jour"]}
          rows={Object.entries(OPTIONS_F4).map(([, o]) => [
            o.label,
            o.detail,
            `${o.prix}€`,
          ])}
        />
      </Section>

      <Section
        title={`📅 Semaines de stages ouvertes (${semainesOuvertes.length})`}
      >
        <Table
          headers={["Période", "Dates", "ID"]}
          rows={semainesOuvertes.map((s) => [s.periode, s.label, s.id])}
        />
        {semainesFermees.length > 0 ? (
          <Note>
            ⓘ {semainesFermees.length} semaine(s) configurée(s) mais marquée(s)
            comme fermées (non visible dans le formulaire).
          </Note>
        ) : null}
      </Section>

      <Section title="🏫 École Tennis 2026-2027">
        <Table
          headers={["Cours", "Prix annuel"]}
          rows={COURS_TENNIS.map((c) => [c.label, `${c.prix}€`])}
        />
      </Section>

      <Section title="🏫 École Padel 2026-2027">
        <Table
          headers={["Cours", "Prix annuel"]}
          rows={COURS_PADEL.map((c) => [c.label, `${c.prix}€`])}
        />
      </Section>

      <Section title="📋 Licence FFT (obligatoire école)">
        <Table
          headers={["Type", "Tarif"]}
          rows={LICENCE_FFT.map((l) => [
            l.label,
            PRIX_LICENCE_FFT[l.id] > 0
              ? `+${PRIX_LICENCE_FFT[l.id]}€`
              : "Gratuit",
          ])}
        />
      </Section>

      <Section title="👤 Leçons individuelles">
        <Table
          headers={["Leçon", "Tarif", "Détail"]}
          rows={LECONS_INDIVIDUELLES.map((l) => [
            l.label,
            l.prix,
            l.detail ?? "",
          ])}
        />
      </Section>

      <Section title="🎾 Location de courts">
        <Table
          headers={["Service", "Tarif"]}
          rows={LOCATIONS.map((l) => [l.label, l.prix])}
        />
      </Section>

      <Section title="🛍️ Matériel">
        <Table
          headers={["Article", "Tarif"]}
          rows={MATERIEL.map((m) => [m.label, m.prix])}
        />
      </Section>

      <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-5 text-sm text-gray-700">
        <h3 className="font-bold text-navy mb-2">
          ✏️ Comment modifier ces tarifs ?
        </h3>
        <p className="mb-2">
          Cette page est en <strong>lecture seule</strong>. Pour modifier les
          tarifs, il faut éditer les fichiers de configuration dans le code
          source puis pousser sur GitHub (Hostinger redéploiera automatiquement
          dans la minute).
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            Formules stages, options F4, semaines :{" "}
            <code className="bg-white px-1.5 py-0.5 rounded text-xs">
              lib/data/stages.ts
            </code>
          </li>
          <li>
            Cours école tennis/padel, licence FFT :{" "}
            <code className="bg-white px-1.5 py-0.5 rounded text-xs">
              lib/data/ecole.ts
            </code>
          </li>
          <li>
            Leçons, locations, matériel :{" "}
            <code className="bg-white px-1.5 py-0.5 rounded text-xs">
              lib/data/autres-tarifs.ts
            </code>
          </li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Pour rendre ces tarifs <em>éditables directement depuis cette
          page</em> (sans toucher au code), il faut migrer en base de données —
          environ 2h de développement supplémentaire. Demande-le si besoin.
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <header className="bg-navy text-white px-5 py-3">
        <h3 className="font-bold text-base">{title}</h3>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
            {headers.map((h, i) => (
              <th
                key={i}
                className={`text-left py-2 pr-4 ${
                  i === headers.length - 1 && /Prix|Tarif/.test(h)
                    ? "text-right"
                    : ""
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-100 last:border-0">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`py-2.5 pr-4 ${
                    ci === row.length - 1 && /€|Gratuit|—/.test(String(cell))
                      ? "text-right font-bold text-navy whitespace-nowrap"
                      : "text-gray-800"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-xs text-gray-600 bg-gray-50 rounded px-3 py-2">
      {children}
    </p>
  );
}
