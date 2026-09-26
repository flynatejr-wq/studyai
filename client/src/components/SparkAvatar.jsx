// The AI tutor's mascot — a small four-point sparkle character. Animation is
// pure CSS (see index.css .spark-idle/.spark-thinking), so this never touches
// the API — no tokens, no network cost, just a static SVG asset in motion.
const STAR_PATH = "M 47.88 14.15 Q 50.00 8.00 52.12 14.15 L 59.01 34.15 Q 60.25 37.75 63.85 38.99 L 83.85 45.88 Q 90.00 48.00 83.85 50.12 L 63.85 57.01 Q 60.25 58.25 59.01 61.85 L 52.12 81.85 Q 50.00 88.00 47.88 81.85 L 40.99 61.85 Q 39.75 58.25 36.15 57.01 L 16.15 50.12 Q 10.00 48.00 16.15 45.88 L 36.15 38.99 Q 39.75 37.75 40.99 34.15 Z";

export default function SparkAvatar({ size = 32, variant = "idle", className = "" }) {
  const anim = variant === "thinking" ? "spark-thinking" : variant === "none" ? "" : "spark-idle";
  return (
    <svg
      width={size} height={size} viewBox="0 0 100 96"
      className={`${anim} ${className}`}
      aria-label="Spark, the StudyBuddi AI tutor"
    >
      <defs>
        <linearGradient id="spark-body" x1="0.15" y1="0.05" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="45%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <radialGradient id="spark-sheen" cx="34%" cy="26%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={STAR_PATH} fill="url(#spark-body)" />
      <path d={STAR_PATH} fill="url(#spark-sheen)" />
      <g>
        <ellipse cx="40" cy="45" rx="6.5" ry="7.5" fill="#1e1b4b" className="spark-eye" />
        <ellipse cx="60" cy="45" rx="6.5" ry="7.5" fill="#1e1b4b" className="spark-eye" />
        <circle cx="42.2" cy="42.5" r="2" fill="#fff" />
        <circle cx="62.2" cy="42.5" r="2" fill="#fff" />
      </g>
      <path d="M42 60 Q50 68 58 60" stroke="#1e1b4b" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
