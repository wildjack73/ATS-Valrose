import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-cyan-club text-white">
        {/* Décor : lignes de court de tennis stylisées */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none"
          viewBox="0 0 800 400"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <rect
            x="50"
            y="50"
            width="700"
            height="300"
            stroke="white"
            strokeWidth="2"
            fill="none"
          />
          <line
            x1="400"
            y1="50"
            x2="400"
            y2="350"
            stroke="white"
            strokeWidth="2"
          />
          <rect
            x="170"
            y="125"
            width="460"
            height="150"
            stroke="white"
            strokeWidth="2"
            fill="none"
          />
          <line x1="170" y1="200" x2="630" y2="200" stroke="white" strokeWidth="2" />
        </svg>

        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <div className="flex items-center gap-4 mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-club.png"
              alt="ATS Valrose"
              className="h-16 w-auto sm:h-20"
            />
            <div className="h-12 sm:h-14 w-px bg-white/30" />
            <div>
              <p className="text-xs uppercase tracking-widest text-yellow-club font-semibold">
                Padel Tennis · Nice
              </p>
              <p className="text-sm text-white/70">Saison 2026-2027</p>
            </div>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight max-w-3xl">
            Inscriptions en ligne
            <span className="block text-yellow-club">ATS&nbsp;Valrose</span>
          </h1>

          <p className="mt-5 text-lg sm:text-xl text-white/85 max-w-2xl">
            Stages de vacances et école de tennis. Tennis, padel,
            pickleball, multi-activités. Encadré par des moniteurs diplômés
            d&apos;État.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/stages"
              className="rounded-lg bg-yellow-club text-navy px-6 py-3 font-bold hover:bg-yellow-hover transition shadow-lg"
            >
              S&apos;inscrire à un stage →
            </Link>
            <Link
              href="/ecole"
              className="rounded-lg bg-white/10 hover:bg-white/20 text-white px-6 py-3 font-bold border border-white/20 backdrop-blur transition"
            >
              S&apos;inscrire à l&apos;école →
            </Link>
          </div>
        </div>
      </section>

      {/* CHIFFRES CLÉS */}
      <section className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-4 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <Stat number="3" label="Courts de tennis" />
          <Stat number="2" label="Courts de padel" />
          <Stat number="17" label="Semaines de stages/an" />
          <Stat number="100%" label="Moniteurs diplômés d'État" />
        </div>
      </section>

      {/* CARTES DE PARCOURS */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-cyan-club font-semibold">
              Inscriptions
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy mt-2">
              Choisissez votre formule
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* STAGES — thème bleu */}
            <Link
              href="/stages"
              className="group relative rounded-2xl overflow-hidden border-2 border-cyan-club/30 bg-white shadow-sm hover:shadow-xl hover:border-cyan-club transition flex flex-col"
            >
              <div className="bg-gradient-to-br from-cyan-club to-navy text-white p-6 relative overflow-hidden">
                <IconBall className="absolute -right-6 -bottom-6 w-32 h-32 text-white/10" />
                <p className="text-xs uppercase tracking-widest text-yellow-club font-semibold">
                  Vacances scolaires
                </p>
                <h3 className="text-2xl font-extrabold mt-1">
                  Stages de vacances
                </h3>
                <p className="text-3xl font-extrabold mt-4">
                  110€<span className="text-base font-normal text-white/80"> – </span>280€
                </p>
                <p className="text-sm text-white/80">par semaine</p>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2"><Check /> 4 formules au choix (Baby tennis → journée complète)</li>
                  <li className="flex gap-2"><Check /> Tennis, padel, pickleball, multi-activités</li>
                  <li className="flex gap-2"><Check /> Prêt de raquettes inclus</li>
                  <li className="flex gap-2"><Check /> Option déjeuner encadré (Formule 3)</li>
                </ul>
                <p className="mt-6 text-cyan-club font-bold group-hover:text-navy">
                  S&apos;inscrire à un stage →
                </p>
              </div>
            </Link>

            {/* ÉCOLE — thème ocre / terre battue */}
            <Link
              href="/ecole"
              className="group relative rounded-2xl overflow-hidden border-2 border-ocre/30 bg-white shadow-sm hover:shadow-xl hover:border-ocre transition flex flex-col"
            >
              <div className="bg-gradient-to-br from-ocre to-clay text-white p-6 relative overflow-hidden">
                <IconRacket className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
                <p className="text-xs uppercase tracking-widest text-yellow-club font-semibold">
                  Annuel
                </p>
                <h3 className="text-2xl font-extrabold mt-1">
                  École de tennis
                </h3>
                <p className="text-3xl font-extrabold mt-4">
                  250€<span className="text-base font-normal text-white/80"> – </span>750€
                </p>
                <p className="text-sm text-white/80">par an, selon la formule</p>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2"><Check /> Baby tennis, mini tennis, initiation</li>
                  <li className="flex gap-2"><Check /> Perfectionnement, centre d&apos;entraînement</li>
                  <li className="flex gap-2"><Check /> Cours adultes (annuel ou trimestriel)</li>
                  <li className="flex gap-2"><Check /> École de padel</li>
                </ul>
                <p className="mt-6 text-ocre font-bold group-hover:text-clay">
                  S&apos;inscrire à l&apos;école →
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* LECONS / LOCATIONS */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <Link
            href="/tarifs"
            className="block rounded-2xl border-2 border-dashed border-navy/20 bg-white p-6 hover:border-navy/40 hover:bg-navy/5 transition"
          >
            <div className="flex items-center gap-4 flex-wrap">
              <IconRacketSmall className="w-10 h-10 text-navy shrink-0" />
              <div className="flex-1 min-w-[200px]">
                <h3 className="text-lg font-semibold text-navy">
                  Leçons individuelles, location de courts, autres tarifs
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Voir tous les tarifs du club (Tennis, Padel, Pickleball,
                  matériel).
                </p>
              </div>
              <span className="text-yellow-hover font-bold">
                Voir les tarifs →
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* CONTACT */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-10 text-center">
          <p className="text-sm text-gray-600">
            Une question ? Contactez le club&nbsp;:
          </p>
          <a
            href="mailto:contact@ats-valrose.fr"
            className="mt-2 inline-block text-navy text-lg font-bold underline hover:text-yellow-hover"
          >
            contact@ats-valrose.fr
          </a>
        </div>
      </section>
    </div>
  );
}

// --- Helpers visuels -------------------------------------------------------

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <p className="text-3xl sm:text-4xl font-extrabold text-navy">{number}</p>
      <p className="text-xs uppercase tracking-wide text-gray-500 mt-1">
        {label}
      </p>
    </div>
  );
}

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-5 h-5 shrink-0 text-yellow-hover mt-0.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
      <path
        d="M7 12.5l3 3 7-7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="currentColor" />
      <path
        d="M5 32 Q32 12 59 32"
        stroke="white"
        strokeWidth="2"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M5 32 Q32 52 59 32"
        stroke="white"
        strokeWidth="2"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}

function IconRacket({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <ellipse
        cx="24"
        cy="22"
        rx="16"
        ry="20"
        fill="currentColor"
        transform="rotate(-30 24 22)"
      />
      <rect
        x="38"
        y="36"
        width="6"
        height="22"
        rx="2"
        fill="currentColor"
        transform="rotate(-30 41 47)"
      />
    </svg>
  );
}

function IconRacketSmall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle
        cx="15"
        cy="14"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
      />
      <line
        x1="22"
        y1="21"
        x2="34"
        y2="33"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="15" cy="14" r="3" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
