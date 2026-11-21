import { useEffect, useState } from "react";
import { TraitKey } from "@/api/analytics/endpoints";
import { ColumnSelection, DEFAULT_BUILT_IN, defaultTraitColumns, parseColumnSelection } from "./columns";

const storageKey = (site: string) => `rybbit-users-columns-${site}`;

// Storage can be unavailable (private mode, blocked site data); the picker then works for the visit only.
function readStored(site: string): ColumnSelection | null {
  try {
    return parseColumnSelection(localStorage.getItem(storageKey(site)));
  } catch {
    return null;
  }
}

function writeStored(site: string, selection: ColumnSelection) {
  try {
    localStorage.setItem(storageKey(site), JSON.stringify(selection));
  } catch {
    // Nothing to do: the choice still applies until the page is left.
  }
}

/**
 * The columns the viewer has chosen for this site, remembered in the browser.
 * Until they choose, the site's most common traits are shown beside the
 * default built-in columns.
 */
export function useColumnSelection(site: string, traitKeys: TraitKey[] | undefined) {
  const [stored, setStored] = useState<{ site: string; selection: ColumnSelection | null } | null>(null);

  // Read after mount: the server render has no storage, and the first client
  // render has to match it.
  useEffect(() => {
    setStored({ site, selection: site ? readStored(site) : null });
  }, [site]);

  const chosen = stored?.site === site ? stored.selection : null;
  const selection: ColumnSelection = chosen ?? {
    builtIn: DEFAULT_BUILT_IN,
    traits: defaultTraitColumns(traitKeys ?? []),
  };

  const setSelection = (next: ColumnSelection) => {
    setStored({ site, selection: next });
    if (site) writeStored(site, next);
  };

  return { selection, setSelection };
}
