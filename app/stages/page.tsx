import { getActiveTarifsBundle } from "@/lib/data/tarifs-server";
import StageForm from "./StageForm";

// Revalidate every 5 minutes — données (formules/semaines) changent rarement.
// Les requêtes entre deux revalidations utilisent le HTML en cache sans toucher
// Supabase → les cold starts ne touchent plus les visiteurs.
export const revalidate = 300;

export const metadata = {
  title: "Inscription Stages — ATS Valrose",
  description:
    "Inscrivez votre enfant aux stages de tennis ATS Valrose pendant les vacances scolaires.",
};

export default async function StagesPage() {
  const bundle = await getActiveTarifsBundle();

  // Filtrer les semaines passées (Vendredi < aujourd'hui)
  if (bundle) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    bundle.semaines = bundle.semaines.filter((s) => {
      if (!s.date_debut) return s.ouverte;
      const lundi = new Date(s.date_debut);
      const vendredi = new Date(lundi);
      vendredi.setDate(vendredi.getDate() + 4);
      return vendredi >= today && s.ouverte;
    });
  }

  if (!bundle) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-navy">
          Inscriptions temporairement indisponibles
        </h1>
        <p className="mt-3 text-gray-600">
          Aucune saison active n&apos;est configurée.{" "}
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

  return (
    <div>
      <section className="bg-gradient-to-br from-navy via-navy to-cyan-club text-white">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            Inscription Stage de Tennis
          </h1>
          <p className="mt-3 text-white/90">
            Stages multi-activités (tennis, padel, pickleball) pendant les
            vacances scolaires. {bundle.saisonStages.label}.
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
