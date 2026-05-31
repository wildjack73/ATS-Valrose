import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

// Wrap avec Sentry pour activer le tunneling et la collecte d'erreurs
// build-time. Si SENTRY_AUTH_TOKEN n'est pas défini, le wrapping n'envoie
// rien (mode dev). En prod sur Vercel, configurer ces 3 vars dans
// l'interface :
//   NEXT_PUBLIC_SENTRY_DSN  = https://xxx@yyy.ingest.sentry.io/zzz
//   SENTRY_ORG              = ton-org
//   SENTRY_PROJECT          = ats-valrose
//   SENTRY_AUTH_TOKEN       = sntrys_xxxx (depuis Settings → Auth Tokens)
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Suppression silencieuse des logs si le DSN manque (build local sans
  // setup Sentry).
  silent: !process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Tunnel les requêtes Sentry via une route Next pour contourner les
  // ad-blockers (sinon les erreurs côté client peuvent être perdues).
  tunnelRoute: "/monitoring",
  // Pas d'upload des source maps si pas de token (évite les erreurs en dev)
  widenClientFileUpload: true,
  disableLogger: true,
});
