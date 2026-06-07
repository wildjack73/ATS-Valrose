import Link from "next/link";
import { getActiveTarifsBundle } from "@/lib/data/tarifs-server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tarifs — ATS Valrose",
  description:
    "Tous les tarifs du club ATS Valrose : école de tennis, école de padel, stages, leçons individuelles, locations.",
};

export default async function TarifsPage() {
  const bundle = await getActiveTarifsBundle();

  if (!bundle) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-navy">
          Tarifs non disponibles
        </h1>
        <p className="mt-3 text-gray-600">
          <a
            className="text-navy underline font-semibold"
            href="https://padel-tennis-nice.fr/contact-padel-tennis-nice/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contactez le club
          </a>
          .
        </p>
      </div>
    );
  }

  const formulesFixes = bundle.formules.filter(
    (f) => typeof f.prix === "number" && !f.is_a_la_carte,
  );
  const lecons = bundle.autres.filter((a) => a.category === "lecons");
  const locations = bundle.autres.filter((a) => a.category === "locations");
  const materiel = bundle.autres.filter((a) => a.category === "materiel");

  return (
    <div>
      <section className="bg-gradient-to-br from-navy via-navy to-cyan-club text-white">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            Tarifs du club
          </h1>
          <p className="mt-2 text-white/85 text-sm">
            🎾 Stages : <strong>{bundle.saisonStages.label}</strong>
            {" · "}
            🏫 École : <strong>{bundle.saisonEcole.label}</strong>
          </p>
          <p className="mt-2 text-white/85">
            Tous les tarifs du club. Pour vous inscrire en ligne, utilisez les
            boutons en bas de chaque section.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-10 space-y-10">
        {/* ÉCOLE TENNIS */}
        <Block
          color="ocre"
          title="École de Tennis"
          ctas={[
            { href: "/ecole?public=jeunes", label: "Inscription jeunes & enfants" },
            { href: "/cours", label: "Inscription adultes" },
          ]}
        >
          <Table
            rows={bundle.coursTennis.map((c) => ({
              label: c.label,
              detail: c.description,
              prix: `${c.prix}€`,
              ferme: c.ferme,
            }))}
          />
        </Block>

        {/* ÉCOLE PADEL */}
        {bundle.coursPadel.length > 0 ? (
          <Block
            color="ocre"
            title="École de Padel"
            ctas={[
              { href: "/ecole?public=jeunes", label: "Inscription jeunes & enfants" },
              { href: "/cours", label: "Inscription adultes" },
            ]}
          >
            <Table
              rows={bundle.coursPadel.map((c) => ({
                label: c.label,
                detail: c.description,
                prix: `${c.prix}€`,
                ferme: c.ferme,
              }))}
            />
          </Block>
        ) : null}

        {/* STAGES */}
        <Block
          color="cyan"
          title="Stages de vacances"
          ctas={[{ href: "/stages", label: "S'inscrire à un stage" }]}
        >
          <Table
            rows={[
              ...formulesFixes.map((f) => ({
                label: `${f.titre}${f.details_horaires ? ` — ${f.details_horaires}` : ""}`,
                prix: `${f.prix}€ / semaine`,
              })),
              ...bundle.formules
                .filter((f) => f.has_dejeuner_option && f.prix_dejeuner > 0)
                .map((f) => ({
                  label: `Option déjeuner (${f.titre.split(" — ")[0]})`,
                  prix: `+${f.prix_dejeuner}€ / semaine`,
                })),
              ...bundle.optionsF4.map((o) => ({
                label: `Formule 4 — ${o.label} (${o.detail})`,
                prix: `${o.prix}€ / jour`,
              })),
            ]}
          />
        </Block>

        {/* LEÇONS */}
        {lecons.length > 0 ? (
          <Block color="navy" title="Leçons individuelles">
            <Table
              rows={lecons.map((l) => ({
                label: l.label + (l.detail ? ` — ${l.detail}` : ""),
                prix: l.prix,
              }))}
            />
            <p className="mt-4 text-sm text-gray-600">
              Pour réserver une leçon ou un coaching&nbsp;:{" "}
              <a
                className="text-navy underline font-semibold"
                href="https://tcvalrose.doinsport.club/home"
                target="_blank"
                rel="noopener noreferrer"
              >
                Réserver en ligne
              </a>
              .
            </p>
          </Block>
        ) : null}

        {/* LOCATIONS */}
        {locations.length > 0 ? (
          <Block color="navy" title="Location de courts">
            <Table
              rows={locations.map((l) => ({ label: l.label, prix: l.prix }))}
            />
          </Block>
        ) : null}

        {/* MATÉRIEL */}
        {materiel.length > 0 ? (
          <Block color="navy" title="Matériel">
            <Table
              rows={materiel.map((m) => ({ label: m.label, prix: m.prix }))}
            />
            <p className="mt-4 text-sm text-gray-600">
              Prêt de raquettes inclus dans toutes les formules de stage.
            </p>
          </Block>
        ) : null}

        {/* Réservation + Contact */}
        <div className="rounded-2xl bg-navy text-white p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-yellow-club font-bold">
            Réservation & contact
          </p>
          <h3 className="mt-2 text-xl sm:text-2xl font-extrabold">
            Réservez votre terrain ou votre coaching
          </h3>
          <p className="mt-2 text-sm text-white/75">
            Réservation en ligne via notre plateforme dédiée.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 justify-center">
            <a
              href="https://tcvalrose.doinsport.club/home"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-yellow-club text-navy px-5 py-2.5 font-bold text-sm hover:bg-yellow-hover transition"
            >
              Réserver un terrain ou un coaching →
            </a>
            <a
              href="https://padel-tennis-nice.fr/contact-padel-tennis-nice/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-2.5 font-bold text-sm transition"
            >
              Nous contacter →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({
  color,
  title,
  children,
  ctas,
}: {
  color: "navy" | "cyan" | "ocre";
  title: string;
  children: React.ReactNode;
  ctas?: { href: string; label: string }[];
}) {
  const accent =
    color === "cyan"
      ? "bg-cyan-club"
      : color === "ocre"
        ? "bg-ocre"
        : "bg-navy";
  const ctaCls =
    color === "cyan"
      ? "bg-cyan-club hover:bg-cyan-light text-navy"
      : color === "ocre"
        ? "bg-ocre hover:bg-ocre-dark text-white"
        : "bg-navy hover:bg-navy-dark text-white";
  return (
    <section className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <header className="flex items-center gap-3 px-6 py-4 border-b">
        <span className={`inline-block w-2 h-8 rounded ${accent}`} />
        <h2 className="text-xl sm:text-2xl font-bold text-navy">{title}</h2>
      </header>
      <div className="px-6 py-5">{children}</div>
      {ctas && ctas.length > 0 ? (
        <footer className="px-6 py-4 bg-gray-50 border-t flex flex-wrap gap-3">
          {ctas.map((c) => (
            <Link
              key={c.href + c.label}
              href={c.href}
              className={`inline-block rounded-lg px-4 py-2 font-semibold text-sm ${ctaCls}`}
            >
              {c.label} →
            </Link>
          ))}
        </footer>
      ) : null}
    </section>
  );
}

function Table({
  rows,
}: {
  rows: {
    label: string;
    detail?: string | null;
    prix: string;
    ferme?: boolean;
  }[];
}) {
  return (
    <ul className="divide-y divide-gray-100">
      {rows.map((r, i) => (
        <li
          key={i}
          className={`flex items-start justify-between gap-4 py-3 text-sm ${
            r.ferme ? "opacity-60" : ""
          }`}
        >
          <div className="min-w-0">
            <p
              className={`font-medium ${
                r.ferme ? "text-gray-500 line-through" : "text-gray-900"
              }`}
            >
              {r.label}
              {r.ferme ? (
                <span className="ml-2 inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700 align-middle no-underline">
                  Complet
                </span>
              ) : null}
            </p>
            {r.detail ? (
              <p className="mt-0.5 text-xs text-gray-500 leading-snug">
                {r.detail}
              </p>
            ) : null}
          </div>
          <span
            className={`font-bold whitespace-nowrap shrink-0 ${
              r.ferme ? "text-gray-400 line-through" : "text-navy"
            }`}
          >
            {r.prix}
          </span>
        </li>
      ))}
    </ul>
  );
}
