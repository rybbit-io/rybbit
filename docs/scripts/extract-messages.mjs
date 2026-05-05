import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { unstable_extractMessages } from 'next-intl/extractor';

const messagesDir = './messages';

await unstable_extractMessages({
  srcPath: './src',
  sourceLocale: 'en',
  messages: {
    path: messagesDir,
    format: 'json',
    locales: ['en', 'de', 'fr', 'zh', 'es', 'pl', 'it', 'ko', 'pt', 'ja'],
  },
});

for (const file of readdirSync(messagesDir)) {
  if (!file.endsWith('.json')) continue;
  const path = join(messagesDir, file);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const sorted = Object.fromEntries(
    Object.keys(data)
      .sort()
      .map((k) => [k, data[k]])
  );
  writeFileSync(path, JSON.stringify(sorted, null, 2) + '\n');
}
