import Link from "next/link";
import { COURS_TENNIS, COURS_PADEL } from "@/lib/data/ecole";
import { FORMULES, OPTIONS_F4, PRIX_DEJEUNER } from "@/lib/data/stages";
import {
  LECONS_INDIVIDUELLES,
  LOCATIONS,
  MATERIEL,
} from "@/lib/data/autres-tarifs";

export const metadata = {
  title: "Tarifs — ATS Valrose",
  description:
    "Tous les tarifs du club ATS Valrose : école de tennis, école de padel, stages, leçons individuelles, locations.",
};

export default function TarifsPage() {
  return (
    <div className="bg-gray-50">
      <section className="bg-gradient-to-br from-navy via-navy to-cyan-club text-white">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            Tarifs 2026-2027
          </h1>
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
          cta={{ href: "/ecole", label: "S'inscrire à l'école" }}
        >
          <Table
            rows={COURS_TENNIS.map((c) => ({
              label: c.label,
              prix: `${c.prix}€`,
            }))}
          />
        </Block>

        {/* ÉCOLE PADEL */}
        <Block color="ocre" title="École de Padel">
          <Table
            rows={COURS_PADEL.map((c) => ({
              label: c.label,
              prix: `${c.prix}€`,
            }))}
          />
        </Block>

        {/* STAGES */}
        <Block
          color="cyan"
          title="Stages de vacances"
          cta={{ href: "/stages", label: "S'inscrire à un stage" }}
        >
          <Table
            rows={[
              ...FORMULES.filter((f) => typeof f.prix === "number").map(
                (f) => ({
                  label: `${f.titre} — ${f.detailsHoraires}`,
                  prix: `${f.prix}€ / semaine`,
                }),
              ),
              { label: "Option déjeuner (Formule 3)", prix: `+${PRIX_DEJEUNER}€ / semaine` },
              ...Object.entries(OPTIONS_F4).map(([, o]) => ({
                label: `Formule 4 — ${o.label} (${o.detail})`,
                prix: `${o.prix}€ / jour`,
              })),
            ]}
          />
        </Block>

        {/* LEÇONS */}
        <Block color="navy" title="Leçons individuelles">
          <Table
            rows={LECONS_INDIVIDUELLES.map((l) => ({
              label: l.label + (l.detail ? ` — ${l.detail}` : ""),
              prix: l.prix,
            }))}
          />
          <p className="mt-4 text-sm text-gray-600">
            Pour réserver une leçon individuelle, contactez directement le
            club&nbsp;:{" "}
            <a
              className="text-navy underline"
              href="mailto:contact@ats-valrose.fr"
            >
              contact@ats-valrose.fr
            </a>
          </p>
        </Block>

        {/* LOCATIONS */}
        <Block color="navy" title="Location de courts">
          <Table
            rows={LOCATIONS.map((l) => ({ label: l.label, prix: l.prix }))}
          />
        </Block>

        {/* MATÉRIEL */}
        <Block color="navy" title="Matériel">
          <Table
            rows={MATERIEL.map((m) => ({ label: m.label, prix: m.prix }))}
          />
          <p className="mt-4 text-sm text-gray-600">
            Prêt de raquettes inclus dans toutes les formules de stage.
          </p>
        </Block>

        <p className="text-center text-sm text-gray-500">
          Une question ?{" "}
          <a
            className="text-navy underline"
            href="mailto:contact@ats-valrose.fr"
          >
            contact@ats-valrose.fr
          </a>
        </p>
      </div>
    </div>
  );
}

function Block({
  color,
  title,
  children,
  cta,
}: {
  color: "navy" | "cyan" | "ocre";
  title: string;
  children: React.ReactNode;
  cta?: { href: string; label: string };
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
      {cta ? (
        <footer className="px-6 py-4 bg-gray-50 border-t">
          <Link
            href={cta.href}
            className={`inline-block rounded-lg px-4 py-2 font-semibold text-sm ${ctaCls}`}
          >
            {cta.label} →
          </Link>
        </footer>
      ) : null}
    </section>
  );
}

function Table({ rows }: { rows: { label: string; prix: string }[] }) {
  return (
    <ul className="divide-y divide-gray-100">
      {rows.map((r, i) => (
        <li
          key={i}
          className="flex items-center justify-between gap-4 py-2.5 text-sm"
        >
          <span className="text-gray-800">{r.label}</span>
          <span className="font-bold text-navy whitespace-nowrap">
            {r.prix}
          </span>
        </li>
      ))}
    </ul>
  );
}
