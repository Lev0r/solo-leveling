export const BRAND_NAME = 'Solo Leveling';

export function BrandLogo({ height = 28 }: { height?: number }) {
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
        <filter
          id="brandGlow"
          x="-20%"
          y="-50%"
          width="140%"
          height="200%"
          filterUnits="userSpaceOnUse"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
          </feMerge>
        </filter>
      </defs>

      <text
        x="0"
        y="30"
        fill="url(#brandGradient)"
        filter="url(#brandGlow)"
        fontFamily="Syncopate, sans-serif"
        fontWeight="700"
        fontSize="22"
        letterSpacing="1"
        aria-hidden="true"
      >
        {BRAND_NAME}
      </text>

      <text
        x="0"
        y="30"
        fill="url(#brandGradient)"
        stroke="rgba(255, 255, 255, 0.9)"
        strokeWidth="0.4"
        paintOrder="stroke fill"
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
