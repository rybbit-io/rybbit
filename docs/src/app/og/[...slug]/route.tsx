import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { generateOGImage } from './generate';

const logoBase64 = readFile(
  join(process.cwd(), 'public/rybbit/horizontal_white.png'),
).then((buf) => `data:image/png;base64,${buf.toString('base64')}`);

async function loadInterFont(
  weight: 400 | 700,
): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&display=swap`,
  ).then((res) => res.text());

  const match = css.match(/src: url\((.+?)\) format\('(opentype|truetype|woff2?)'\)/);
  if (!match?.[1]) {
    throw new Error(`Could not load Inter ${weight} font`);
  }

  return fetch(match[1]).then((res) => res.arrayBuffer());
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;

  // Strip trailing "image.png" segment if present
  const pageSlug = slug[slug.length - 1] === 'image.png'
    ? slug.slice(0, -1)
    : slug;

  const page = source.getPage(pageSlug.length > 0 ? pageSlug : undefined);
  if (!page) notFound();

  const [interRegular, interBoldFont, logoSrc] = await Promise.all([
    loadInterFont(400),
    loadInterFont(700),
    logoBase64,
  ]);

  return new ImageResponse(
    generateOGImage({
      title: page.data.title,
      description: page.data.description,
      logoSrc,
      label: 'Docs',
    }),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: interRegular,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Inter',
          data: interBoldFont,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  );
}

export function generateStaticParams() {
  return source.generateParams().map((params) => {
    const slugs = params.slug ?? [];
    return { slug: [...slugs, 'image.png'] };
  });
}
