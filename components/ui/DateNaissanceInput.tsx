"use client";

import { useEffect, useState } from "react";
import { inputClass } from "./Field";

/**
 * Saisie de date de naissance en 3 menus déroulants (jour/mois/année).
 * Évite le souci du <input type="date"> qui s'affiche en mm/dd/yyyy
 * sur les navigateurs en anglais.
 *
 * Stocke la valeur au format ISO "YYYY-MM-DD".
 */

const MOIS = [
  { v: "01", l: "Janvier" },
  { v: "02", l: "Février" },
  { v: "03", l: "Mars" },
  { v: "04", l: "Avril" },
  { v: "05", l: "Mai" },
  { v: "06", l: "Juin" },
  { v: "07", l: "Juillet" },
  { v: "08", l: "Août" },
  { v: "09", l: "Septembre" },
  { v: "10", l: "Octobre" },
  { v: "11", l: "Novembre" },
  { v: "12", l: "Décembre" },
];

export function DateNaissanceInput({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  // Parse value (YYYY-MM-DD) en composants
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  const [annee, setAnnee] = useState(parts ? parts[1] : "");
  const [mois, setMois] = useState(parts ? parts[2] : "");
  const [jour, setJour] = useState(parts ? parts[3] : "");

  // Resync si value change de l'extérieur
  useEffect(() => {
    const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
    if (p) {
      setAnnee(p[1]);
      setMois(p[2]);
      setJour(p[3]);
    } else if (!value) {
      setAnnee("");
      setMois("");
      setJour("");
    }
  }, [value]);

  // Recompose la valeur ISO quand un composant change
  function emit(a: string, m: string, j: string) {
    if (a && m && j) {
      onChange(`${a}-${m}-${j}`);
    } else {
      onChange("");
    }
  }

  const currentYear = new Date().getFullYear();
  const annees: number[] = [];
  for (let y = currentYear; y >= currentYear - 90; y--) annees.push(y);

  const jours: string[] = [];
  for (let d = 1; d <= 31; d++) jours.push(String(d).padStart(2, "0"));

  return (
    <div className="grid grid-cols-3 gap-2" id={id}>
      <select
        aria-label="Jour"
        className={inputClass}
        value={jour}
        onChange={(e) => {
          setJour(e.target.value);
          emit(annee, mois, e.target.value);
        }}
      >
        <option value="">Jour</option>
        {jours.map((d) => (
          <option key={d} value={d}>
            {parseInt(d, 10)}
          </option>
        ))}
      </select>
      <select
        aria-label="Mois"
        className={inputClass}
        value={mois}
        onChange={(e) => {
          setMois(e.target.value);
          emit(annee, e.target.value, jour);
        }}
      >
        <option value="">Mois</option>
        {MOIS.map((m) => (
          <option key={m.v} value={m.v}>
            {m.l}
          </option>
        ))}
      </select>
      <select
        aria-label="Année"
        className={inputClass}
        value={annee}
        onChange={(e) => {
          setAnnee(e.target.value);
          emit(e.target.value, mois, jour);
        }}
      >
        <option value="">Année</option>
        {annees.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
