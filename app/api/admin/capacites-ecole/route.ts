import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Item = { creneauKey: string; capacite: number | null };

/**
 * Remplace l'ensemble des capacités (overrides) des créneaux École d'une saison.
 * Body attendu : { saisonId, items: [{ creneauKey, capacite }] }
 *   - items = UNIQUEMENT les écarts au défaut du code (un créneau resté à sa
 *     valeur par défaut n'a pas de ligne).
 *   - capacite = nombre de places, ou null = illimité.
 *
 * Stratégie : on supprime toutes les lignes de la saison puis on insère les
 * overrides fournis. Ainsi, retirer un override supprime bien sa ligne.
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
  const seen = new Set<string>();
  const rows = [];
  for (const it of items) {
    if (!it || typeof it.creneauKey !== "string" || !it.creneauKey.trim()) {
      continue;
    }
    const key = it.creneauKey.trim();
    if (seen.has(key)) continue; // dédoublonnage défensif
    seen.add(key);
    // Capacité : entier positif, ou null (illimité). Toute autre valeur → null.
    let capacite: number | null = null;
    if (typeof it.capacite === "number" && Number.isFinite(it.capacite)) {
      capacite = Math.max(0, Math.round(it.capacite));
    }
    rows.push({
      saison_id: saisonId,
      creneau_key: key,
      capacite,
      updated_at: now,
    });
  }

  const supa = getSupabaseAdmin();

  // 1) Purge des overrides existants de la saison.
  const { error: delError } = await supa
    .from("capacites_creneaux_ecole")
    .delete()
    .eq("saison_id", saisonId);
  if (delError) {
    console.error("[capacites-ecole POST] delete", delError);
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  // 2) Insertion des overrides fournis (le cas « tout par défaut » est valide).
  if (rows.length > 0) {
    const { error: insError } = await supa
      .from("capacites_creneaux_ecole")
      .insert(rows);
    if (insError) {
      console.error("[capacites-ecole POST] insert", insError);
      return NextResponse.json({ error: insError.message }, { status: 500 });
    }
  }

  // Les pages publiques (ISR 60 s) reflètent les nouvelles places immédiatement.
  revalidatePath("/ecole");
  revalidatePath("/cours");

  return NextResponse.json({ ok: true, count: rows.length });
}
