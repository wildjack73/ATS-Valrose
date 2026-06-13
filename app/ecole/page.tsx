import EcoleInscription from "./EcoleInscription";

// 60 s : les compteurs de places restantes doivent rester assez frais.
export const revalidate = 60;

export const metadata = {
  title: "Inscription École de Tennis — ATS Valrose",
  description:
    "Inscription annuelle à l'École de Tennis Valrose : tennis, padel.",
};

export default async function EcolePage({
  searchParams,
}: {
  searchParams: Promise<{ public?: string }>;
}) {
  const sp = await searchParams;
  const publicCible: "jeunes" | "adultes" | undefined =
    sp.public === "adultes"
      ? "adultes"
      : sp.public === "jeunes"
        ? "jeunes"
        : undefined;

  return <EcoleInscription publicCible={publicCible} />;
}
