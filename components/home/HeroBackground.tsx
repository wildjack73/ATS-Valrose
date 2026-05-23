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

      {/* ===== Balles flottantes ===== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingBall x="6%" y="18%" size={36} delay="0s" duration="8s" />
        <FloatingBall x="86%" y="14%" size={28} delay="1.5s" duration="10s" />
        <FloatingBall x="93%" y="72%" size={42} delay="3s" duration="12s" />
        <FloatingBall x="12%" y="80%" size={24} delay="0.8s" duration="9s" />
        <FloatingBall x="48%" y="88%" size={32} delay="2s" duration="11s" />
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
      <svg viewBox="0 0 64 64" className="w-full h-full opacity-40">
        <circle cx="32" cy="32" r="28" fill="#f3c503" />
        <path
          d="M5 32 Q32 12 59 32"
          stroke="white"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        />
        <path
          d="M5 32 Q32 52 59 32"
          stroke="white"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}
