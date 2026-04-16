type LightningProps = { className?: string };

export function LightningBolt({ className }: LightningProps) {
  return (
    <svg viewBox="0 0 60 350" className={className} fill="currentColor">
      <path d="M35 0 L15 80 L28 80 L8 160 L22 160 L0 260 L18 260 L-5 350 L45 270 L28 270 L48 175 L34 175 L52 90 L38 90 L55 0 Z" />
    </svg>
  );
}
