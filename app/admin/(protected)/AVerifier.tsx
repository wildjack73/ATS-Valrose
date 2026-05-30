"use client";

import type {
  ChecksRapport,
  InscriptionAVerifier,
  DoublonGroupe,
} from "@/lib/admin/checks-queries";

const FORMULE_SHORT: Record<string, string> = {
  formule_1: "F1",
  formule_2: "F2",
  formule_3: "F3",
  formule_4: "F4",
};

function shortSemaine(s: string) {
  return s.replace(/^Été 2026 — /, "").replace(/^Du /, "");
}

function joursF4(sel: { jour: string; option: string }[] | null) {
  if (!sel || sel.length === 0) return "—";
  return sel
    .map((s) => `${s.jour.slice(0, 3)} (${s.option.replace("option_", "Opt")})`)
    .join(", ");
}

function repas(jours: string[] | null) {
  if (!jours || jours.length === 0) return "—";
  if (jours.length >= 5) return "semaine (35€)";
  return `${jours.length} j (${jours.length * 8}€)`;
}

/** Groupe les inscriptions par parent (téléphone ou email) pour limiter les appels */
function groupByContact(items: InscriptionAVerifier[]) {
  const map = new Map<string, InscriptionAVerifier[]>();
  for (const it of items) {
    const key = it.email.toLowerCase().trim() || it.telephone.replace(/\s/g, "");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }
  return Array.from(map.values());
}

