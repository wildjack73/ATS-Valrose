import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      {/* HERO */}
      <section className="bg-gradient-to-br from-navy via-navy to-cyan-club text-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">
            Bienvenue à l&apos;ATS&nbsp;Valrose
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-white/90 max-w-2xl">
            Inscriptions en ligne aux stages de vacances et à l&apos;école de
            tennis pour la saison 2026-2027.
          </p>
        </div>
      </section>

      {/* CARTES DE PARCOURS */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 grid sm:grid-cols-2 gap-6">
          {/* STAGES — thème bleu */}
          <Link
            href="/stages"
            className="group rounded-2xl border-2 border-cyan-club/30 bg-gradient-to-br from-cyan-pale to-white p-8 shadow-sm hover:shadow-lg hover:border-cyan-club transition"
          >
            <div className="flex items-center gap-3">
              <span className="inline-block w-3 h-10 bg-cyan-club rounded" />
              <h2 className="text-2xl font-bold text-navy">
                Stages de vacances
              </h2>
            </div>
            <p className="mt-4 text-gray-700">
              4 formules (de 110€ à 280€) pendant toutes les vacances
              scolaires. Tennis, padel, multi-activités.
            </p>
            <p className="mt-6 inline-flex items-center text-navy font-semibold group-hover:underline">
              S&apos;inscrire à un stage →
            </p>
          </Link>

          {/* ÉCOLE — thème ocre / terre battue */}
          <Link
            href="/ecole"
            className="group rounded-2xl border-2 border-ocre/30 bg-gradient-to-br from-ocre-pale to-white p-8 shadow-sm hover:shadow-lg hover:border-ocre transition"
          >
            <div className="flex items-center gap-3">
              <span className="inline-block w-3 h-10 bg-ocre rounded" />
              <h2 className="text-2xl font-bold text-navy">
                École de tennis 2026-2027
              </h2>
            </div>
            <p className="mt-4 text-gray-700">
              Inscription annuelle : tennis, padel, cours adultes. Du baby
              tennis au centre d&apos;entraînement.
            </p>
            <p className="mt-6 inline-flex items-center text-navy font-semibold group-hover:underline">
              S&apos;inscrire à l&apos;école →
            </p>
          </Link>
        </div>

        {/* Lien vers Tarifs */}
        <div className="mx-auto max-w-5xl px-4 pb-12">
          <Link
            href="/tarifs"
            className="block rounded-2xl border border-gray-200 bg-white p-6 hover:border-navy/40 transition text-center"
          >
            <h3 className="text-lg font-semibold text-navy">
              Leçons individuelles, location de courts, autres tarifs →
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Voir tous les tarifs du club (information).
            </p>
          </Link>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 pb-12 text-center text-sm text-gray-600">
          Une question ?{" "}
          <a
            href="mailto:contact@ats-valrose.fr"
            className="text-navy underline hover:text-yellow-hover"
          >
            contact@ats-valrose.fr
          </a>
        </div>
      </section>
    </div>
  );
}
