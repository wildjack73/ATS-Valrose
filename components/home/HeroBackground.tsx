"use client";

/**
 * Décor du hero : balles de tennis flottantes + grille de court animée.
 * SVG pur + CSS animations (zéro JS au runtime).
 */
export function HeroBackground() {
  return (
    <>
      {/* Court lines en filigrane */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <rect
          x="100"
          y="80"
          width="1000"
          height="440"
          stroke="white"
          strokeWidth="2"
          fill="none"
        />
        <line x1="600" y1="80" x2="600" y2="520" stroke="white" strokeWidth="2" />
        <rect
          x="280"
          y="200"
          width="640"
          height="200"
          stroke="white"
          strokeWidth="2"
          fill="none"
        />
        <line x1="280" y1="300" x2="920" y2="300" stroke="white" strokeWidth="2" />
        <circle cx="600" cy="300" r="40" stroke="white" strokeWidth="2" fill="none" />
      </svg>

      {/* Balles flottantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingBall x="8%" y="20%" size={36} delay="0s" duration="8s" />
        <FloatingBall x="85%" y="15%" size={28} delay="1.5s" duration="10s" />
        <FloatingBall x="92%" y="70%" size={42} delay="3s" duration="12s" />
        <FloatingBall x="15%" y="78%" size={24} delay="0.8s" duration="9s" />
        <FloatingBall x="50%" y="85%" size={32} delay="2s" duration="11s" />
      </div>

      {/* Gradient mouvant en surcouche */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none animate-pulse-slow"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, rgba(45, 181, 214, 0.6) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(243, 197, 3, 0.3) 0%, transparent 50%)",
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
      <svg viewBox="0 0 64 64" className="w-full h-full opacity-30">
        <circle cx="32" cy="32" r="28" fill="#f3c503" />
        <path
          d="M5 32 Q32 12 59 32"
          stroke="white"
          strokeWidth="2"
          fill="none"
          opacity="0.4"
        />
        <path
          d="M5 32 Q32 52 59 32"
          stroke="white"
          strokeWidth="2"
          fill="none"
          opacity="0.4"
        />
      </svg>
    </div>
  );
}
