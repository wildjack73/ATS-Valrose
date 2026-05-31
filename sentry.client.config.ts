// Initialisation Sentry côté navigateur. Capte les erreurs JS des
// composants client (admin tables, formulaires, etc.).
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "dev",
    // Pas de session replay : économise le quota et la bande passante des
    // visiteurs. À activer si tu veux voir les sessions plus tard.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
