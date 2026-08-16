import { getSiteRouteContext } from "../lib/siteRoute";
import { useStore } from "../lib/store";
import { setPrivateKeyResolver } from "./requestContext";

// Imported once from the client provider tree. On the client the URL is the
// authority (a shared dashboard is /[site]/[privateKey]/...); on the server
// there is no URL to read, so fall back to whatever the store was seeded with.
setPrivateKeyResolver(() =>
  typeof window !== "undefined"
    ? getSiteRouteContext(globalThis.location.pathname).privateKey
    : useStore.getState().privateKey
);
