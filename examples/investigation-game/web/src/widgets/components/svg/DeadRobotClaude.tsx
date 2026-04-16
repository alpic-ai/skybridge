type DeadRobotProps = { className?: string };

export function DeadRobotClaude({ className }: DeadRobotProps) {
  return (
    <svg viewBox="0 0 300 200" className={className}>
      <g transform="rotate(-25, 150, 100)">
        <rect x="100" y="60" width="80" height="100" rx="10" fill="#4a5568" stroke="#2d3748" strokeWidth="3" />
        <rect x="115" y="75" width="50" height="40" rx="5" fill="#1a202c" stroke="#718096" strokeWidth="2" />
        <circle cx="140" cy="95" r="8" fill="#2d3748" stroke="#4a5568" strokeWidth="2" />
        <rect x="110" y="20" width="60" height="45" rx="8" fill="#4a5568" stroke="#2d3748" strokeWidth="3" />
        <rect x="118" y="28" width="44" height="30" rx="4" fill="#1a202c" />
        <g fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round">
          <line x1="128" y1="38" x2="136" y2="48" />
          <line x1="136" y1="38" x2="128" y2="48" />
          <line x1="144" y1="38" x2="152" y2="48" />
          <line x1="152" y1="38" x2="144" y2="48" />
        </g>
        <path
          d="M145 28 L150 35 L147 40 L155 50 L152 55"
          fill="none"
          stroke="#4a5568"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line x1="140" y1="20" x2="140" y2="8" stroke="#718096" strokeWidth="3" />
        <circle cx="140" cy="6" r="4" fill="#2d3748" stroke="#718096" strokeWidth="2" />
        <rect x="70" y="70" width="35" height="18" rx="8" fill="#4a5568" stroke="#2d3748" strokeWidth="2" />
        <rect x="55" y="72" width="20" height="14" rx="6" fill="#4a5568" stroke="#2d3748" strokeWidth="2" />
        <rect x="175" y="85" width="35" height="18" rx="8" fill="#4a5568" stroke="#2d3748" strokeWidth="2" />
        <rect x="205" y="87" width="20" height="14" rx="6" fill="#4a5568" stroke="#2d3748" strokeWidth="2" />
        <rect x="105" y="155" width="25" height="40" rx="6" fill="#4a5568" stroke="#2d3748" strokeWidth="2" />
        <rect x="103" y="190" width="29" height="12" rx="4" fill="#2d3748" stroke="#1a202c" strokeWidth="2" />
        <rect x="150" y="155" width="25" height="40" rx="6" fill="#4a5568" stroke="#2d3748" strokeWidth="2" />
        <rect x="148" y="190" width="29" height="12" rx="4" fill="#2d3748" stroke="#1a202c" strokeWidth="2" />
        <circle cx="160" cy="130" r="6" fill="#1a202c" stroke="#ef4444" strokeWidth="1" />
        <circle cx="125" cy="140" r="4" fill="#1a202c" stroke="#ef4444" strokeWidth="1" />
      </g>
    </svg>
  );
}
