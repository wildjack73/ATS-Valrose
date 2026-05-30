/**
 * Set d'icônes SVG sobres (style Lucide/Feather) pour l'admin.
 * Remplace les emojis utilisés dans la navigation et les en-têtes,
 * pour un rendu plus professionnel.
 */

type IconProps = {
  className?: string;
  size?: number;
};

const base = "shrink-0";

function S({
  size = 16,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${base} ${className ?? ""}`}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconStages(props: IconProps) {
  // Calendrier (stages = créneaux de vacances)
  return (
    <S {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </S>
  );
}

export function IconEcole(props: IconProps) {
  // Bâtiment / école
  return (
    <S {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V8l7-5 7 5v13" />
      <path d="M10 21v-6h4v6" />
    </S>
  );
}

export function IconTarifs(props: IconProps) {
  // Étiquette de prix
  return (
    <S {...props}>
      <path d="M20.59 13.41L13.41 20.59a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.2" fill="currentColor" />
    </S>
  );
}

export function IconPlanning(props: IconProps) {
  // Grille / planning
  return (
    <S {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 3v18" />
    </S>
  );
}

export function IconCoachs(props: IconProps) {
  // Groupe de personnes
  return (
    <S {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </S>
  );
}

export function IconCheck(props: IconProps) {
  // Liste à cocher
  return (
    <S {...props}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </S>
  );
}

export function IconAnnuaire(props: IconProps) {
  // Carnet d'adresses
  return (
    <S {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </S>
  );
}

export function IconArchive(props: IconProps) {
  return (
    <S {...props}>
      <path d="M21 8v13H3V8" />
      <path d="M1 3h22v5H1zM10 12h4" />
    </S>
  );
}

export function IconEncaissements(props: IconProps) {
  // Portefeuille / euro
  return (
    <S {...props}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </S>
  );
}

export function IconChart(props: IconProps) {
  // Graphe pour le titre dashboard
  return (
    <S {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 14l3-3 4 4 5-6" />
    </S>
  );
}

export function IconBuilding(props: IconProps) {
  // Court / installation
  return (
    <S {...props}>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M12 4v16M3 12h18" />
    </S>
  );
}

export function IconMail(props: IconProps) {
  return (
    <S {...props}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="M22 6l-10 7L2 6" />
    </S>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <S {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.95.36 1.87.7 2.75a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.33-1.33a2 2 0 0 1 2.11-.45c.88.34 1.8.57 2.75.7A2 2 0 0 1 22 16.92z" />
    </S>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <S {...props}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
    </S>
  );
}
