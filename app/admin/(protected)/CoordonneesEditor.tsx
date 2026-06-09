"use client";

import { useEffect, useState } from "react";

/**
 * Bloc d'édition des coordonnées d'une inscription (prénom, nom, date de
 * naissance, téléphone, email, adresse — + code postal/ville pour l'école).
 * Réutilisé par StagesTable et EcoleTable dans le panneau déplié.
 * Enregistre via le `patch` fourni (→ PATCH /api/admin/inscriptions/...).
 */
type Coord = {
  prenom: string;
  nom: string;
  date_naissance: string;
  telephone: string;
  email: string;
  adresse: string;
  code_postal_ville: string;
};

function dateInput(v: unknown): string {
  const s = String(v ?? "");
  return s.length >= 10 ? s.slice(0, 10) : "";
}

export interface CoordRow {
  prenom?: string | null;
  nom?: string | null;
  date_naissance?: string | null;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  code_postal_ville?: string | null;
}

export default function CoordonneesEditor({
  row,
  patch,
  pending,
  withCodePostal = false,
}: {
  row: CoordRow;
  patch: (p: object) => void;
  pending: boolean;
  withCodePostal?: boolean;
}) {
  const [c, setC] = useState<Coord>(() => ({
    prenom: row.prenom ?? "",
    nom: row.nom ?? "",
    date_naissance: dateInput(row.date_naissance),
    telephone: row.telephone ?? "",
    email: row.email ?? "",
    adresse: row.adresse ?? "",
    code_postal_ville: row.code_postal_ville ?? "",
  }));

  // Re-sync si la fiche change en arrière-plan (après enregistrement / refresh)
  useEffect(() => {
    setC({
      prenom: row.prenom ?? "",
      nom: row.nom ?? "",
      date_naissance: dateInput(row.date_naissance),
      telephone: row.telephone ?? "",
      email: row.email ?? "",
      adresse: row.adresse ?? "",
      code_postal_ville: row.code_postal_ville ?? "",
    });
  }, [
    row.prenom,
    row.nom,
    row.date_naissance,
    row.telephone,
    row.email,
    row.adresse,
    row.code_postal_ville,
  ]);

  const dirty =
    c.prenom !== (row.prenom ?? "") ||
    c.nom !== (row.nom ?? "") ||
    c.date_naissance !== dateInput(row.date_naissance) ||
    c.telephone !== (row.telephone ?? "") ||
    c.email !== (row.email ?? "") ||
    c.adresse !== (row.adresse ?? "") ||
    (withCodePostal && c.code_postal_ville !== (row.code_postal_ville ?? ""));

  const valid = c.prenom.trim() !== "" && c.nom.trim() !== "";

  function save() {
    const p: Record<string, string> = {
      prenom: c.prenom.trim(),
      nom: c.nom.trim(),
      telephone: c.telephone.trim(),
      email: c.email.trim(),
      adresse: c.adresse.trim(),
    };
    if (c.date_naissance) p.date_naissance = c.date_naissance;
    if (withCodePostal) p.code_postal_ville = c.code_postal_ville.trim();
    patch(p);
  }

  const field =
    "mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm";
  const lbl = "text-[11px] font-semibold text-gray-600 uppercase";

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-bold text-navy uppercase tracking-wide mb-2">
        Coordonnées{" "}
        <span className="font-normal text-gray-400 normal-case">
          (modifiable)
        </span>
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="block">
          <span className={lbl}>Prénom</span>
          <input
            className={field}
            value={c.prenom}
            disabled={pending}
            onChange={(e) => setC({ ...c, prenom: e.target.value })}
          />
        </label>
        <label className="block">
          <span className={lbl}>Nom</span>
          <input
            className={field}
            value={c.nom}
            disabled={pending}
            onChange={(e) => setC({ ...c, nom: e.target.value })}
          />
        </label>
        <label className="block">
          <span className={lbl}>Date de naissance</span>
          <input
            type="date"
            className={field}
            value={c.date_naissance}
            disabled={pending}
            onChange={(e) => setC({ ...c, date_naissance: e.target.value })}
          />
        </label>
        <label className="block">
          <span className={lbl}>Téléphone</span>
          <input
            type="tel"
            className={field}
            value={c.telephone}
            disabled={pending}
            onChange={(e) => setC({ ...c, telephone: e.target.value })}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={lbl}>Email</span>
          <input
            type="email"
            className={field}
            value={c.email}
            disabled={pending}
            onChange={(e) => setC({ ...c, email: e.target.value })}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={lbl}>Adresse</span>
          <input
            className={field}
            value={c.adresse}
            disabled={pending}
            onChange={(e) => setC({ ...c, adresse: e.target.value })}
          />
        </label>
        {withCodePostal ? (
          <label className="block sm:col-span-2">
            <span className={lbl}>Code postal et ville</span>
            <input
              className={field}
              value={c.code_postal_ville}
              disabled={pending}
              onChange={(e) =>
                setC({ ...c, code_postal_ville: e.target.value })
              }
            />
          </label>
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-2 mt-2">
        {dirty && !valid ? (
          <span className="text-xs text-red-600">
            Nom et prénom obligatoires
          </span>
        ) : null}
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty || !valid}
          className="rounded bg-navy text-white px-3 py-1.5 text-xs font-bold hover:bg-navy-dark disabled:opacity-40"
        >
          {pending ? "…" : "Enregistrer les coordonnées"}
        </button>
      </div>
    </div>
  );
}
