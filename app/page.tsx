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

        {/* === DESKTOP : boutons absolus dans les coins du hero ============ */}
        {/* Le wrapper absolu couvre toute la section. Les 2 boutons et la
            balle sont positionnés verticalement à 50% (alignés avec le
            titre), horizontalement aux extrémités. */}
        <div
          aria-hidden="false"
          className="hidden md:block absolute inset-0 pointer-events-none animate-fade-in-up"
          style={{ animationDelay: "400ms" }}
        >
          <div className="relative h-full max-w-[1500px] mx-auto px-6 sm:px-10 lg:px-20">
            <Link
              href="/stages"
              className="impact-pulse-left group absolute left-6 sm:left-10 lg:left-20 top-1/2 -translate-y-1/2 pointer-events-auto z-20 inline-flex items-center gap-2 rounded-xl bg-yellow-club text-navy px-8 py-4 font-bold text-lg shadow-2xl shadow-yellow-club/40 hover:shadow-yellow-club/60 transition-all hover:-translate-y-[calc(50%+2px)]"
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
              className="impact-pulse-right group absolute right-6 sm:right-10 lg:right-20 top-1/2 -translate-y-1/2 pointer-events-auto z-20 inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white px-8 py-4 font-bold text-lg border border-white/20 backdrop-blur-sm transition-all hover:-translate-y-[calc(50%+2px)]"
            >
              <span className="inline-flex items-center gap-2">
                S&apos;inscrire à l&apos;école
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>

            {/* Rally ball entre les 2 boutons, même niveau vertical */}
            <div className="absolute inset-x-6 sm:inset-x-10 lg:inset-x-20 top-1/2 -translate-y-1/2 h-0">
              <div className="rally-x">
                <div className="rally-y">
                  <RallyBall />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === Bloc texte centré (badge + titre + paragraphe) — max-w-6xl */}
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28 lg:py-32 text-center">
          <p className="animate-fade-in-up mb-6">
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-[0.25em] text-yellow-club font-bold px-4 py-1.5 rounded-full bg-navy-dark/60 backdrop-blur-sm border border-yellow-club/40 shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-club animate-pulse-slow" />
              Saison 2026-2027
            </span>
          </p>

          <h1
            className="animate-fade-in-up text-5xl sm:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-tight"
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
            className="animate-fade-in-up mt-8 text-lg sm:text-2xl text-white/85 max-w-2xl mx-auto leading-relaxed"
            style={{ animationDelay: "250ms" }}
          >
            Stages de vacances et école de tennis. Tennis, padel, pickleball,
            multi-activités. Encadré par des moniteurs diplômés d&apos;État.
          </p>

          {/* === MOBILE : boutons en flow normal sous le paragraphe === */}
          <div
            className="md:hidden animate-fade-in-up mt-10 flex flex-wrap gap-4 justify-center"
            style={{ animationDelay: "400ms" }}
          >
            <Link
              href="/stages"
              className="impact-pulse-left group relative overflow-visible rounded-xl bg-yellow-club text-navy px-8 py-4 font-bold text-base shadow-2xl shadow-yellow-club/40 hover:shadow-yellow-club/60 transition-all hover:-translate-y-0.5"
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
              className="impact-pulse-right group rounded-xl bg-white/10 hover:bg-white/20 text-white px-8 py-4 font-bold text-base border border-white/20 backdrop-blur-sm transition-all hover:-translate-y-0.5"
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

      {/* ============ RÉSERVATION + CONTACT ============ */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-14 text-center">
          <Reveal>
            <p className="text-sm uppercase tracking-widest text-gray-500 font-bold">
              Vous voulez réserver ou poser une question ?
            </p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <a
                href="https://padel-tennis-nice.fr/reservation-padel-tennis-nice-valrose/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-navy text-white px-6 py-3 font-bold hover:bg-navy-dark transition shadow-md"
              >
                Réserver un terrain ou un coaching →
              </a>
              <a
                href="https://padel-tennis-nice.fr/contact-padel-tennis-nice/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-white text-navy border-2 border-navy px-6 py-3 font-bold hover:bg-navy hover:text-white transition"
              >
                Nous contacter →
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ LIEN VERS LE SITE PRINCIPAL ============ */}
      <section className="bg-navy-dark text-white/75 border-t border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm">
          <p>
            Découvrez l&apos;intégralité du club, l&apos;équipe, les actualités
            et toutes les activités sur le site officiel :{" "}
            <a
              href="https://padel-tennis-nice.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-club hover:text-yellow-hover hover:underline font-bold"
            >
              padel-tennis-nice.fr →
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

// ===== Helpers visuels =====

