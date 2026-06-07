import EcoleInscription from "./EcoleInscription";

export const dynamic = "force-dynamic";

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
