import { getActiveTarifsBundle } from "@/lib/data/tarifs-server";
import StageForm from "./StageForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inscription Stages — ATS Valrose",
  description:
    "Inscrivez votre enfant aux stages de tennis ATS Valrose pendant les vacances scolaires.",
};

export default async function StagesPage() {
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
      <section className="bg-gradient-to-br from-navy via-navy to-cyan-club text-white">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            Inscription Stage de Tennis
          </h1>
          <p className="mt-3 text-white/90">
            Stages multi-activités (tennis, padel, pickleball) pendant les
            vacances scolaires. {bundle.saison.label}.
          </p>
        </div>
      </section>
      <section>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <StageForm bundle={bundle} />
        </div>
      </section>
    </div>
  );
}
