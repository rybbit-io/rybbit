import type { ReactElement } from 'react';

interface GenerateOGImageProps {
  title: string;
  description?: string;
  logoSrc: string;
  label?: string;
}

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
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: '80px',
        backgroundColor: 'rgb(10, 10, 10)',
        color: 'white',
        fontFamily: 'Inter',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div
          style={{
            fontSize: title.length > 40 ? 60 : 76,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'white',
          }}
        >
          {title}
        </div>
        {description ? (
          <div
            style={{
              fontSize: description.length > 100 ? 36 : 42,
              lineHeight: 1.4,
              color: 'rgb(163, 163, 163)',
              maxWidth: '900px',
            }}
          >
            {description}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          height="40"
          style={{ height: '40px' }}
          alt=""
        />
        {label ? (
          <div
            style={{
              fontSize: 28,
              color: 'rgb(115, 115, 115)',
            }}
          >
            {label}
          </div>
        ) : null}
      </div>
    </div>
  );
}
