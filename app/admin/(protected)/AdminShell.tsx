"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LogoutButton from "../LogoutButton";

/**
 * Wrapper client de l'admin : gère le mode sombre (toggle + persistance
 * localStorage) en ajoutant la classe `admin-dark` sur le wrapper root.
 * Le mode sombre est scopé à l'admin uniquement (le site public reste clair).
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Lecture localStorage au montage
    const stored = localStorage.getItem("ats-admin-dark");
    if (stored === "1") setDark(true);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("ats-admin-dark", dark ? "1" : "0");
  }, [dark, mounted]);

  return (
    <div
      className={`min-h-screen ${dark ? "admin-dark" : "bg-gray-50"}`}
    >
      <div
        className={`no-print ${dark ? "admin-dark-topbar border-b border-white/5" : "bg-navy"} text-white`}
      >
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="font-bold">Admin ATS Valrose</span>
            <nav className="hidden sm:flex items-center gap-3 text-white/80">
              <Link className="hover:text-yellow-club" href="/admin">
                Tableau de bord
              </Link>
              <Link className="hover:text-yellow-club" href="/admin?tab=stages">
                Stages
              </Link>
              <Link className="hover:text-yellow-club" href="/admin?tab=ecole">
                École
              </Link>
              <Link
                className="hover:text-yellow-club text-yellow-club/90"
                href="/admin/affectation-padel"
              >
                Affectation padel
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              title={dark ? "Mode clair" : "Mode sombre"}
              aria-label={
                dark ? "Activer le mode clair" : "Activer le mode sombre"
              }
              className="rounded-md bg-white/10 hover:bg-white/20 p-1.5 transition leading-none"
            >
              {dark ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="4" />
                  <path
                    strokeLinecap="round"
                    d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
                  />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                  aria-hidden
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
