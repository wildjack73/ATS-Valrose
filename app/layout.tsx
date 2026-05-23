import type { Metadata } from "next";
import Image from "next/image";
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
        <header className="bg-navy text-white">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo-club.png"
                alt="ATS Valrose"
                width={48}
                height={48}
                priority
                className="h-10 w-auto sm:h-12"
              />
              <span className="hidden sm:inline font-bold tracking-wide">
                ATS VALROSE
              </span>
            </Link>
            <nav className="text-sm flex items-center gap-5">
              <Link
                href="/stages"
                className="text-white/80 hover:text-yellow-club transition-colors"
              >
                Stages
              </Link>
              <Link
                href="/ecole"
                className="text-white/80 hover:text-ocre-light transition-colors"
              >
                École
              </Link>
              <Link
                href="/tarifs"
                className="text-white/80 hover:text-yellow-club transition-colors"
              >
                Tarifs
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-navy-dark text-white/80 text-sm">
          <div className="mx-auto max-w-5xl px-4 py-6 flex flex-col sm:flex-row gap-2 justify-between">
            <span>© {new Date().getFullYear()} ATS Valrose — Nice</span>
            <a
              href="mailto:contact@ats-valrose.fr"
              className="hover:text-yellow-club"
            >
              contact@ats-valrose.fr
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
