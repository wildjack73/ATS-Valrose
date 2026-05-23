/**
 * Importe le planning École 2025/2026 dans la saison active en DB.
 *
 * Source : data-historique/planning-2025-2026.csv (extrait d'Excel).
 * Cible  : table groupes_ecole + coaches.
 *
 * Le CSV est trop irrégulier pour un parseur générique : les groupes
 * sont hardcodés ci-dessous (extraction manuelle du planning Excel).
 * Pour la saison suivante, dupliquer/modifier ce tableau.
 *
 * Usage : npm run import:planning
 */

import { Client } from "pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error("❌ SUPABASE_DB_URL manquant dans .env.local");
  process.exit(1);
}

type GroupeData = {
  jour:
    | "lundi"
    | "mardi"
    | "mercredi"
    | "jeudi"
    | "vendredi"
    | "samedi";
  heure_debut: string;
  heure_fin: string | null;
  coach: string | null; // nom du coach (sera matché par requête)
  court: string | null;
  niveau: string | null;
  capacite_max: number;
  notes: string | null;
};

/**
 * Groupes extraits du planning Excel 2025/2026.
 * Note : les noms d'élèves sont mis dans `notes` comme référence.
 * Ils ne sont PAS auto-assignés (chaque famille devra s'inscrire en ligne
 * et tu les placeras manuellement dans l'admin).
 */
