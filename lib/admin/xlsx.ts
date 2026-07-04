import "server-only";
import ExcelJS from "exceljs";

export interface XlsxColumn<T> {
  key: keyof T;
  label: string;
  /** Largeur indicative (nb de caractères). Défaut auto selon le contenu. */
  width?: number;
  /** Format numérique Excel (ex. "0" pour un entier, "0.00" €). */
  numFmt?: string;
}

/**
 * Génère un classeur Excel (.xlsx) propre à partir d'un tableau d'objets :
 *  - ligne d'en-tête en gras sur fond bleu marine (couleurs du club)
 *  - ligne d'en-tête figée + filtres automatiques
 *  - largeurs de colonnes ajustées au contenu
 *  - lignes zébrées pour la lisibilité
 *
 * Retourne un Buffer prêt à être renvoyé en réponse HTTP.
 */
export async function toXlsx<T extends Record<string, unknown>>(
  rows: T[],
  columns: XlsxColumn<T>[],
  opts: { sheetName?: string; title?: string } = {},
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ATS Valrose";
  wb.created = new Date();
  const ws = wb.addWorksheet(opts.sheetName ?? "Inscriptions", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = columns.map((c) => ({
    header: c.label,
    key: String(c.key),
    width: c.width ?? headerWidth(c.label),
    style: c.numFmt ? { numFmt: c.numFmt } : undefined,
  }));

  // En-tête : gras, blanc sur fond navy, centré verticalement.
  const header = ws.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0B2A4A" }, // navy
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF0B2A4A" } } };
  });

  // Lignes de données.
  for (const r of rows) {
    const values: Record<string, unknown> = {};
    for (const c of columns) values[String(c.key)] = normalize(r[c.key]);
    ws.addRow(values);
  }

  // Ajuste la largeur au plus long contenu (borné), + zébrage.
  columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    let max = headerWidth(c.label);
    col.eachCell({ includeEmpty: false }, (cell, rowNo) => {
      if (rowNo === 1) return;
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = c.width ?? Math.min(Math.max(max + 2, 10), 48);
  });

  for (let i = 2; i <= rows.length + 1; i++) {
    if (i % 2 === 0) {
      ws.getRow(i).eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF3F6FA" },
        };
      });
    }
  }

  // Filtres automatiques sur toute la plage d'en-tête.
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function headerWidth(label: string): number {
  return Math.min(Math.max(label.length + 2, 10), 48);
}

function normalize(v: unknown): unknown {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (Array.isArray(v)) return v.map((x) => normalize(x)).join(" | ");
  if (typeof v === "number") return v;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
