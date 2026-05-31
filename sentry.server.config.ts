// Initialisation Sentry côté serveur (Node.js runtime).
// Le DSN est lu depuis NEXT_PUBLIC_SENTRY_DSN (variable d'env Vercel) :
// si elle est vide, Sentry est désactivé silencieusement (utile en dev local
// pour ne pas envoyer de bruit).
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // En prod on capte 10% des transactions (perf). À ton volume (petit
    // club), ça reste très en dessous du quota gratuit de 5k erreurs/mois.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    // Pas de profiling, pas de session replay côté serveur
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "dev",
  });
}
