export function getTrackedPathname(url: URL, trackUrlFragments = false): string {
  if (url.hash.startsWith("#/")) {
    return url.hash.substring(1);
  }
  if (url.hash.startsWith("#!/")) {
    return url.hash.substring(2);
  }
  return url.pathname + (trackUrlFragments ? url.hash : "");
}
