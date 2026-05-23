import { NextResponse } from "next/server";
import { checkAdminPassword, createAdminSession } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  if (!checkAdminPassword(body.password)) {
    return NextResponse.json(
      { error: "Mot de passe incorrect." },
      { status: 401 },
    );
  }

  await createAdminSession();
  return NextResponse.json({ ok: true });
}
