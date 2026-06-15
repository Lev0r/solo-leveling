export const BRAND_NAME = 'SoloLeveling';

export function BrandLogo({ height = 32 }: { height?: number }) {
  return (
    <svg
      role="img"
      aria-label={BRAND_NAME}
      height={height}
      viewBox="0 0 340 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="brandGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--work)" />
        </linearGradient>
        <filter id="brandGlow" x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <text
        x="0"
        y="28"
        fill="url(#brandGradient)"
        filter="url(#brandGlow)"
        fontFamily="Syncopate, sans-serif"
        fontWeight="700"
        fontSize="22"
        letterSpacing="1"
      >
        {BRAND_NAME}
      </text>
    </svg>
  );
}
