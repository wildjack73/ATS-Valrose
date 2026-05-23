"use client";

import { useState, useEffect } from "react";
import { inputClass } from "./Field";

/**
 * Sélecteur de niveau tennis avec liste prédéfinie + option "Autre".
 * Utilisé en commun sur les formulaires stages et école.
 */

const NIVEAUX_STANDARDS = [
  "Je ne sais pas",
  "Baby tennis (3-5 ans)",
  "Blanc (4-5 ans)",
  "Violet (5-6 ans)",
  "Rouge (6-7 ans)",
  "Orange (7-8 ans)",
  "Vert (8-9 ans)",
  "Jaune (10 ans et +)",
  "Débutant adulte",
  "Intermédiaire",
  "Perfectionnement",
  "Compétition / Classé FFT",
];

export function NiveauSelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  // Si la valeur n'est PAS dans la liste, on est en mode "Autre"
  const isStandard = NIVEAUX_STANDARDS.includes(value);
  const [mode, setMode] = useState<"standard" | "autre">(
    value === "" || isStandard ? "standard" : "autre",
  );
  const [autreText, setAutreText] = useState(isStandard ? "" : value);

  // Resync if value changes externally
  useEffect(() => {
    if (NIVEAUX_STANDARDS.includes(value)) {
      setMode("standard");
    } else if (value !== "") {
      setMode("autre");
      setAutreText(value);
    }
  }, [value]);

  return (
    <div className="space-y-2">
      <select
        id={id}
        className={inputClass}
        value={mode === "standard" ? value : "__autre__"}
        onChange={(e) => {
          if (e.target.value === "__autre__") {
            setMode("autre");
            onChange(autreText);
          } else {
            setMode("standard");
            onChange(e.target.value);
          }
        }}
      >
        <option value="">— Choisir —</option>
        {NIVEAUX_STANDARDS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
        <option value="__autre__">Autre (préciser)</option>
      </select>
      {mode === "autre" ? (
        <input
          type="text"
          className={inputClass}
          placeholder="Préciser le niveau (ex: 30/4, balle dure, etc.)"
          value={autreText}
          onChange={(e) => {
            setAutreText(e.target.value);
            onChange(e.target.value);
          }}
        />
      ) : null}
    </div>
  );
}
