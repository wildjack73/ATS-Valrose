"use client";

import { useEffect, useState } from "react";

/**
 * Input texte au format DD/MM/YYYY, mais qui expose la valeur au parent
 * au format ISO (YYYY-MM-DD) — le format attendu par les API.
 *
 * On évite ainsi `<input type="date">` qui affiche le format de la locale
 * du navigateur (US = MM/DD/YYYY) sans qu'on puisse vraiment le forcer.
 */
export default function DateInputFR({
  value,
  onChange,
  className,
  disabled,
}: {
  /** YYYY-MM-DD */
  value: string;
  /** YYYY-MM-DD */
  onChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [display, setDisplay] = useState(isoToFr(value));

  // Si le parent met à jour la value (reset par exemple), on synchronise
  useEffect(() => {
    setDisplay(isoToFr(value));
  }, [value]);

  function handleChange(raw: string) {
    // Auto-insertion des slashs : « 05 » → « 05/ » ; « 0530 » → « 05/30/ »
    let cleaned = raw.replace(/\D/g, "").slice(0, 8);
    if (cleaned.length >= 5) {
      cleaned = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
    } else if (cleaned.length >= 3) {
      cleaned = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    setDisplay(cleaned);

    const iso = frToIso(cleaned);
    if (iso !== null) onChange(iso);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="JJ/MM/AAAA"
      disabled={disabled}
      maxLength={10}
      className={className}
    />
  );
}

/** YYYY-MM-DD → DD/MM/YYYY (vide si invalide) */
function isoToFr(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** DD/MM/YYYY → YYYY-MM-DD (null si incomplet/invalide) */
function frToIso(fr: string): string | null {
  const m = fr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dn = Number(d);
  const mn = Number(mo);
  const yn = Number(y);
  if (mn < 1 || mn > 12) return null;
  if (dn < 1 || dn > 31) return null;
  if (yn < 2020 || yn > 2100) return null;
  return `${y}-${mo}-${d}`;
}
