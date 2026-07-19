import type { ReactElement } from 'react';

interface GenerateOGImageProps {
  title: string;
  description?: string;
  logoSrc: string;
  label?: string;
  path?: string;
}

const TRAFFIC_LINE =
  'M0 39 L18 39 L31 38 L48 40 L65 34 L79 35 L96 30 L112 32 L129 24 L144 28 L163 20 L179 23 L196 17 L212 22 L228 14 L245 18 L262 11 L279 16 L296 8 L313 12 L330 5';

function truncateText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;

  const shortened = normalized.slice(0, maxLength + 1);
  const lastSpace = shortened.lastIndexOf(' ');
  const cutoff = lastSpace > maxLength * 0.7 ? lastSpace : maxLength;

  const candidate = shortened.slice(0, cutoff).trimEnd();
  const cleanEnding = candidate.replace(
    /\s+(?:a|an|the|and|or|to|of|in|on|for|with)$/i,
    '',
  );

  return `${cleanEnding}\u2026`;
}

function getTitleFontSize(length: number): number {
  if (length > 78) return 46;
  if (length > 58) return 52;
  if (length > 38) return 58;
  if (length > 24) return 66;
  return 74;
}

export function generateOGImage({
  title,
  description,
  logoSrc,
  label,
  path,
}: GenerateOGImageProps): ReactElement {
  const displayTitle = truncateText(title, 96);
  const displayDescription = description
    ? truncateText(description, 156)
    : undefined;
  const footerPath = path ? `rybbit.com/docs/${path}` : 'rybbit.com';

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '48px 56px 40px',
        overflow: 'hidden',
        backgroundColor: '#141414',
        color: '#fafafa',
        fontFamily: 'Inter',
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          inset: 24,
          border: '1px solid #292929',
          borderRadius: 5,
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 55,
          paddingBottom: 22,
          borderBottom: '1px solid #2d2d2d',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width="159"
          height="32"
          style={{ width: '159px', height: '32px' }}
          alt=""
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#d4d4d4',
            fontSize: 21,
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 9,
              height: 9,
              borderRadius: 1,
              backgroundColor: '#10b981',
            }}
          />
          {label ?? 'Analytics'}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '28px 24px 26px',
        }}
      >
        <div
          style={{
            display: 'flex',
            maxWidth: 1000,
            fontSize: getTitleFontSize(displayTitle.length),
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: '-0.035em',
            color: '#fafafa',
          }}
        >
          {displayTitle}
        </div>
        {displayDescription ? (
          <div
            style={{
              display: 'flex',
              maxWidth: 920,
              marginTop: 18,
              fontSize: displayDescription.length > 118 ? 27 : 30,
              fontWeight: 400,
              lineHeight: 1.38,
              letterSpacing: '-0.01em',
              color: '#b3b3b3',
            }}
          >
            {displayDescription}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 58,
          padding: '17px 8px 0',
          borderTop: '1px solid #2d2d2d',
        }}
      >
        <div
          style={{
            display: 'flex',
            maxWidth: 660,
            overflow: 'hidden',
            color: '#8f8f8f',
            fontSize: 19,
            fontWeight: 400,
            lineHeight: 1,
          }}
        >
          {footerPath}
        </div>
        <svg
          width="330"
          height="44"
          viewBox="0 0 330 44"
          fill="none"
          aria-hidden="true"
        >
          <path
            d={`${TRAFFIC_LINE} L330 44 L0 44 Z`}
            fill="rgba(179, 191, 255, 0.07)"
          />
          <path
            d={TRAFFIC_LINE}
            stroke="#b3bfff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="330" cy="5" r="3.5" fill="#b3bfff" />
        </svg>
      </div>
    </div>
  );
}
