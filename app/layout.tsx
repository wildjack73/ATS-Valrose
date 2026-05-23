import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inscriptions — ATS Valrose",
  description:
    "Inscriptions en ligne aux stages de tennis et à l'école de tennis ATS Valrose à Nice.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-40 bg-navy/95 backdrop-blur text-white shadow-sm border-b border-white/5">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="flex items-center gap-3 group"
              aria-label="Accueil ATS Valrose"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-club.png"
                alt="ATS Valrose"
                className="h-10 w-auto sm:h-12 transition-transform group-hover:scale-105"
              />
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="font-bold tracking-wide">ATS&nbsp;VALROSE</span>
                <span className="text-[10px] uppercase tracking-widest text-white/60">
                  Padel · Tennis · Nice
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2 text-sm">
              <NavLink href="/stages" accent="cyan">
                Stages
              </NavLink>
              <NavLink href="/ecole" accent="ocre">
                École
              </NavLink>
              <NavLink href="/tarifs">Tarifs</NavLink>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-navy-dark text-white/80 text-sm border-t border-white/5">
          <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div>
              <p className="font-bold text-white">ATS&nbsp;Valrose</p>
              <p className="text-xs text-white/60 mt-0.5">
                © {new Date().getFullYear()} — Tennis &amp; Padel à Nice
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <a
                href="mailto:contact@ats-valrose.fr"
                className="hover:text-yellow-club transition-colors"
              >
                contact@ats-valrose.fr
              </a>
              <span className="text-white/20">·</span>
              <Link
                href="/admin"
                className="text-white/40 hover:text-white transition-colors"
              >
                Admin
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({
  href,
  children,
  accent,
}: {
  href: string;
  children: React.ReactNode;
  accent?: "cyan" | "ocre";
}) {
  const hover =
    accent === "ocre"
      ? "hover:text-ocre-light"
      : accent === "cyan"
        ? "hover:text-cyan-light"
        : "hover:text-yellow-club";
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-white/85 ${hover} hover:bg-white/5 transition-colors font-medium`}
    >
      {children}
    </Link>
  );
}
