import Link from "next/link";

export const metadata = {
  title: "Inscription confirmée — ATS Valrose",
};

export default function StageConfirmationPage() {
  return (
    <div className="bg-cyan-club">
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-2xl bg-white p-8 sm:p-12 shadow-lg">
          <div className="mx-auto w-16 h-16 rounded-full bg-yellow-club/30 flex items-center justify-center mb-6">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="w-10 h-10 text-navy"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-navy">
            Inscription enregistrée&nbsp;!
          </h1>
          <p className="mt-4 text-gray-700">
            Vous allez recevoir un email de confirmation. Le club vous
            recontactera pour finaliser le règlement (espèces ou chèque).
          </p>
          <p className="mt-3 text-sm text-gray-500">
            Une question&nbsp;?{" "}
            <a
              className="text-navy underline font-semibold"
              href="https://padel-tennis-nice.fr/contact-padel-tennis-nice/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contactez le club
            </a>
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              href="/stages"
              className="rounded-lg bg-navy text-white px-4 py-2 text-sm font-semibold hover:bg-navy-dark"
            >
              Inscrire un autre enfant
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-navy text-navy px-4 py-2 text-sm font-semibold hover:bg-navy/5"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