function RallyBall() {
  return (
    <svg
      viewBox="0 0 80 80"
      className="w-10 h-10 drop-shadow-[0_6px_14px_rgba(180,200,40,0.6)]"
      aria-hidden="true"
    >
      <defs>
        {/* Gradient radial pour l'effet 3D (clair en haut-gauche → sombre en bas-droite) */}
        <radialGradient id="rb-grad" cx="35%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#f6fc7d" />
          <stop offset="55%" stopColor="#c8d935" />
          <stop offset="100%" stopColor="#8aa01f" />
        </radialGradient>
        {/* Gradient pour le reflet brillant */}
        <radialGradient id="rb-shine" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Boule */}
      <circle cx="40" cy="40" r="34" fill="url(#rb-grad)" />

      {/* Couture en S — la signature visuelle d'une balle de tennis */}
      <path
        d="M 10 32 Q 26 50 40 40 T 70 32"
        stroke="white"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.95"
      />

      {/* Reflet brillant en haut-gauche pour effet 3D */}
      <ellipse cx="29" cy="24" rx="12" ry="6" fill="url(#rb-shine)" />
    </svg>
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
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      {/* Boule */}
      <circle cx="40" cy="40" r="34" fill="currentColor" />
      {/* Anneau subtil pour effet 3D bombé */}
      <circle
        cx="40"
        cy="40"
        r="34"
        fill="none"
        stroke="white"
        strokeWidth="1"
        opacity="0.4"
      />
      {/* Couture en S — signature visuelle d'une balle de tennis */}
      <path
        d="M 8 32 Q 26 50 40 40 T 72 32"
        stroke="white"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* Brillance en haut-gauche */}
      <ellipse
        cx="28"
        cy="22"
        rx="11"
        ry="5"
        fill="white"
        opacity="0.35"
      />
    </svg>
  );
}

function IconRacket({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g transform="rotate(-30 32 32)">
        {/* Cadre (tête de raquette ovale) */}
        <ellipse
          cx="32"
          cy="20"
          rx="14"
          ry="17"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        {/* Cordage vertical */}
        <line x1="22" y1="6" x2="22" y2="34" stroke="currentColor" strokeWidth="1.2" />
        <line x1="27" y1="4" x2="27" y2="36" stroke="currentColor" strokeWidth="1.2" />
        <line x1="32" y1="3" x2="32" y2="37" stroke="currentColor" strokeWidth="1.2" />
        <line x1="37" y1="4" x2="37" y2="36" stroke="currentColor" strokeWidth="1.2" />
        <line x1="42" y1="6" x2="42" y2="34" stroke="currentColor" strokeWidth="1.2" />
        {/* Cordage horizontal */}
        <line x1="19" y1="11" x2="45" y2="11" stroke="currentColor" strokeWidth="1.2" />
        <line x1="18" y1="16" x2="46" y2="16" stroke="currentColor" strokeWidth="1.2" />
        <line x1="18" y1="22" x2="46" y2="22" stroke="currentColor" strokeWidth="1.2" />
        <line x1="19" y1="28" x2="45" y2="28" stroke="currentColor" strokeWidth="1.2" />
        {/* Cœur de raquette (Y) */}
        <path
          d="M 25 36 Q 32 42 32 44 Q 32 42 39 36"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinejoin="round"
        />
        {/* Manche */}
        <rect x="30" y="42" width="4" height="18" rx="1.5" fill="currentColor" />
        {/* Pommeau */}
        <rect x="29" y="58" width="6" height="3" rx="1" fill="currentColor" />
      </g>
    </svg>
  );
}

function IconRacketSmall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <g transform="rotate(-30 20 20)">
        {/* Cadre */}
        <ellipse
          cx="20"
          cy="13"
          rx="9"
          ry="11"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        {/* Cordage en croix */}
        <line x1="20" y1="3" x2="20" y2="24" stroke="currentColor" strokeWidth="1" />
        <line x1="14" y1="9" x2="26" y2="9" stroke="currentColor" strokeWidth="1" />
        <line x1="13" y1="13" x2="27" y2="13" stroke="currentColor" strokeWidth="1" />
        <line x1="14" y1="17" x2="26" y2="17" stroke="currentColor" strokeWidth="1" />
        {/* Cœur */}
        <path
          d="M 16 23 Q 20 28 20 29 Q 20 28 24 23"
          stroke="currentColor"
          strokeWidth="1.8"
          fill="none"
          strokeLinejoin="round"
        />
        {/* Manche */}
        <rect x="18.5" y="27" width="3" height="11" rx="1" fill="currentColor" />
      </g>
    </svg>
  );
}
