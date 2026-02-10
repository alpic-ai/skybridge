type SparkEffectProps = {
	className?: string;
	delay?: number;
};

export function SparkEffect({ className, delay = 0 }: SparkEffectProps) {
	return (
		<div
			className={`absolute ${className}`}
			style={{ animationDelay: `${delay}s` }}
		>
			<svg viewBox="0 0 20 20" className="w-full h-full">
				<circle cx="10" cy="10" r="3" fill="#fbbf24" />
				<circle cx="10" cy="10" r="6" fill="#fbbf24" opacity="0.5" />
				<circle cx="10" cy="10" r="9" fill="#fbbf24" opacity="0.2" />
			</svg>
		</div>
	);
}
