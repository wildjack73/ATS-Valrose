import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getActiveSaison } from "@/lib/data/tarifs-server";
import { saveHorairesEcole } from "@/lib/data/horaires-ecole-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON attendu" }, { status: 400 });
  }

  const rawEntries = (body as { entries?: unknown })?.entries;
  if (!Array.isArray(rawEntries)) {
    return NextResponse.json({ error: "entries manquant" }, { status: 400 });
  }
  const entries = rawEntries
    .filter(
      (e): e is { cle: string; horaire: string } =>
        !!e &&
        typeof (e as { cle?: unknown }).cle === "string" &&
        typeof (e as { horaire?: unknown }).horaire === "string",
    )
    .map((e) => ({ cle: e.cle, horaire: e.horaire }));

  const saison = await getActiveSaison("ecole");
  if (!saison) {
    return NextResponse.json(
      { error: "Aucune saison école active." },
      { status: 500 },
    );
  }

  try {
    const n = await saveHorairesEcole(saison.id, entries);
    return NextResponse.json({ ok: true, saved: n });
  } catch (err) {
    console.error("[horaires] save:", err);
    return NextResponse.json(
      { error: "Échec de l'enregistrement." },
      { status: 500 },
    );
  }
}
