import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface ClientTag {
  type: "stage" | "ecole";
  saison: string;       // ex: "2026-2027" ou "2025-2026 (archives)"
  source: "historique" | "current";
  label: string;
  color: string;        // hex
  count: number;
}

export interface ClientRow {
  key: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal_ville: string | null;
  niveau: string | null;
  date_naissance: string | null;
  tags: ClientTag[];
  inscriptions_count: number;
  last_activity: string | null;   // ISO date
  total_prix: number;
}

function normalizeEmail(e: string | null | undefined): string | null {
  if (!e) return null;
  const trimmed = e.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function buildKey(
  email: string | null,
  nom: string | null,
  prenom: string | null,
): string {
  if (email) return `email:${email}`;
  const n = (nom ?? "").trim().toLowerCase();
  const p = (prenom ?? "").trim().toLowerCase();
  return `np:${n}|${p}`;
}

interface Source {
  id: string;
  type: "stage" | "ecole";
  source: "historique" | "current";
  saison: string;
  saisonLabel: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal_ville: string | null;
  niveau: string | null;
  date_naissance: string | null;
  prix_total: number;
  activity_at: string | null;
}

export async function fetchAnnuaireClients(): Promise<ClientRow[]> {
  const supa = getSupabaseAdmin();

  // Saison label depuis le code de saison
  const { data: saisonsData } = await supa.from("saisons").select("id, code, label");
  const saisonLabelById = new Map<string, string>(
    (saisonsData ?? []).map((s) => [s.id as string, s.label as string]),
  );

  const sources: Source[] = [];

  // 1. Inscriptions stages (current)
  const { data: stagesC } = await supa
    .from("inscriptions_stages")
    .select(
      "id, saison_id, nom, prenom, email, telephone, adresse, niveau, niveau_attribue, date_naissance, prix_total, created_at",
    );
  for (const s of stagesC ?? []) {
    const r = s as Record<string, unknown>;
    sources.push({
      id: r.id as string,
      type: "stage",
      source: "current",
      saison: (saisonLabelById.get(r.saison_id as string) ?? "Saison courante"),
      saisonLabel:
        saisonLabelById.get(r.saison_id as string) ?? "Saison courante",
      nom: (r.nom as string) ?? null,
      prenom: (r.prenom as string) ?? null,
      email: (r.email as string) ?? null,
      telephone: (r.telephone as string) ?? null,
      adresse: (r.adresse as string) ?? null,
      code_postal_ville: null,
      // On privilégie le niveau attribué par le prof, sinon le déclaré
      niveau:
        (r.niveau_attribue as string) || (r.niveau as string) || null,
      date_naissance: (r.date_naissance as string) ?? null,
      prix_total: (r.prix_total as number) ?? 0,
      activity_at: (r.created_at as string) ?? null,
    });
  }

  // 2. Inscriptions école (current)
  const { data: ecoleC } = await supa
    .from("inscriptions_ecole")
    .select(
      "id, saison_id, nom, prenom, email, telephone, adresse, code_postal_ville, niveau, niveau_attribue, date_naissance, prix_total, created_at",
    );
  for (const e of ecoleC ?? []) {
    const r = e as Record<string, unknown>;
    sources.push({
      id: r.id as string,
      type: "ecole",
      source: "current",
      saison:
        saisonLabelById.get(r.saison_id as string) ?? "Saison courante",
      saisonLabel:
        saisonLabelById.get(r.saison_id as string) ?? "Saison courante",
      nom: (r.nom as string) ?? null,
      prenom: (r.prenom as string) ?? null,
      email: (r.email as string) ?? null,
      telephone: (r.telephone as string) ?? null,
      adresse: (r.adresse as string) ?? null,
      code_postal_ville: (r.code_postal_ville as string) ?? null,
      // On privilégie le niveau attribué par le prof, sinon le déclaré
      niveau:
        (r.niveau_attribue as string) || (r.niveau as string) || null,
      date_naissance: (r.date_naissance as string) ?? null,
      prix_total: (r.prix_total as number) ?? 0,
      activity_at: (r.created_at as string) ?? null,
    });
  }

  // 3. Inscriptions stages historique
  const { data: stagesH } = await supa
    .from("inscriptions_stages_historique")
    .select(
      "id, source, nom, prenom, email, telephone, adresse, niveau, date_naissance, prix_estime, horodateur, imported_at",
    );
  for (const s of stagesH ?? []) {
    const r = s as Record<string, unknown>;
    const sourceFile = (r.source as string) ?? "";
    const saisonLabel = sourceFile.includes("2025-2026")
      ? "Saison 2025-2026"
      : sourceFile.includes("2024-2025")
        ? "Saison 2024-2025"
        : "Archives";
    sources.push({
      id: r.id as string,
      type: "stage",
      source: "historique",
      saison: saisonLabel,
      saisonLabel,
      nom: (r.nom as string) ?? null,
      prenom: (r.prenom as string) ?? null,
      email: (r.email as string) ?? null,
      telephone: (r.telephone as string) ?? null,
      adresse: (r.adresse as string) ?? null,
      code_postal_ville: null,
      niveau: (r.niveau as string) ?? null,
      date_naissance: (r.date_naissance as string) ?? null,
      prix_total: (r.prix_estime as number) ?? 0,
      activity_at:
        (r.horodateur as string) ?? (r.imported_at as string) ?? null,
    });
  }

  // 4. Inscriptions école historique
  const { data: ecoleH } = await supa
    .from("inscriptions_ecole_historique")
    .select(
      "id, source, nom, prenom, email, telephone, adresse, code_postal_ville, niveau, date_naissance, prix_estime, horodateur, imported_at",
    );
  for (const e of ecoleH ?? []) {
    const r = e as Record<string, unknown>;
    const sourceFile = (r.source as string) ?? "";
    const saisonLabel = sourceFile.includes("2025-2026")
      ? "Saison 2025-2026"
      : sourceFile.includes("2024-2025")
        ? "Saison 2024-2025"
        : "Archives";
    sources.push({
      id: r.id as string,
      type: "ecole",
      source: "historique",
      saison: saisonLabel,
      saisonLabel,
      nom: (r.nom as string) ?? null,
      prenom: (r.prenom as string) ?? null,
      email: (r.email as string) ?? null,
      telephone: (r.telephone as string) ?? null,
      adresse: (r.adresse as string) ?? null,
      code_postal_ville: (r.code_postal_ville as string) ?? null,
      niveau: (r.niveau as string) ?? null,
      date_naissance: (r.date_naissance as string) ?? null,
      prix_total: (r.prix_estime as number) ?? 0,
      activity_at:
        (r.horodateur as string) ?? (r.imported_at as string) ?? null,
    });
  }

  // ---- Dédoublonnage par email (ou nom+prénom si pas d'email) ----
  const byKey = new Map<string, ClientRow>();
  for (const s of sources) {
    const email = normalizeEmail(s.email);
    const key = buildKey(email, s.nom, s.prenom);

    let client = byKey.get(key);
    if (!client) {
      client = {
        key,
        nom: s.nom ?? "",
        prenom: s.prenom ?? "",
        email,
        telephone: s.telephone,
        adresse: s.adresse,
        code_postal_ville: s.code_postal_ville,
        niveau: s.niveau,
        date_naissance: s.date_naissance,
        tags: [],
        inscriptions_count: 0,
        last_activity: null,
        total_prix: 0,
      };
      byKey.set(key, client);
    }

    // Mettre à jour les champs avec les infos les plus récentes / non vides
    if (!client.email && email) client.email = email;
    if (!client.telephone && s.telephone) client.telephone = s.telephone;
    if (!client.adresse && s.adresse) client.adresse = s.adresse;
    if (!client.code_postal_ville && s.code_postal_ville)
      client.code_postal_ville = s.code_postal_ville;
    if (s.niveau) client.niveau = s.niveau; // on garde le plus récent
    if (s.date_naissance && !client.date_naissance)
      client.date_naissance = s.date_naissance;

    client.inscriptions_count += 1;
    client.total_prix += s.prix_total;

    // Tag pour (type, saison)
    const tagKey = `${s.type}|${s.saison}`;
    let tag = client.tags.find((t) => `${t.type}|${t.saison}` === tagKey);
    if (!tag) {
      const color = s.type === "stage" ? "#2db5d6" : "#c4733a";
      tag = {
        type: s.type,
        saison: s.saison,
        source: s.source,
        label: `${s.type === "stage" ? "Stages" : "École"} ${s.saisonLabel.replace("Saison ", "")}`,
        color,
        count: 0,
      };
      client.tags.push(tag);
    }
    tag.count += 1;

    // Date d'activité la plus récente
    if (s.activity_at) {
      if (!client.last_activity || s.activity_at > client.last_activity) {
        client.last_activity = s.activity_at;
      }
    }
  }

  // Tri par dernière activité (récent d'abord), puis nom
  const result = Array.from(byKey.values());
  result.sort((a, b) => {
    if (a.last_activity && b.last_activity) {
      return b.last_activity.localeCompare(a.last_activity);
    }
    if (a.last_activity) return -1;
    if (b.last_activity) return 1;
    return a.nom.localeCompare(b.nom);
  });

  // Tri les tags de chaque client par saison (plus récent d'abord)
  for (const c of result) {
    c.tags.sort((a, b) => b.saison.localeCompare(a.saison));
  }

  return result;
}