const GROUPES: GroupeData[] = [
  // ===== LUNDI =====
  { jour: "lundi", heure_debut: "17:00", heure_fin: "18:30", coach: null, court: null, niveau: "Rouge", capacite_max: 6, notes: "Eliot GRIDEL" },
  { jour: "lundi", heure_debut: "17:00", heure_fin: "18:30", coach: "Camille", court: null, niveau: "Baby", capacite_max: 6, notes: "" },
  { jour: "lundi", heure_debut: "17:00", heure_fin: "18:30", coach: "Romain", court: null, niveau: null, capacite_max: 6, notes: "" },
  { jour: "lundi", heure_debut: "18:30", heure_fin: "20:00", coach: "Romain", court: "Court 3", niveau: "Adultes", capacite_max: 8, notes: "" },
  { jour: "lundi", heure_debut: "18:30", heure_fin: "20:00", coach: "Camille", court: "Padel", niveau: "Adultes Padel", capacite_max: 4, notes: "" },

  // ===== MARDI =====
  { jour: "mardi", heure_debut: "17:00", heure_fin: "18:00", coach: null, court: null, niveau: "Mini tennis", capacite_max: 6, notes: "Elio Rocchesani" },
  { jour: "mardi", heure_debut: "17:00", heure_fin: "18:30", coach: "Camille", court: null, niveau: "Rouge", capacite_max: 6, notes: "Andro DEKANOSIDZE\nThibault LESCOUZERES\nPierre BIAMONTI" },
  { jour: "mardi", heure_debut: "17:00", heure_fin: "18:30", coach: null, court: null, niveau: "Rouge", capacite_max: 6, notes: "Hugo PROTHON\nJeanne CHARBONNIER\nEnora LE PELLEC" },
  { jour: "mardi", heure_debut: "17:00", heure_fin: "18:30", coach: "Agnès", court: null, niveau: null, capacite_max: 6, notes: "" },
  { jour: "mardi", heure_debut: "18:30", heure_fin: "20:00", coach: null, court: null, niveau: "Adultes", capacite_max: 8, notes: "" },
  { jour: "mardi", heure_debut: "18:30", heure_fin: "20:00", coach: null, court: "Padel", niveau: "Adultes Padel", capacite_max: 4, notes: "" },

  // ===== MERCREDI =====
  // 9h-10h30
  { jour: "mercredi", heure_debut: "09:00", heure_fin: "10:30", coach: "Jean-Marc", court: "Court 3", niveau: null, capacite_max: 6, notes: "Baptista SAENKO\nLenno BENSABATH\nSianna BENSABATH\nElla TUMORTICCHI" },
  { jour: "mercredi", heure_debut: "09:00", heure_fin: "10:30", coach: "Jérôme", court: "Court 4", niveau: null, capacite_max: 6, notes: "Thomas PICARD MERO\nEnzo MORANI\nPaul GARAC\nLouis FERRIERE\nAlexis Perrochia\nNeyl BENTBIB" },
  { jour: "mercredi", heure_debut: "09:00", heure_fin: "10:30", coach: "Romain", court: "Court 5", niveau: null, capacite_max: 6, notes: "Noe MARETTE\nIeva HRUSHEVSKA\nIgnat\nMartin RASTOLL\nLou MUVIEN PERINETTI\nPaul LALLEMENT" },
  { jour: "mercredi", heure_debut: "09:00", heure_fin: "10:00", coach: "Camille", court: "Padel 1", niveau: "Baby", capacite_max: 6, notes: "Gabin Perroton\nLéon Cappello\nValentin Martin\nJean Baptiste RYCKELYNCK\nMahe DERILLEUX\nAthenais NEGRE" },
  { jour: "mercredi", heure_debut: "09:00", heure_fin: "10:00", coach: "Agnès", court: "Padel 2", niveau: "Mini tennis", capacite_max: 6, notes: "Léo MARETTE\nGaspard VIOTTI\nAlicia MINJAUD\nNoam ROSANO\nCharly BENSABATH\nAlice PEROCCHIA" },

  // 10h30-12h
  { jour: "mercredi", heure_debut: "10:30", heure_fin: "12:00", coach: "Jean-Marc", court: "Court 3", niveau: "Pickle", capacite_max: 6, notes: "Chloe PONS\nCamille PONS\nJoschka MAUROY VERCKE\nFlavio POSSETTO\nEmmanuel THOMAS\n(11h-12h Pickle Ball/Sport collectifs)" },
  { jour: "mercredi", heure_debut: "10:30", heure_fin: "12:00", coach: "Jérôme", court: "Court 4", niveau: "Perfectionnement", capacite_max: 8, notes: "Remi GRIFFET\nAntoine GRIFFET\nNoa TRUCHI\nBaptiste DEVOS\nYevheniia Shkliarevych\nJoseph PEPINO BUTORI\nAurélien THOMAS" },
  { jour: "mercredi", heure_debut: "10:30", heure_fin: "12:00", coach: "Romain", court: "Court 5", niveau: null, capacite_max: 6, notes: "Nelle JAKUBOWICZ\nMargot BARBUT" },
  { jour: "mercredi", heure_debut: "10:00", heure_fin: "11:00", coach: "Camille", court: "Padel 1", niveau: "Baby", capacite_max: 6, notes: "Timéo Ruel\nJaz Cabral Silva Niort\nPaul EMEYRIAT\nUlysse JOUSSELIN\nLouise COLONNA D'ISTRIA\nAugustin ARNAL" },
  { jour: "mercredi", heure_debut: "10:00", heure_fin: "11:00", coach: "Agnès", court: "Padel 2", niveau: "Mini tennis", capacite_max: 6, notes: "Andres PERROT\nDimitri Bedell SPORER\nMark Zgurean\nAndrea KOUASSI" },

  // 11h-12h
  { jour: "mercredi", heure_debut: "11:00", heure_fin: "12:00", coach: "Camille", court: "Padel 1", niveau: "Initiation", capacite_max: 6, notes: "Alban DE LA CROUEE" },
  { jour: "mercredi", heure_debut: "11:00", heure_fin: "12:00", coach: "Agnès", court: "Padel 2", niveau: "Mini tennis", capacite_max: 6, notes: "Paul BRACHAT" },
  { jour: "mercredi", heure_debut: "11:00", heure_fin: "12:00", coach: "Agnès", court: null, niveau: "Sport collectif", capacite_max: 8, notes: "" },

  // 14h-15h30
  { jour: "mercredi", heure_debut: "14:00", heure_fin: "15:30", coach: "Jean-Marc", court: "Court 3", niveau: "Perfectionnement", capacite_max: 6, notes: "Louis MINETO\nMarius\nLucas Bergounioux" },
  { jour: "mercredi", heure_debut: "14:00", heure_fin: "15:30", coach: "Jérôme", court: "Court 4", niveau: "Compétition", capacite_max: 6, notes: "Auguste AUBER\nElior CARUSO" },
  { jour: "mercredi", heure_debut: "14:00", heure_fin: "15:30", coach: "Romain", court: null, niveau: "Orange", capacite_max: 6, notes: "Luca FALCONIO-SANSOT\nGabriel MONGIN\nGloria SCOTTO\nNevan EYRIGNOUX\nEthan SITBON" },
  { jour: "mercredi", heure_debut: "14:00", heure_fin: "15:30", coach: "Camille", court: "Padel 1", niveau: null, capacite_max: 4, notes: "Elisabeth FREY" },
  { jour: "mercredi", heure_debut: "14:00", heure_fin: "15:00", coach: "Agnès", court: "Padel 2", niveau: "Mini tennis", capacite_max: 4, notes: "Ombeline COUDERT\nLou CHARLES\nAndrea KOUASSI" },

  // 15h-16h, 15h30-17h
  { jour: "mercredi", heure_debut: "15:30", heure_fin: "17:00", coach: "Jean-Marc", court: "Court 3", niveau: "Ado", capacite_max: 6, notes: "" },
  { jour: "mercredi", heure_debut: "15:30", heure_fin: "17:00", coach: "Jérôme", court: "Court 4", niveau: "Ado", capacite_max: 6, notes: "Nolan BENSABATH\nDimitri MONGIN\nAdam BRUGIERE\nGabriel DOMINGUES" },
  { jour: "mercredi", heure_debut: "15:30", heure_fin: "17:00", coach: "Romain", court: "Court 5", niveau: null, capacite_max: 6, notes: "Arthur GOUSSEAU\nSamuel BATAIL" },
  { jour: "mercredi", heure_debut: "15:00", heure_fin: "16:00", coach: "Camille", court: "Padel 1", niveau: "Baby", capacite_max: 4, notes: "Mathis LEONARD\nLila PATILLOT\nMaxime LIDOUE" },
  { jour: "mercredi", heure_debut: "15:00", heure_fin: "16:00", coach: "Agnès", court: "Padel 2", niveau: "Mini tennis (2012)", capacite_max: 4, notes: "Gaston PATILLOT\nInès Di Stasi Thuillez\nElena Di Stasi Thuillez" },

  // 16h-17h
  { jour: "mercredi", heure_debut: "16:00", heure_fin: "17:00", coach: "Camille", court: "Padel 1", niveau: "Mini tennis", capacite_max: 4, notes: "Paul BAODDINO\nGABIN MANSENCAL\nLOUIS DEBUSSY\nPaul BOUHLAL Roman" },
  { jour: "mercredi", heure_debut: "16:00", heure_fin: "17:00", coach: "Agnès", court: "Padel 2", niveau: "Initiation", capacite_max: 4, notes: "Victoria DEBUSSY\nRomy SALADINO\nAlix COUDERT\nAngelin MANSENCAL" },

  // 17h-18h30
  { jour: "mercredi", heure_debut: "17:00", heure_fin: "18:30", coach: "Jean-Marc", court: "Court 3", niveau: null, capacite_max: 8, notes: "Angus BLANC\nThéo Rico Bouvier\nElliot GILLET\nVictor CHARBONNIER\nValentin MARIANI\nPaola POMERO" },
  { jour: "mercredi", heure_debut: "17:00", heure_fin: "18:30", coach: "Jérôme", court: "Court 4", niveau: null, capacite_max: 8, notes: "" },
  { jour: "mercredi", heure_debut: "17:00", heure_fin: "18:30", coach: "Romain", court: "Court 5", niveau: null, capacite_max: 8, notes: "" },
  { jour: "mercredi", heure_debut: "17:00", heure_fin: "18:30", coach: "Camille", court: "Padel 1", niveau: null, capacite_max: 4, notes: "Valentin COTTE FRIGNANI\nTristan FLIPO\nEstéban VIALETTES\nPaul TAILLARDAT" },
  { jour: "mercredi", heure_debut: "17:00", heure_fin: "18:30", coach: "Agnès", court: "Padel 2", niveau: null, capacite_max: 4, notes: "Charlie BENCHETRIT\nTal PARTOUCHE\nNolan BENSABATH\nAlester Gal-Checconi" },

  // 18h30-20h
  { jour: "mercredi", heure_debut: "18:30", heure_fin: "20:00", coach: null, court: null, niveau: "Adultes", capacite_max: 8, notes: "Colombe TEDESCO\nVeronique MAUREL\nAlexia DELPAU\nJuliette RENAUD\nGaelle GRIDEL\nAudrey" },

  // ===== JEUDI =====
  { jour: "jeudi", heure_debut: "17:00", heure_fin: "18:00", coach: "Camille", court: "Court 5", niveau: "Mini tennis", capacite_max: 6, notes: "Héloïse DOUNVAL\nCharlotte GRIDEL" },
  { jour: "jeudi", heure_debut: "17:00", heure_fin: "18:30", coach: "Agnès", court: "Court 4", niveau: null, capacite_max: 6, notes: "Olivia MINJAUD\nLeann BARACHET\nDita BARRANCA\nEliot GRIDEL" },
  { jour: "jeudi", heure_debut: "18:30", heure_fin: "20:00", coach: "Camille", court: "Court 5", niveau: null, capacite_max: 8, notes: "Hang (payé)\nStephanie (payé)\nCamille REBICHON (payé)\nJean Philippe VIUDES (payé)" },
  { jour: "jeudi", heure_debut: "18:30", heure_fin: "20:00", coach: "Agnès", court: "Court 4", niveau: "Adultes", capacite_max: 8, notes: "Gael Le Pellec" },

  // ===== VENDREDI =====
  { jour: "vendredi", heure_debut: "17:00", heure_fin: "18:30", coach: null, court: null, niveau: null, capacite_max: 8, notes: "Elliot GILLET\nVictor CHARBONNIER\nLouis MINETO\nMargot SAUTET\nEthan SITBON\nVictor BORIE\nEmma LETELLIER\nThéo BANCHI-MARCHAND" },
  { jour: "vendredi", heure_debut: "17:00", heure_fin: "18:30", coach: null, court: null, niveau: null, capacite_max: 4, notes: "Ieva HRUSHEVSKA" },
  { jour: "vendredi", heure_debut: "18:30", heure_fin: "20:00", coach: null, court: null, niveau: "Adultes", capacite_max: 8, notes: "Bertille OZANNE\nMaina GILLET\nRossella BIAMONTI" },
  { jour: "vendredi", heure_debut: "18:30", heure_fin: "20:00", coach: null, court: "Padel", niveau: "Padel", capacite_max: 4, notes: "" },

  // ===== SAMEDI =====
  // 9h-10h30
  { jour: "samedi", heure_debut: "09:00", heure_fin: "10:30", coach: "Jérôme", court: "Court 4", niveau: "Adultes", capacite_max: 4, notes: "Jeremy ROSANO" },
  { jour: "samedi", heure_debut: "09:00", heure_fin: "10:30", coach: "Romain", court: "Court 5", niveau: "Adultes", capacite_max: 4, notes: "Angelique ROSANO\nOlga SUAREZ\nLaetitia VILLAGEOIS" },
  { jour: "samedi", heure_debut: "09:00", heure_fin: "10:30", coach: "Jean-Marc", court: "Court 3", niveau: "Adultes", capacite_max: 4, notes: "" },
  { jour: "samedi", heure_debut: "09:00", heure_fin: "10:00", coach: "Camille", court: null, niveau: "Mini tennis", capacite_max: 4, notes: "Andrea VILLAGEOIS\nMathilde Jasinski" },
  { jour: "samedi", heure_debut: "09:00", heure_fin: "10:00", coach: "Agnès", court: null, niveau: "Baby", capacite_max: 8, notes: "Lucien PRIETO\nAntoine BALAZUN\nRuben Pignier Burg\nAaron Pignier Burg\nMatteo Inchiappa\nOlivia FULCHIRON" },

  // 10h30-12h
  { jour: "samedi", heure_debut: "10:30", heure_fin: "12:00", coach: "Jérôme", court: "Court 4", niveau: "Perfectionnement", capacite_max: 6, notes: "Marius\nBaptista SAENKO\nJames RANN\nAurélien THOMAS" },
  { jour: "samedi", heure_debut: "10:30", heure_fin: "12:00", coach: "Romain", court: "Court 5", niveau: "Perfectionnement", capacite_max: 6, notes: "Julie Gautier gibbardo\nLiam SALICHON\nIgnat\nJack TEMPLE\nTom GOUSSEAU" },
  { jour: "samedi", heure_debut: "10:30", heure_fin: "12:00", coach: "Jean-Marc", court: "Court 3", niveau: "Perfectionnement", capacite_max: 6, notes: "Markus SAINT PIERRE\nLeonardo Batili Larsson\nGabin MEGE\nVictor PETIT" },
  { jour: "samedi", heure_debut: "10:00", heure_fin: "11:00", coach: "Camille", court: "Padel 1", niveau: null, capacite_max: 4, notes: "Eliott DELY\nLéo HAVERLANT" },
  { jour: "samedi", heure_debut: "10:00", heure_fin: "11:00", coach: "Agnès", court: "Padel 2", niveau: "Baby", capacite_max: 4, notes: "Émie DEVIC\nByron PETIT\nJules CASANOVA\nLéna HAVERLANT" },

  // 11h-13h30
  { jour: "samedi", heure_debut: "11:00", heure_fin: "12:00", coach: "Camille", court: "Padel 1", niveau: null, capacite_max: 4, notes: "Maria TEMPLE" },
  { jour: "samedi", heure_debut: "11:00", heure_fin: "12:00", coach: "Agnès", court: "Padel 1", niveau: null, capacite_max: 4, notes: "BOUHLAL Roman\nDiane" },
  { jour: "samedi", heure_debut: "12:00", heure_fin: "13:30", coach: "Jérôme", court: "Court 5", niveau: null, capacite_max: 6, notes: "Arthur GOUSSEAU\nAuguste AUBER\nDimitri MONGIN\nAdam BRUGIERE" },
  { jour: "samedi", heure_debut: "12:00", heure_fin: "13:30", coach: "Romain", court: null, niveau: null, capacite_max: 4, notes: "Gabriel DOMINGUES\nSamuel BATAIL" },

  // 13h30-15h
  { jour: "samedi", heure_debut: "13:30", heure_fin: "15:00", coach: "Jérôme", court: "Court 3", niveau: "Ados", capacite_max: 6, notes: "" },
  { jour: "samedi", heure_debut: "13:30", heure_fin: "15:00", coach: "Romain", court: "Court 5", niveau: "Perfectionnement Ados", capacite_max: 6, notes: "" },
  { jour: "samedi", heure_debut: "13:30", heure_fin: "15:00", coach: "Camille", court: "Padel", niveau: "Ados Padel", capacite_max: 4, notes: "Giulia BETTATI" },
  { jour: "samedi", heure_debut: "13:30", heure_fin: "15:00", coach: "Agnès", court: "Padel", niveau: "Padel", capacite_max: 4, notes: "" },

  // ===== SPORT ETUDES =====
  { jour: "mardi", heure_debut: "15:00", heure_fin: "17:00", coach: "Jérôme", court: "Court 4 et 5", niveau: "Sport études", capacite_max: 10, notes: "" },
  { jour: "jeudi", heure_debut: "15:00", heure_fin: "17:00", coach: "Jérôme", court: "Court 4 et 5", niveau: "Sport études", capacite_max: 10, notes: "" },
];

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("🔌 Connecté.\n");

  // 1. Récupérer la saison active
  const saisonRes = await client.query(
    "select id, code from saisons where active = true limit 1",
  );
  if (saisonRes.rows.length === 0) {
    console.error("❌ Aucune saison active. Lance d'abord le seed.");
    process.exit(1);
  }
  const saisonId = saisonRes.rows[0].id as string;
  const saisonCode = saisonRes.rows[0].code as string;
  console.log(`📅 Saison active : ${saisonCode}`);

  // 2. Mapping nom de coach → id
  const coachesRes = await client.query("select id, nom from coaches");
  const coachByName = new Map<string, string>();
  for (const row of coachesRes.rows) {
    coachByName.set(row.nom as string, row.id as string);
    // Also accept Jean-Marc / Jean Marc as same
    coachByName.set((row.nom as string).replace("-", " "), row.id as string);
  }
  console.log(`👤 ${coachesRes.rows.length} coaches disponibles`);

  // 3. Demander confirmation et nettoyer les groupes existants de cette saison
  const existingRes = await client.query(
    "select count(*) from groupes_ecole where saison_id = $1",
    [saisonId],
  );
  const existing = parseInt(existingRes.rows[0].count, 10);
  if (existing > 0) {
    console.log(
      `🗑️  Suppression de ${existing} groupes existants pour la saison ${saisonCode}…`,
    );
    await client.query(
      "delete from groupes_ecole where saison_id = $1",
      [saisonId],
    );
  }

  // 4. Insérer
  console.log(`📥 Insertion de ${GROUPES.length} groupes…`);
  let inserted = 0;
  for (const g of GROUPES) {
    const coachId = g.coach
      ? coachByName.get(g.coach) ?? coachByName.get(g.coach.replace("è", "e"))
      : null;
    if (g.coach && !coachId) {
      console.warn(`   ⚠ Coach "${g.coach}" introuvable — ignoré`);
    }
    await client.query(
      `insert into groupes_ecole (saison_id, jour, heure_debut, heure_fin, court, coach_id, niveau, capacite_max, notes, order_idx)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        saisonId,
        g.jour,
        g.heure_debut,
        g.heure_fin,
        g.court,
        coachId,
        g.niveau,
        g.capacite_max,
        g.notes || null,
        inserted * 10,
      ],
    );
    inserted++;
  }
  console.log(`✅ ${inserted} groupes insérés.`);

  // 5. Stats par jour
  const stats = await client.query(
    `select jour, count(*) as n from groupes_ecole
     where saison_id = $1
     group by jour
     order by jour`,
    [saisonId],
  );
  console.log("\n📊 Répartition par jour :");
  for (const row of stats.rows) {
    console.log(`   ${row.jour.padEnd(10)} : ${row.n} groupes`);
  }

  await client.end();
  console.log("\n✨ Import terminé.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
