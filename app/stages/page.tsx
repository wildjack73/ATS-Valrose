import StageForm from "./StageForm";

export const metadata = {
  title: "Inscription Stages — ATS Valrose",
  description:
    "Inscrivez votre enfant aux stages de tennis ATS Valrose pendant les vacances scolaires.",
};

export default function StagesPage() {
  return (
    <div className="bg-cyan-club">
      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14 text-white">
        <h1 className="text-3xl sm:text-4xl font-extrabold">
          Inscription Stage de Tennis
        </h1>
        <p className="mt-3 text-white/90">
          Stages multi-activités (tennis, padel, pickleball) pendant les
          vacances scolaires. Prêt de raquettes inclus pour toutes les
          formules.
        </p>
      </section>
      <section className="bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <StageForm />
        </div>
      </section>
    </div>
  );
}
