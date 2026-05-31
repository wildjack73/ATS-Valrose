import { NextResponse } from "next/server";
import { checkAdminPassword, createAdminSession } from "@/lib/admin/auth";
import {
  checkLoginRateLimit,
  recordLoginAttempt,
  getRequestIp,
} from "@/lib/admin/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = getRequestIp(request);

  // 1. Vérifier si l'IP est bloquée (rate-limit)
  const limit = await checkLoginRateLimit(ip);
  if (limit.blocked) {
    return NextResponse.json(
      {
        error: `Trop de tentatives. Réessaie dans ${Math.ceil(
          (limit.retryAfterSeconds ?? 60) / 60,
        )} minutes.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSeconds ?? 60),
        },
      },
    );
  }

  // 2. Parser le body
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requête invalide." },
      { status: 400 },
    );
  }

  if (!body.password || typeof body.password !== "string") {
    return NextResponse.json(
      { error: "Mot de passe requis." },
      { status: 400 },
    );
  }

  // 3. Tester le mot de passe + journaliser la tentative
  const ok = checkAdminPassword(body.password);
  // Fire-and-forget : on n'attend pas la fin pour répondre (latence mini)
  void recordLoginAttempt(ip, ok);

  if (!ok) {
    return NextResponse.json(
      { error: "Mot de passe incorrect." },
      { status: 401 },
    );
  }

  await createAdminSession();
  return NextResponse.json({ ok: true });
}
