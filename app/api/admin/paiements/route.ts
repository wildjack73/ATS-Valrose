import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MOYENS = ["especes", "cheque", "virement", "cb", "autre"] as const;

interface PostBody {
  inscription_type?: "stages" | "ecole";
  inscription_id?: string;
  montant?: number;
  moyen?: string;
  reference?: string | null;
  date_paiement?: string;
  notes?: string | null;
}

/** GET /api/admin/paiements?inscription_type=stages&inscription_id=... */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const url = new URL(request.url);
  const type = url.searchParams.get("inscription_type");
  const id = url.searchParams.get("inscription_id");
  if (!type || !id || (type !== "stages" && type !== "ecole")) {
    return NextResponse.json(
      { error: "Paramètres requis : inscription_type (stages|ecole), inscription_id" },
      { status: 400 },
    );
  }
  const col = type === "stages" ? "inscription_stage_id" : "inscription_ecole_id";
  const { data, error } = await getSupabaseAdmin()
    .from("paiements")
    .select("*")
    .eq(col, id)
    .order("date_paiement", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ paiements: data ?? [] });
}

/** POST /api/admin/paiements — crée un paiement */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  if (
    !body.inscription_type ||
    !body.inscription_id ||
    body.montant === undefined ||
    !body.moyen
  ) {
    return NextResponse.json(
      {
        error:
          "Champs requis : inscription_type (stages|ecole), inscription_id, montant, moyen",
      },
      { status: 400 },
    );
  }
  if (body.inscription_type !== "stages" && body.inscription_type !== "ecole") {
    return NextResponse.json(
      { error: "inscription_type doit être 'stages' ou 'ecole'" },
      { status: 400 },
    );
  }
  const montant = Math.round(Number(body.montant));
  if (!Number.isFinite(montant) || montant <= 0) {
    return NextResponse.json({ error: "Montant invalide (> 0 en euros)" }, { status: 400 });
  }
  if (!MOYENS.includes(body.moyen as (typeof MOYENS)[number])) {
    return NextResponse.json(
      { error: `Moyen invalide. Valeurs autorisées : ${MOYENS.join(", ")}` },
      { status: 400 },
    );
  }

  const insertRow: Record<string, unknown> = {
    montant,
    moyen: body.moyen,
    reference: body.reference?.trim() || null,
    date_paiement: body.date_paiement || new Date().toISOString().slice(0, 10),
    notes: body.notes?.trim() || null,
  };
  if (body.inscription_type === "stages") {
    insertRow.inscription_stage_id = body.inscription_id;
  } else {
    insertRow.inscription_ecole_id = body.inscription_id;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("paiements")
    .insert(insertRow)
    .select("*")
    .single();

  if (error) {
    console.error("POST paiements:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, paiement: data });
}
