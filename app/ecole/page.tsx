import EcoleForm from "./EcoleForm";

export const metadata = {
  title: "Inscription École de Tennis — ATS Valrose",
  description:
    "Inscription annuelle à l'École de Tennis Valrose 2026-2027 : tennis, padel.",
};

export default function EcolePage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-clay via-ocre to-ocre-light text-white">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            École de Tennis 2026-2027
          </h1>
          <p className="mt-3 text-white/90">
            Inscription annuelle aux cours de tennis et de padel de
            l&apos;ATS&nbsp;Valrose.
          </p>
        </div>
      </section>
      <section>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <EcoleForm />
        </div>
      </section>
    </div>
  );
}
