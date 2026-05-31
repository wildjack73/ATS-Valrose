// Initialisation Sentry côté Edge runtime (middleware, etc.).
// On a actuellement aucune route en Edge runtime (toutes en nodejs) mais
// le SDK Sentry l'attend pour ne rien rater plus tard.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "dev",
  });
}
