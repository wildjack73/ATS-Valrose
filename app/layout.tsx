import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";

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
        <SiteHeader />

        <main className="flex-1">{children}</main>

        <footer className="bg-navy-dark text-white/80 text-sm border-t border-white/5">
          <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div>
              <p className="font-bold text-white">ATS&nbsp;Valrose</p>
              <p className="text-xs text-white/60 mt-0.5">
                © {new Date().getFullYear()} — Tennis &amp; Padel à Nice ·{" "}
                <a
                  href="https://padel-tennis-nice.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-yellow-club transition-colors"
                >
                  padel-tennis-nice.fr
                </a>
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <a
                href="https://padel-tennis-nice.fr/contact-padel-tennis-nice/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-yellow-club transition-colors"
              >
                Contact
              </a>
              <span className="text-white/20">·</span>
              <a
                href="https://padel-tennis-nice.fr/reservation-padel-tennis-nice-valrose/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-yellow-club transition-colors"
              >
                Réserver
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

