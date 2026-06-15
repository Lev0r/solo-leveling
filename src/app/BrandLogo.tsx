export const BRAND_NAME = 'Solo Leveling';

export function BrandLogo({ height = 36 }: { height?: number }) {
  return (
    <svg
      role="img"
      aria-label={BRAND_NAME}
      height={height}
      viewBox="0 0 380 44"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="brandGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--work)" />
        </linearGradient>
      </defs>

      <text
        x="0"
        y="32"
        fill="url(#brandGradient)"
        stroke="rgba(255, 255, 255, 0.75)"
        strokeWidth="0.3"
        paintOrder="stroke fill"
        fontFamily="Syncopate, sans-serif"
        fontWeight="700"
        fontSize="24"
        letterSpacing="1"
      >
        {BRAND_NAME}
      </text>
    </svg>
  );
}
