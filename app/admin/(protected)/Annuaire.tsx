"use client";

import { useMemo, useState } from "react";
import type { ClientRow } from "@/lib/admin/annuaire-queries";

interface Props {
  clients: ClientRow[];
}

export default function Annuaire({ clients }: Props) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "stage" | "ecole">(
    "all",
  );
  const [filterSaison, setFilterSaison] = useState<string>("all");

  // Liste de toutes les saisons disponibles (pour le filtre)
  const allSaisons = useMemo(() => {
    const set = new Set<string>();
    for (const c of clients) {
      for (const t of c.tags) set.add(t.saison);
    }
    return Array.from(set).sort().reverse();
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      // Recherche texte
      if (q) {
        const hay = [
          c.nom,
          c.prenom,
          c.email ?? "",
          c.telephone ?? "",
          c.adresse ?? "",
          c.code_postal_ville ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // Filtre type
      if (filterType !== "all") {
        if (!c.tags.some((t) => t.type === filterType)) return false;
      }
      // Filtre saison
      if (filterSaison !== "all") {
        if (!c.tags.some((t) => t.saison === filterSaison)) return false;
      }
      return true;
    });
  }, [clients, search, filterType, filterSaison]);

  function exportCSV() {
    const rows = filtered.map((c) => ({
      nom: c.nom,
      prenom: c.prenom,
      email: c.email ?? "",
      telephone: c.telephone ?? "",
      adresse: c.adresse ?? "",
      code_postal_ville: c.code_postal_ville ?? "",
      niveau: c.niveau ?? "",
      date_naissance: c.date_naissance ?? "",
      tags: c.tags.map((t) => `${t.label} (×${t.count})`).join(" | "),
      inscriptions_count: c.inscriptions_count,
      total_prix: c.total_prix,
      derniere_activite: c.last_activity ?? "",
    }));

    const headers = Object.keys(rows[0] ?? {});
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const csv =
      "﻿" +
      [
        headers.join(","),
        ...rows.map((r) =>
          headers.map((h) => escape((r as Record<string, unknown>)[h])).join(","),
        ),
      ].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `annuaire-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Rechercher (nom, prénom, email, téléphone…)"
          className="flex-1 min-w-[240px] rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={filterType}
          onChange={(e) =>
            setFilterType(e.target.value as "all" | "stage" | "ecole")
          }
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="all">Tous les types</option>
          <option value="stage">🎾 Stages uniquement</option>
          <option value="ecole">🏫 École uniquement</option>
        </select>
        <select
          value={filterSaison}
          onChange={(e) => setFilterSaison(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="all">Toutes les saisons</option>
          {allSaisons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-600 ml-auto">
          <strong>{filtered.length}</strong> client
          {filtered.length > 1 ? "s" : ""}{" "}
          {filtered.length !== clients.length ? `(sur ${clients.length})` : ""}
        </span>
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="rounded bg-yellow-club text-navy text-xs font-bold px-3 py-1.5 hover:bg-yellow-hover disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Nom</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3 w-32">Téléphone</th>
                <th className="text-left p-3">Tags</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Aucun client ne correspond à la recherche.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <ClientRowComp key={c.key} client={c} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ClientRowComp({ client }: { client: ClientRow }) {
  return (
    <tr className="border-t hover:bg-gray-50">
      <td className="p-3 align-top">
        <div className="font-semibold text-navy">
          {client.prenom} {client.nom}
        </div>
        {client.niveau ? (
          <div className="text-xs text-gray-500">{client.niveau}</div>
        ) : null}
        {client.code_postal_ville ? (
          <div className="text-xs text-gray-500">
            {client.code_postal_ville}
          </div>
        ) : null}
      </td>
      <td className="p-3 text-xs align-top max-w-[200px]">
        {client.email ? (
          <a
            href={`mailto:${client.email}`}
            title={client.email}
            className="block truncate text-navy hover:text-yellow-hover hover:underline"
          >
            {client.email}
          </a>
        ) : (
          <span className="text-gray-400 italic">aucun</span>
        )}
      </td>
      <td className="p-3 text-xs align-top whitespace-nowrap">
        {client.telephone ? (
          <a
            href={`tel:${client.telephone.replace(/\s/g, "")}`}
            className="text-navy hover:text-yellow-hover hover:underline"
          >
            {client.telephone}
          </a>
        ) : (
          <span className="text-gray-400 italic">—</span>
        )}
      </td>
      <td className="p-3 align-top">
        <div className="flex flex-wrap gap-1">
          {client.tags.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: t.color }}
              title={t.label}
            >
              {t.type === "stage" ? "🎾" : "🏫"} {t.saison.replace("Saison ", "")}
              {t.count > 1 ? ` ×${t.count}` : ""}
            </span>
          ))}
        </div>
      </td>
      <td className="p-3 align-top">
        {client.email || client.telephone ? (
          <div className="flex items-center gap-1">
            {client.email ? (
              <a
                href={`mailto:${client.email}`}
                title="Mail"
                className="text-base hover:scale-110 transition"
              >
                📧
              </a>
            ) : null}
            {client.telephone ? (
              <a
                href={`tel:${client.telephone.replace(/\s/g, "")}`}
                title="Tel"
                className="text-base hover:scale-110 transition"
              >
                📞
              </a>
            ) : null}
          </div>
        ) : null}
      </td>
    </tr>
  );
}
