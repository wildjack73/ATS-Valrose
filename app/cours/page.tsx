import EcoleInscription from "../ecole/EcoleInscription";

// 60 s : mêmes raisons que /ecole (places restantes).
export const revalidate = 60;

export const metadata = {
  title: "Cours collectifs adultes — ATS Valrose",
  description:
    "Inscription aux cours collectifs adultes (tennis et padel) de l'ATS Valrose à Nice.",
};

/** Cours collectifs adultes — réutilise le formulaire École filtré sur
 *  les cours adultes. Route dédiée pour une URL propre + état actif du
 *  menu correct. */
export default function CoursPage() {
  return <EcoleInscription publicCible="adultes" />;
}
