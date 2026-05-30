import { getActiveTarifsBundle } from "@/lib/data/tarifs-server";
import { fetchSlotsOccupesEcole } from "@/lib/data/ecole-slots";
import EcoleForm from "./EcoleForm";

export const dynamic = "force-dynamic";

// ============================================================================
// 📅 Bandeau Journées Portes Ouvertes — à METTRE À JOUR chaque année.
// Si on est avant `visibleJusquAu`, le bandeau s'affiche en haut du
// formulaire. Au-delà de cette date il disparaît automatiquement.
// Pour la rentrée suivante :
//   1) Changer visibleJusquAu (= lendemain de la dernière JPO)
//   2) Mettre à jour anneeScolaire, reprise et la liste jours[]
// ============================================================================
const JPO = {
  visibleJusquAu: "2026-09-06", // YYYY-MM-DD
  anneeScolaire: "2026/2027",
  reprise: "mercredi 9 septembre 2026",
  jours: [
    { label: "Mardi 1ᵉʳ septembre", creneaux: "17h – 20h" },
    { label: "Mercredi 2 septembre", creneaux: "9h – 12h et 13h30 – 18h" },
    { label: "Jeudi 3 septembre", creneaux: "17h – 20h" },
    { label: "Vendredi 4 septembre", creneaux: "17h – 20h" },
    { label: "Samedi 5 septembre", creneaux: "9h – 12h et 13h30 – 18h" },
  ],
};

export const metadata = {
  title: "Inscription École de Tennis — ATS Valrose",
  description:
    "Inscription annuelle à l'École de Tennis Valrose : tennis, padel.",
};

export default async function EcolePage() {
  const bundle = await getActiveTarifsBundle();

  if (!bundle) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-navy">
          Inscriptions temporairement indisponibles
        </h1>
        <p className="mt-3 text-gray-600">
          Aucune saison active n&apos;est configurée.{" "}
          <a
            className="text-navy underline font-semibold"
            href="https://padel-tennis-nice.fr/contact-padel-tennis-nice/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contactez le club
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-gradient-to-br from-clay via-ocre to-ocre-light text-white">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            École de Tennis — {bundle.saisonEcole.label}
          </h1>
          <p className="mt-3 text-white/90">
            Inscription annuelle aux cours de tennis et de padel de
            l&apos;ATS&nbsp;Valrose.
          </p>
        </div>
      </section>
      <section>
        {Date.now() < new Date(JPO.visibleJusquAu).getTime() ? (
          <div className="mx-auto max-w-3xl px-4 pt-8">
            <div className="rounded-2xl border-2 border-ocre/40 bg-ocre-pale/40 p-5 sm:p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0" aria-hidden>
                  ℹ️
                </span>
                <div className="space-y-3 text-sm sm:text-base text-navy">
                  <p>
                    <strong>
                      Les inscriptions seront validées uniquement suite à la
                      participation aux journées portes ouvertes.
                    </strong>{" "}
                    Votre enfant pourra essayer une fois dans son groupe avant
                    une inscription définitive.
                  </p>

                  <div>
                    <p className="font-bold text-clay mb-2">
                      📅 Journées portes ouvertes au club
                    </p>
                    <ul className="space-y-1 text-sm">
                      {JPO.jours.map((j) => (
                        <li key={j.label}>
                          <strong>{j.label}</strong> · {j.creneaux}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-sm">
                    🎾{" "}
                    <strong>
                      Reprise des cours de tennis {JPO.anneeScolaire}
                    </strong>{" "}
                    : {JPO.reprise}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className="mx-auto max-w-3xl px-4 py-10">
          <EcoleForm
            bundle={bundle}
            slotsOccupes={await fetchSlotsOccupesEcole(bundle.saisonEcole.id)}
          />
        </div>
      </section>
    </div>
  );
}
