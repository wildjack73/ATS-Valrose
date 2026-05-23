import Link from "next/link";
import { AnimatedCounter } from "@/components/home/AnimatedCounter";
import { Reveal } from "@/components/home/Reveal";
import { HeroBackground } from "@/components/home/HeroBackground";

export default function HomePage() {
  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-[#0a3a52] to-cyan-club text-white animate-gradient-x">
        <HeroBackground />

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28 lg:py-32">
          <p
            className="animate-fade-in-up text-xs uppercase tracking-[0.3em] text-yellow-club font-bold mb-6"
          >
            Saison 2026-2027
          </p>

          <h1
            className="animate-fade-in-up text-5xl sm:text-7xl lg:text-8xl font-extrabold leading-[1.05] max-w-4xl tracking-tight"
            style={{ animationDelay: "100ms" }}
          >
            Inscriptions{" "}
            <span className="block bg-gradient-to-r from-yellow-club via-yellow-200 to-yellow-club bg-clip-text text-transparent pb-2 overflow-visible">
              en ligne
            </span>
            <span className="block text-white/90 mt-2">
              ATS&nbsp;Valrose
            </span>
          </h1>

          <p
            className="animate-fade-in-up mt-8 text-lg sm:text-2xl text-white/85 max-w-2xl leading-relaxed"
            style={{ animationDelay: "250ms" }}
          >
            Stages de vacances et école de tennis. Tennis, padel, pickleball,
            multi-activités. Encadré par des moniteurs diplômés d&apos;État.
          </p>

          <div
            className="animate-fade-in-up mt-12 flex flex-wrap gap-x-8 gap-y-5"
            style={{ animationDelay: "400ms" }}
          >
            <Link
              href="/stages"
              className="radar-pulse group relative overflow-visible rounded-xl bg-yellow-club text-navy px-8 py-4 font-bold text-lg shadow-2xl shadow-yellow-club/40 hover:shadow-yellow-club/60 transition-all hover:-translate-y-0.5"
            >
              <span className="relative z-10 inline-flex items-center gap-2">
                S&apos;inscrire à un stage
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
            <Link
              href="/ecole"
              className="radar-pulse-ring group rounded-xl bg-white/10 hover:bg-white/20 text-white px-8 py-4 font-bold text-lg border border-white/20 backdrop-blur-sm transition-all hover:-translate-y-0.5"
            >
              <span className="inline-flex items-center gap-2">
                S&apos;inscrire à l&apos;école
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-xs uppercase tracking-widest flex flex-col items-center gap-2 animate-scroll-bounce">
          <span>Découvrir</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </section>

      {/* ============ CHIFFRES CLÉS ============ */}
      <section className="relative bg-white border-y border-gray-100">
        <div className="mx-auto max-w-6xl px-4 py-14 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: 3, label: "Courts de tennis", suffix: "" },
            { value: 2, label: "Courts de padel", suffix: "" },
            { value: 17, label: "Semaines de stages / an", suffix: "" },
            { value: 100, label: "Moniteurs D.E.", suffix: "%" },
          ].map((stat, i) => (
            <Reveal key={stat.label} delay={i * 100}>
              <div className="flex flex-col items-center">
                <p className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-navy tracking-tight leading-none">
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix}
                  />
                </p>
                <p className="text-[11px] sm:text-xs uppercase tracking-widest text-gray-500 font-bold mt-4">
                  {stat.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ CARTES PARCOURS ============ */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-club font-bold">
                Inscriptions ouvertes
              </p>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-navy mt-3 tracking-tight">
                Choisissez votre parcours
              </h2>
              <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                Deux formules pour profiter du club selon votre rythme.
              </p>
            </div>
          </Reveal>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* STAGES */}
            <Reveal delay={100}>
              <Link
                href="/stages"
                className="card-3d group relative block rounded-3xl overflow-hidden bg-white border-2 border-cyan-club/20 shadow-xl"
              >
                <div className="relative bg-gradient-to-br from-cyan-club via-cyan-club to-navy text-white p-8 overflow-hidden">
                  <IconBall className="absolute -right-8 -bottom-8 w-44 h-44 text-white/15 transition-transform duration-700 group-hover:rotate-45 group-hover:scale-110" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-yellow-club font-bold">
                    Vacances scolaires
                  </p>
                  <h3 className="text-3xl font-extrabold mt-2 tracking-tight">
                    Stages de vacances
                  </h3>
                  <p className="text-4xl font-extrabold mt-6">
                    <span className="text-white">110€</span>
                    <span className="text-base font-normal text-white/70 mx-1">
                      à
                    </span>
                    <span className="text-white">280€</span>
                  </p>
                  <p className="text-sm text-white/70">par semaine</p>
                </div>
                <div className="p-8">
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex gap-3 items-start">
                      <Check />
                      <span>
                        <strong>4 formules</strong> au choix : Baby tennis à
                        journée complète
                      </span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <Check />
                      <span>Tennis, padel, pickleball, multi-activités</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <Check />
                      <span>Prêt de raquettes inclus</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <Check />
                      <span>Option déjeuner encadré (Formule 3)</span>
                    </li>
                  </ul>
                  <p className="mt-8 inline-flex items-center gap-2 text-cyan-club font-bold group-hover:text-navy transition-colors">
                    S&apos;inscrire à un stage
                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </p>
                </div>
              </Link>
            </Reveal>

            {/* ÉCOLE */}
            <Reveal delay={250}>
              <Link
                href="/ecole"
                className="card-3d group relative block rounded-3xl overflow-hidden bg-white border-2 border-ocre/20 shadow-xl"
              >
                <div className="relative bg-gradient-to-br from-ocre via-ocre to-clay text-white p-8 overflow-hidden">
                  <IconRacket className="absolute -right-6 -bottom-6 w-44 h-44 text-white/15 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-yellow-club font-bold">
                    Saison annuelle
                  </p>
                  <h3 className="text-3xl font-extrabold mt-2 tracking-tight">
                    École de tennis
                  </h3>
                  <p className="text-4xl font-extrabold mt-6">
                    <span className="text-white">250€</span>
                    <span className="text-base font-normal text-white/70 mx-1">
                      à
                    </span>
                    <span className="text-white">750€</span>
                  </p>
                  <p className="text-sm text-white/70">par an, selon la formule</p>
                </div>
                <div className="p-8">
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex gap-3 items-start">
                      <Check />
                      <span>Baby, mini, initiation, perfectionnement</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <Check />
                      <span>Centre d&apos;entraînement, demi-journée</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <Check />
                      <span>Cours adultes (annuel ou trimestre)</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <Check />
                      <span>École de padel (perfectionnement + adultes)</span>
                    </li>
                  </ul>
                  <p className="mt-8 inline-flex items-center gap-2 text-ocre font-bold group-hover:text-clay transition-colors">
                    S&apos;inscrire à l&apos;école
                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </p>
                </div>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ LECONS / LOCATIONS ============ */}
      <section className="bg-gradient-to-b from-transparent to-cyan-pale/40">
        <div className="mx-auto max-w-6xl px-4 pb-20">
          <Reveal>
            <Link
              href="/tarifs"
              className="card-3d group block rounded-2xl border-2 border-dashed border-navy/20 bg-white/80 backdrop-blur p-8 hover:border-navy/40"
            >
              <div className="flex items-center gap-6 flex-wrap">
                <div className="rounded-full bg-navy text-white w-16 h-16 flex items-center justify-center shrink-0">
                  <IconRacketSmall className="w-8 h-8" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <h3 className="text-xl font-bold text-navy">
                    Leçons individuelles, location de courts, matériel
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Voir tous les tarifs du club — Tennis, Padel, Pickleball.
                  </p>
                </div>
                <span className="text-yellow-hover font-bold inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Voir les tarifs →
                </span>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ============ CONTACT FOOTER ============ */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-14 text-center">
          <Reveal>
            <p className="text-sm uppercase tracking-widest text-gray-500 font-bold">
              Une question ?
            </p>
            <a
              href="mailto:contact@ats-valrose.fr"
              className="mt-3 inline-block text-navy text-2xl sm:text-3xl font-extrabold hover:text-yellow-hover transition-colors"
            >
              contact@ats-valrose.fr
            </a>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

// ===== Helpers visuels =====

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-5 h-5 shrink-0 text-yellow-hover mt-0.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.18" />
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
