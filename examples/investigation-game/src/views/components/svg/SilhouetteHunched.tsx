type SilhouetteProps = { className?: string };

export function SilhouetteHunched({ className }: SilhouetteProps) {
  return (
    <svg viewBox="0 0 150 300" className={className} fill="currentColor">
      <path d="M55 15 Q75 0 95 15 Q110 30 105 55 L95 60 L55 60 L45 55 Q40 30 55 15" />
      <ellipse cx="75" cy="42" rx="14" ry="16" fill="rgba(0,0,0,0.4)" />
      <rect x="67" y="58" width="16" height="10" />
      <path d="M25 68 Q75 55 125 68 L130 85 Q130 120 120 150 L115 200 L100 205 L100 290 L80 295 L80 205 L70 205 L70 295 L50 290 L50 205 L35 200 L30 150 Q20 120 20 85 Z" />
      <ellipse cx="45" cy="130" rx="18" ry="25" fill="rgba(0,0,0,0.3)" />
      <ellipse cx="105" cy="130" rx="18" ry="25" fill="rgba(0,0,0,0.3)" />
    </svg>
  );
}
