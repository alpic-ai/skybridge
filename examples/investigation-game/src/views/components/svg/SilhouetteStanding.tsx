type SilhouetteProps = { className?: string };

export function SilhouetteStanding({ className }: SilhouetteProps) {
  return (
    <svg viewBox="0 0 120 300" className={className} fill="currentColor">
      <ellipse cx="60" cy="30" rx="22" ry="26" />
      <ellipse cx="60" cy="12" rx="32" ry="8" />
      <rect x="35" y="4" width="50" height="14" rx="4" />
      <rect x="52" y="54" width="16" height="15" />
      <path d="M30 68 L45 68 L48 65 L72 65 L75 68 L90 68 L95 75 L100 180 L85 185 L85 290 L70 295 L70 185 L50 185 L50 295 L35 290 L35 185 L20 180 L25 75 Z" />
      <path d="M48 68 L60 95 L72 68" fill="rgba(0,0,0,0.3)" />
      <path d="M25 75 L10 140 L15 145 L32 85" />
      <path d="M95 75 L110 140 L105 145 L88 85" />
    </svg>
  );
}
