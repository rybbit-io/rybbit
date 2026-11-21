import type { ReactElement } from 'react';

interface GenerateOGImageProps {
  title: string;
  description?: string;
  logoSrc: string;
  label?: string;
}

function titleFontSize(title: string): number {
  if (title.length <= 24) return 84;
  if (title.length <= 40) return 72;
  if (title.length <= 60) return 62;
  return 54;
}

// Jagged up-and-to-the-right series, echoing the product's sparklines
const CHART_POINTS =
  '0,178 60,150 120,168 180,122 240,146 300,98 360,128 420,84 480,110 540,64 600,94 660,50 720,80 780,58 840,90 900,44 960,70 1020,34 1080,56 1140,22 1200,40';

export function generateOGImage({
  title,
  description,
  logoSrc,
  label,
}: GenerateOGImageProps): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width: '100%',
        height: '100%',
        padding: '64px 72px',
        backgroundColor: 'rgb(13, 13, 13)',
        color: 'white',
        fontFamily: 'Inter',
        border: '1px solid rgb(38, 38, 38)',
      }}
    >
      {/* Emerald glow, top-left */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1200px',
          height: '630px',
          background:
            'radial-gradient(ellipse 800px 500px at 8% -10%, rgba(16, 185, 129, 0.13), transparent 65%)',
        }}
      />
      {/* Periwinkle glow, bottom-right */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1200px',
          height: '630px',
          background:
            'radial-gradient(ellipse 700px 400px at 95% 110%, rgba(179, 191, 255, 0.10), transparent 65%)',
        }}
      />
      {/* Data-line motif along the bottom */}
      <svg
        width="1200"
        height="220"
        viewBox="0 0 1200 220"
        style={{ position: 'absolute', bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(179, 191, 255)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="rgb(179, 191, 255)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,220 ${CHART_POINTS} 1200,220`}
          fill="url(#area)"
        />
        <polyline
          points={CHART_POINTS}
          fill="none"
          stroke="rgb(179, 191, 255)"
          strokeWidth="3"
          strokeOpacity="0.45"
          strokeLinejoin="round"
        />
      </svg>

      {/* Header: logo + label chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} height="44" style={{ height: '44px' }} alt="" />
        {label ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 24,
              fontWeight: 400,
              color: 'rgb(52, 211, 153)',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              padding: '8px 18px',
              borderRadius: '8px',
            }}
          >
            {label}
          </div>
        ) : null}
      </div>

      {/* Title + description, anchored to the lower half above the chart */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          justifyContent: 'center',
          gap: '24px',
          paddingBottom: '48px',
        }}
      >
        <div
          style={{
            display: 'block',
            lineClamp: 3,
            fontSize: titleFontSize(title),
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: '-0.025em',
            color: 'white',
            maxWidth: '1000px',
          }}
        >
          {title}
        </div>
        {description ? (
          <div
            style={{
              display: 'block',
              lineClamp: 2,
              fontSize: 32,
              lineHeight: 1.5,
              color: 'rgb(170, 170, 170)',
              maxWidth: '880px',
            }}
          >
            {description}
          </div>
        ) : null}
      </div>
    </div>
  );
}
