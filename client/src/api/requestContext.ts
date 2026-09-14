/**
 * Where `authedFetch` gets the private key for shared-dashboard requests.
 *
 * The resolver is injected at app boot (see `installRequestContext`) so the
 * HTTP primitive itself does not reach into routing or the Zustand store — the
 * fetch path stays substitutable in tests.
 */
type PrivateKeyResolver = () => string | null;

let resolvePrivateKey: PrivateKeyResolver = () => null;

export function setPrivateKeyResolver(resolver: PrivateKeyResolver) {
  resolvePrivateKey = resolver;
}

export function getRequestPrivateKey(): string | null {
  return resolvePrivateKey();
}
