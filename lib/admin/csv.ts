import "server-only";

/**
 * Convertit un tableau d'objets en CSV.
 * - Échappe les valeurs contenant ",", '"' ou saut de ligne.
 * - Préfixe BOM UTF-8 pour qu'Excel ouvre correctement les accents.
 */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[],
): string {
  const head = columns.map((c) => escapeCell(c.label)).join(",");
  const lines = rows.map((r) =>
    columns
      .map((c) => escapeCell(formatCell(r[c.key])))
      .join(","),
  );
  return "﻿" + [head, ...lines].join("\r\n");
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (Array.isArray(v)) return v.map((x) => formatCell(x)).join(" | ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function escapeCell(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
