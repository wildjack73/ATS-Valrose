"use client";

import { useEffect } from "react";

/**
 * Écran d'erreur global (App Router). Remplace le « This page couldn't load »
 * brut de Vercel par un message clair + bouton Réessayer, au cas où une
 * page planterait malgré le retry réseau côté Supabase.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Visible dans les logs Vercel (et Sentry si configuré)
    console.error("Erreur page:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-ocre/10 text-ocre">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-7 w-7"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-navy">
          Oups, une erreur est survenue
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          La page n&apos;a pas pu se charger. C&apos;est généralement
          temporaire — réessaie, ça devrait repartir.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-ocre px-5 py-2.5 font-bold text-white text-sm hover:bg-ocre-dark transition"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="rounded-lg border border-gray-300 px-5 py-2.5 font-bold text-navy text-sm hover:border-navy transition"
          >
            Retour à l&apos;accueil
          </a>
        </div>
        <p className="mt-6 text-xs text-gray-400">
          Si le problème persiste,{" "}
          <a
            className="underline hover:text-navy"
            href="https://padel-tennis-nice.fr/contact-padel-tennis-nice/"
            target="_blank"
            rel="noopener noreferrer"
          >
            contactez le club
          </a>
          .
        </p>
      </div>
    </div>
  );
}
