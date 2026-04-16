type SilhouetteProps = { className?: string };

export function SilhouetteLeaning({ className }: SilhouetteProps) {
  return (
    <svg viewBox="0 0 140 300" className={className} fill="currentColor">
      <ellipse cx="70" cy="32" rx="20" ry="24" />
      <rect x="62" y="54" width="16" height="12" />
      <path d="M35 65 L105 65 L110 75 L108 120 L32 120 L30 75 Z" />
      <ellipse cx="70" cy="115" rx="35" ry="18" />
      <ellipse cx="70" cy="115" rx="30" ry="14" fill="rgba(0,0,0,0.5)" />
      <path d="M40 118 L100 118 L95 175 L45 175 Z" />
      <path d="M45 173 L35 290 L50 295 L60 180 L80 180 L90 295 L105 290 L95 173 Z" />
      <path d="M50 18 Q70 5 90 18 L88 32 L52 32 Z" />
    </svg>
  );
}
