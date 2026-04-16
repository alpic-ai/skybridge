type PrisonBarsProps = { className?: string };

export function PrisonBars({ className }: PrisonBarsProps) {
  return (
    <svg viewBox="0 0 200 300" className={className} fill="none" stroke="currentColor" strokeWidth="8">
      <line x1="20" y1="0" x2="20" y2="300" />
      <line x1="50" y1="0" x2="50" y2="300" />
      <line x1="80" y1="0" x2="80" y2="300" />
      <line x1="110" y1="0" x2="110" y2="300" />
      <line x1="140" y1="0" x2="140" y2="300" />
      <line x1="170" y1="0" x2="170" y2="300" />
      <line x1="0" y1="50" x2="200" y2="50" />
      <line x1="0" y1="150" x2="200" y2="150" />
      <line x1="0" y1="250" x2="200" y2="250" />
    </svg>
  );
}
