"use client";

/**
 * Décor du hero : court de tennis détaillé en filigrane + balles flottantes.
 * SVG pur + CSS animations (zéro JS au runtime).
 */
export function HeroBackground() {
  return (
    <>
      {/* ===== Court de tennis vue de dessus (orientation paysage) =====
          baselines à gauche/droite, filet vertical au centre */}
      <svg
        className="absolute inset-0 w-full h-full opacity-25 pointer-events-none"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {/* Léger remplissage de surface */}
        <rect
          x="60"
          y="80"
          width="1080"
          height="440"
          fill="white"
          opacity="0.03"
        />

        <g
          stroke="white"
          strokeWidth="3"
          fill="none"
          strokeLinejoin="miter"
          strokeLinecap="square"
        >
          {/* Bord extérieur (doubles) */}
          <rect x="60" y="80" width="1080" height="440" />

          {/* Couloirs (singles sidelines) — lignes parallèles aux baselines */}
          <line x1="60" y1="120" x2="1140" y2="120" />
          <line x1="60" y1="480" x2="1140" y2="480" />

          {/* Lignes de service (verticales, parallèles au filet) */}
          <line x1="400" y1="120" x2="400" y2="480" />
          <line x1="800" y1="120" x2="800" y2="480" />

          {/* Ligne médiane de service (entre les 2 lignes de service) */}
          <line x1="400" y1="300" x2="800" y2="300" />

          {/* Center marks au milieu des baselines (gauche + droite) */}
          <line x1="60" y1="300" x2="84" y2="300" strokeWidth="4" />
          <line x1="1116" y1="300" x2="1140" y2="300" strokeWidth="4" />

          {/* Filet (vertical, plus épais) */}
          <line x1="600" y1="80" x2="600" y2="520" strokeWidth="5" />
        </g>

        {/* Maille du filet (pointillés en surcouche) */}
        <line
          x1="600"
          y1="80"
          x2="600"
          y2="520"
          stroke="white"
          strokeWidth="18"
          strokeDasharray="3 5"
          opacity="0.25"
        />
      </svg>

      {/* ===== Balles flottantes (dans les coins, pas au centre) ===== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingBall x="4%" y="14%" size={28} delay="0s" duration="9s" />
        <FloatingBall x="93%" y="10%" size={24} delay="1.5s" duration="11s" />
        <FloatingBall x="95%" y="78%" size={32} delay="3s" duration="12s" />
        <FloatingBall x="3%" y="82%" size={26} delay="0.8s" duration="10s" />
      </div>

      {/* ===== Gradient lumineux mouvant ===== */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none animate-pulse-slow"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, rgba(45, 181, 214, 0.55) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(243, 197, 3, 0.25) 0%, transparent 50%)",
        }}
      />
    </>
  );
}

function FloatingBall({
  x,
  y,
  size,
  delay,
  duration,
}: {
  x: string;
  y: string;
  size: number;
  delay: string;
  duration: string;
}) {
  // ID unique pour les gradients SVG (sinon ils se chevauchent entre balles)
  const uid = `${x}-${y}-${size}`.replace(/[^a-z0-9]/gi, "");

  return (
    <div
      className="absolute animate-float"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        animationDelay: delay,
        animationDuration: duration,
      }}
    >
      <svg viewBox="0 0 80 80" className="w-full h-full opacity-70">
        <defs>
          <radialGradient id={`fb-grad-${uid}`} cx="35%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#f6fc7d" />
            <stop offset="55%" stopColor="#c8d935" />
            <stop offset="100%" stopColor="#7a9019" />
          </radialGradient>
        </defs>

        {/* Boule */}
        <circle cx="40" cy="40" r="34" fill={`url(#fb-grad-${uid})`} />

        {/* Une seule couture en S — plus iconique à petite taille */}
        <path
          d="M 12 30 Q 26 46 40 36 T 68 32"
          stroke="white"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.95"
        />
      </svg>
    </div>
  );
}
