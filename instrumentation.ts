// Hook Next.js qui s'exécute au démarrage du serveur (nodejs ou edge).
// On y branche Sentry pour capturer les erreurs serveur.
// Doc : https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Forward des erreurs Server Components non-catchées vers Sentry (utile pour
// le 500 que tu voyais sur /admin). On déclare un onRequestError minimal qui
// délègue à Sentry seulement si le DSN est défini.
import * as Sentry from "@sentry/nextjs";

type RequestErrorContext = {
  routerKind: "Pages Router" | "App Router";
  routePath: string;
  routeType: "render" | "route" | "action" | "middleware";
};

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string> },
  context: RequestErrorContext,
) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(err, {
      tags: {
        route: context.routePath,
        routeType: context.routeType,
      },
      extra: {
        path: request.path,
        method: request.method,
      },
    });
  }
}
