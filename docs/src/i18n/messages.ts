export function withEnglishFallback(
  english: Record<string, string>,
  localized: Record<string, string>
): Record<string, string> {
  return {
    ...english,
    ...Object.fromEntries(Object.entries(localized).filter(([, value]) => value.trim() !== "")),
  };
}
