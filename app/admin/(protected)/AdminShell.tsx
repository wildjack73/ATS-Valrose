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
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              title={dark ? "Mode clair" : "Mode sombre"}
              aria-label={dark ? "Activer le mode clair" : "Activer le mode sombre"}
              className="rounded-md bg-white/10 hover:bg-white/20 px-2.5 py-1.5 text-base transition leading-none"
            >
              {dark ? "☀️" : "🌙"}
            </button>
            <LogoutButton />
          </div>
        </div>
      </div>
      {/* Bandeau de bienvenue (caché à l'impression).
          En mode sombre on garde un visuel sobre navy/jaune au lieu du
          gradient jaune trop éclatant qui clashait avec le dark. */}
      <div className="no-print mx-auto max-w-6xl px-4 pt-4">
        <div
          className={`rounded-xl px-5 py-3 shadow-sm flex items-center gap-3 flex-wrap border ${
            dark
              ? "bg-[#1a2b42] border-yellow-club/30 text-white"
              : "bg-gradient-to-r from-yellow-club via-yellow-200 to-yellow-club text-navy border-transparent"
          }`}
        >
          <span className="text-2xl" aria-hidden>
            👋
          </span>
          <div className="flex-1 min-w-[200px]">
            <p className="font-extrabold text-base sm:text-lg leading-tight">
              Bienvenue{" "}
              <span className={dark ? "text-yellow-club" : ""}>Jérôme</span>
            </p>
            <p
              className={`text-xs sm:text-sm ${dark ? "text-white/65" : "text-navy/80"}`}
            >
              best coach ever 🏆
            </p>
          </div>
          <span className="text-2xl" aria-hidden>
            🎾
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
