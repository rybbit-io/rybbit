'use client';

import { use, useEffect, useId, useState } from 'react';
import { useTheme } from 'next-themes';

export function Mermaid({ chart }: { chart: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <MermaidContent chart={chart} />;
}

const cache = new Map<string, Promise<unknown>>();

function cachePromise<T>(
  key: string,
  setPromise: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key);
  if (cached) return cached as Promise<T>;

  const promise = setPromise();
  cache.set(key, promise);
  return promise;
}

function MermaidContent({ chart }: { chart: string }) {
  const id = useId();
  const { resolvedTheme } = useTheme();
  const { default: mermaid } = use(
    cachePromise('mermaid', () => import('mermaid')),
  );

  const { svg, bindFunctions } = use(
    cachePromise(`${chart}-${resolvedTheme}-v3`, () => {
      if (resolvedTheme === 'dark') {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          fontFamily: 'inherit',
          theme: 'base',
          themeVariables: {
            darkMode: true,
            background: '#0f172a',
            primaryColor: '#1e40af',
            primaryTextColor: '#e2e8f0',
            primaryBorderColor: '#3b82f6',
            lineColor: '#64748b',
            secondaryColor: '#334155',
            tertiaryColor: '#475569',
            mainBkg: '#1e293b',
            secondBkg: '#334155',
            mainContrastColor: '#e2e8f0',
            darkTextColor: '#e2e8f0',
            border1: '#475569',
            border2: '#64748b',
            note: '#1e293b',
            noteBorder: '#475569',
            noteBkgColor: '#1e293b',
            noteTextColor: '#e2e8f0',
            text: '#e2e8f0',
            critical: '#dc2626',
            done: '#16a34a',
            activeText: '#e2e8f0',
            labelTextColor: '#e2e8f0',
            loopTextColor: '#e2e8f0',
            clusterBkg: '#1e293b',
            clusterBorder: '#475569',
            defaultLinkColor: '#64748b',
            edgeLabelBackground: '#1e293b',
            nodeTextColor: '#e2e8f0',
          },
        });
      } else {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          fontFamily: 'inherit',
          theme: 'default',
        });
      }
      return mermaid.render(id, chart.replaceAll('\\n', '\n'));
    }),
  );

  return (
    <div
      ref={(container) => {
        if (container) bindFunctions?.(container);
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
