"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Header pro 2 niveaux :
 *  - topbar (info + admin)
 *  - barre principale (logo + nav avec icônes + CTA)
 *  - bandeau dégradé cyan→jaune en bas pour l'accent club
 */
export function SiteHeader() {
  const pathname = usePathname() ?? "/";

  return (
    <header className="sticky top-0 z-40">
      {/* ===== Topbar ===== */}
      <div className="bg-navy-dark text-white/70 text-[12px] border-b border-white/5">
        <div className="mx-auto max-w-6xl px-4 h-9 flex items-center justify-between gap-4">
          <div className="hidden sm:flex items-center gap-5">
            <a
              href="tel:+33493846789"
              className="inline-flex items-center gap-1.5 hover:text-yellow-club transition-colors"
            >
              <IconPhone className="w-3.5 h-3.5" />
              04&nbsp;93&nbsp;84&nbsp;67&nbsp;89
            </a>
            <a
              href="mailto:contact@ats-valrose.fr"
              className="inline-flex items-center gap-1.5 hover:text-yellow-club transition-colors"
            >
              <IconMail className="w-3.5 h-3.5" />
              contact@ats-valrose.fr
            </a>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="hidden md:inline text-white/40">
              13&nbsp;Avenue&nbsp;de&nbsp;Valrose, 06100&nbsp;Nice
            </span>
            <span className="hidden md:inline text-white/20">·</span>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-yellow-club hover:text-navy text-white/80 transition-colors font-semibold tracking-wide uppercase text-[10px]"
            >
              <IconLock className="w-3 h-3" />
              Admin
            </Link>
          </div>
        </div>
      </div>

      {/* ===== Barre principale ===== */}
      <div className="bg-navy/95 backdrop-blur text-white shadow-md">
        <div className="mx-auto max-w-6xl px-4 h-[72px] flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 group"
            aria-label="Accueil ATS Valrose"
          >
            {/* Disque blanc + halo doux pour faire ressortir le logo bleu sur fond navy */}
            <span className="relative inline-flex items-center justify-center">
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-cyan-light/30 blur-md scale-110"
              />
              <span className="relative inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow-lg ring-2 ring-cyan-light/40 transition-transform group-hover:scale-105">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-club.png"
                  alt="ATS Valrose"
                  className="h-11 sm:h-12 w-auto"
                />
              </span>
            </span>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-extrabold tracking-wide text-[15px]">
                ATS&nbsp;VALROSE
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-light font-semibold">
                Padel · Tennis · Nice
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/stages" active={isActive(pathname, "/stages")} accent="cyan">
              <IconStage className="w-4 h-4" />
              Stages
            </NavLink>
            <NavLink href="/ecole" active={isActive(pathname, "/ecole")} accent="ocre">
              <IconSchool className="w-4 h-4" />
              École
            </NavLink>
            <NavLink href="/tarifs" active={isActive(pathname, "/tarifs")}>
              <IconTag className="w-4 h-4" />
              Tarifs
            </NavLink>

            {/* CTA visible dès sm */}
            <Link
              href="/stages"
              className="hidden sm:inline-flex items-center gap-2 ml-3 px-4 py-2 rounded-lg bg-yellow-club text-navy font-bold text-[13px] shadow-md shadow-yellow-club/30 hover:bg-yellow-hover transition-colors"
            >
              S&apos;inscrire
              <span aria-hidden>→</span>
            </Link>
          </nav>
        </div>

        {/* Accent dégradé en bas */}
        <div
          className="h-[3px] w-full"
          style={{
            background:
              "linear-gradient(90deg, var(--color-cyan-club) 0%, var(--color-cyan-light) 40%, var(--color-yellow-club) 100%)",
          }}
        />
      </div>
    </header>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  href,
  children,
  active,
  accent,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  accent?: "cyan" | "ocre";
}) {
  const accentBar =
    accent === "ocre"
      ? "bg-ocre-light"
      : accent === "cyan"
        ? "bg-cyan-light"
        : "bg-yellow-club";

  const hoverText =
    accent === "ocre"
      ? "hover:text-ocre-light"
      : accent === "cyan"
        ? "hover:text-cyan-light"
        : "hover:text-yellow-club";

  return (
    <Link
      href={href}
      className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-md font-semibold transition-colors ${
        active ? "text-white" : `text-white/80 ${hoverText}`
      }`}
    >
      {children}
      {/* Indicateur actif */}
      <span
        className={`pointer-events-none absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full transition-all ${
          active ? `${accentBar} opacity-100` : "opacity-0"
        }`}
      />
    </Link>
  );
}

/* ============ Icônes (SVG inline, zéro dépendance) ============ */

function IconPhone({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 2.08 4.18 2 2 0 0 1 4.07 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.28-1.23a2 2 0 0 1 2.11-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.92Z"
      />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9 6 9-6" />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

function IconStage({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M3.5 12c2.5-3 6-5 8.5-5s6 2 8.5 5" />
      <path strokeLinecap="round" d="M3.5 12c2.5 3 6 5 8.5 5s6-2 8.5-5" />
    </svg>
  );
}

function IconSchool({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <ellipse cx="10" cy="9" rx="6" ry="7" transform="rotate(-30 10 9)" />
      <path strokeLinecap="round" d="m15 14 5 5" />
    </svg>
  );
}

function IconTag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.59 13.41 13.41 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}
