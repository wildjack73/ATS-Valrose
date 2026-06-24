import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Item = { creneauKey: string; capacite: number | null };

/**
 * Enregistre (upsert) les capacités des créneaux École pour une saison.
 * Body attendu : { saisonId, items: [{ creneauKey, capacite }] }
 *   - capacite = nombre de places, ou null = illimité.
 */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { saisonId?: string; items?: Item[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { saisonId, items } = body;
  if (!saisonId || !Array.isArray(items)) {
    return NextResponse.json(
      { error: "saisonId et items sont requis" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const rows = [];
  for (const it of items) {
    if (!it || typeof it.creneauKey !== "string" || !it.creneauKey.trim()) {
      continue;
    }
    // Capacité : entier positif, ou null (illimité). Toute autre valeur → null.
    let capacite: number | null = null;
    if (typeof it.capacite === "number" && Number.isFinite(it.capacite)) {
      capacite = Math.max(0, Math.round(it.capacite));
    }
    rows.push({
      saison_id: saisonId,
      creneau_key: it.creneauKey.trim(),
      capacite,
      updated_at: now,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "Aucun créneau valide" }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("capacites_creneaux_ecole")
    .upsert(rows, { onConflict: "saison_id,creneau_key" });

  if (error) {
    console.error("[capacites-ecole POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Les pages publiques (ISR 60 s) reflètent les nouvelles places immédiatement.
  revalidatePath("/ecole");
  revalidatePath("/cours");

  return NextResponse.json({ ok: true, count: rows.length });
}