export default function AVerifier({ rapport }: { rapport: ChecksRapport }) {
  const groupesF4 = groupByContact(rapport.f4Options);
  const groupesIncomplets = groupByContact(rapport.fichesIncompletes);
  const datesSuspectesPures = rapport.datesSuspectes.filter(
    (r) =>
      !r.notes_admin.includes("Email à compléter") &&
      !r.notes_admin.includes("Adresse à compléter"),
  );

  return (
    <div className="space-y-5">
      {/* En-tête imprimable */}
      <div className="print-only mb-3">
        <div
          className="print-only-flex"
          style={{
            alignItems: "center",
            gap: "12pt",
            borderBottom: "2pt solid #0d2e3f",
            paddingBottom: "8pt",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-club.png" alt="ATS Valrose" style={{ height: "40pt" }} />
          <div>
            <div style={{ fontSize: "16pt", fontWeight: 800, color: "#0d2e3f" }}>
              ATS Valrose — Check-list inscriptions à vérifier
            </div>
            <div style={{ fontSize: "11pt", color: "#666" }}>
              {rapport.total} point{rapport.total > 1 ? "s" : ""} à traiter
            </div>
          </div>
        </div>
      </div>

      {/* En-tête écran */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap items-center gap-3 no-print">
        <div>
          <h2 className="text-lg font-bold text-navy">📋 Inscriptions à vérifier</h2>
          <p className="text-xs text-gray-500">
            {rapport.total} point{rapport.total > 1 ? "s" : ""} ouvert{rapport.total > 1 ? "s" : ""}
            {" "}— à clarifier avec les familles concernées.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="ml-auto rounded-md bg-white border border-gray-300 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
        >
          🖨️ Imprimer la check-list
        </button>
      </div>

      {/* Aucune anomalie */}
      {rapport.total === 0 ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-8 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-emerald-800 font-bold">
            Tout est OK ! Aucune inscription à vérifier.
          </p>
        </div>
      ) : null}

      {/* === A. F4 options === */}
      {rapport.f4Options.length > 0 ? (
        <Section
          accent="cyan"
          icon="🎾"
          titre={`A. Formule 4 — option par jour à confirmer (${rapport.f4Options.length})`}
          sousTitre={`Demander à la famille quelle option (1=25€/1h30, 2=35€/2h30, 3=55€/journée) chaque jour. Par défaut on a mis Option 3.`}
        >
          {groupesF4.map((groupe, gi) => (
            <FamilyCard key={gi} items={groupe} montrerJoursF4 />
          ))}
        </Section>
      ) : null}

      {/* === B. Fiches incomplètes === */}
      {rapport.fichesIncompletes.length > 0 ? (
        <Section
          accent="ocre"
          icon="📋"
          titre={`B. Fiches incomplètes (${rapport.fichesIncompletes.length})`}
          sousTitre={`Email et/ou adresse à récupérer auprès du parent.`}
        >
          {groupesIncomplets.map((groupe, gi) => (
            <FamilyCard
              key={gi}
              items={groupe}
              montrerManques
            />
          ))}
        </Section>
      ) : null}

      {/* === C. Dates de naissance suspectes (hors fiches déjà incomplètes) === */}
      {datesSuspectesPures.length > 0 ? (
        <Section
          accent="yellow"
          icon="📅"
          titre={`C. Dates de naissance à confirmer (${datesSuspectesPures.length})`}
          sousTitre={`Date placeholder 01/01/2014 mise temporairement. Demander la vraie date.`}
        >
          {datesSuspectesPures.map((r) => (
            <FamilyCard key={r.id} items={[r]} />
          ))}
        </Section>
      ) : null}

      {/* === D. Doublons probables === */}
      {rapport.doublons.length > 0 ? (
        <Section
          accent="red"
          icon="🔁"
          titre={`D. Doublons probables (${rapport.doublons.length})`}
          sousTitre={`Mêmes prénom + nom + semaine. À confirmer ou supprimer une copie via la corbeille 🗑️.`}
        >
          {rapport.doublons.map((d, i) => (
            <DoublonCard key={i} doublon={d} />
          ))}
        </Section>
      ) : null}
    </div>
  );
}

function Section({
  accent,
  icon,
  titre,
  sousTitre,
  children,
}: {
  accent: "cyan" | "ocre" | "yellow" | "red";
  icon: string;
  titre: string;
  sousTitre: string;
  children: React.ReactNode;
}) {
  const bg = {
    cyan: "bg-cyan-club",
    ocre: "bg-ocre",
    yellow: "bg-yellow-club text-navy",
    red: "bg-red-500",
  }[accent];
  return (
    <section
      className="rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm"
      style={{ breakInside: "avoid" }}
    >
      <header className={`${bg} text-white px-5 py-3`}>
        <h3 className="text-base font-extrabold">
          {icon} {titre}
        </h3>
        <p className="text-xs mt-0.5 opacity-90">{sousTitre}</p>
      </header>
      <div className="divide-y divide-gray-100">{children}</div>
    </section>
  );
}

function FamilyCard({
  items,
  montrerJoursF4,
  montrerManques,
}: {
  items: InscriptionAVerifier[];
  montrerJoursF4?: boolean;
  montrerManques?: boolean;
}) {
  const first = items[0];
  return (
    <div className="px-5 py-3" style={{ breakInside: "avoid" }}>
      {/* Contact en gros */}
      <div className="flex flex-wrap items-baseline gap-3 mb-2">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm border-2 border-navy print:border-black">
          {/* case à cocher imprimée */}
        </span>
        <span className="font-bold text-navy">
          {first.email !== "a-completer@ats-valrose.fr" ? first.email : "✗ (pas d'email)"}
        </span>
        {first.telephone && first.telephone !== "À compléter" ? (
          <span className="text-sm text-gray-700">📞 {first.telephone}</span>
        ) : null}
        <span className="text-xs text-gray-500 ml-auto">
          {items.length} inscription{items.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Lignes */}
      <ul className="space-y-1 text-sm">
        {items.map((r) => (
          <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="font-semibold">
              {r.prenom} {r.nom}
            </span>
            <span className="text-xs text-gray-500">
              [{FORMULE_SHORT[r.formule]}] {shortSemaine(r.semaine_label)}
            </span>
            {montrerJoursF4 ? (
              <span className="text-xs text-gray-600">
                · jours : {joursF4(r.formule_4_selection)} · repas : {repas(r.dejeuner_jours)}
                {" "}· <strong>{r.prix_total}€</strong> par défaut
              </span>
            ) : null}
            {montrerManques ? (
              <span className="text-xs text-red-700">
                {r.notes_admin.includes("Email à compléter") ? "· mail ❌ " : ""}
                {r.notes_admin.includes("Adresse à compléter") ? "· adresse ❌ " : ""}
                {r.notes_admin.includes("Date de naissance") ? "· naissance ❌" : ""}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DoublonCard({ doublon }: { doublon: DoublonGroupe }) {
  return (
    <div className="px-5 py-3" style={{ breakInside: "avoid" }}>
      <div className="flex items-baseline gap-3 mb-1.5">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm border-2 border-navy" />
        <span className="font-bold text-navy">
          {doublon.prenom} {doublon.nom}
        </span>
        <span className="text-xs text-gray-500">
          {shortSemaine(doublon.semaine_label)} · {doublon.inscriptions.length}× inscrit
        </span>
      </div>
      <table className="w-full text-xs ml-7">
        <thead className="text-gray-500">
          <tr>
            <th className="text-left pr-3 pb-0.5">Date saisie</th>
            <th className="text-left pr-3 pb-0.5">Naissance</th>
            <th className="text-left pr-3 pb-0.5">Email</th>
            <th className="text-left pr-3 pb-0.5">Tél</th>
            <th className="text-right pb-0.5">Prix</th>
          </tr>
        </thead>
        <tbody>
          {doublon.inscriptions.map((i, k) => (
            <tr key={k} className="border-t border-gray-100">
              <td className="pr-3 py-1">{i.created_at.slice(0, 10)}</td>
              <td className="pr-3 py-1">{i.date_naissance}</td>
              <td className="pr-3 py-1">{i.email}</td>
              <td className="pr-3 py-1">{i.telephone}</td>
              <td className="text-right py-1 font-semibold">{i.prix_total}€</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
