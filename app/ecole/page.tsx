import { getActiveTarifsBundle } from "@/lib/data/tarifs-server";
import EcoleForm from "./EcoleForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inscription École de Tennis — ATS Valrose",
  description:
    "Inscription annuelle à l'École de Tennis Valrose : tennis, padel.",
};

export default async function EcolePage() {
  const bundle = await getActiveTarifsBundle();

  if (!bundle) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-navy">
          Inscriptions temporairement indisponibles
        </h1>
        <p className="mt-3 text-gray-600">
          Aucune saison active n&apos;est configurée. Contactez le club&nbsp;:{" "}
          <a
            className="text-navy underline"
            href="mailto:contact@ats-valrose.fr"
          >
            contact@ats-valrose.fr
          </a>
        </p>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-gradient-to-br from-clay via-ocre to-ocre-light text-white">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            École de Tennis — {bundle.saison.label}
          </h1>
          <p className="mt-3 text-white/90">
            Inscription annuelle aux cours de tennis et de padel de
            l&apos;ATS&nbsp;Valrose.
          </p>
        </div>
      </section>
      <section>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <EcoleForm bundle={bundle} />
        </div>
      </section>
    </div>
  );
}
