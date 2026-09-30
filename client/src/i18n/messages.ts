export function withEnglishFallback(
  english: Record<string, string>,
  translated: Record<string, string>
): Record<string, string> {
  const messages = { ...english };
  for (const [key, value] of Object.entries(translated)) {
    if (value.trim()) messages[key] = value;
  }
  return messages;
}
