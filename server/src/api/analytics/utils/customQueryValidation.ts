export const MAX_CUSTOM_QUERY_LENGTH = 20_000;

const blockedKeywords = [
  "ALTER",
  "ATTACH",
  "BACKUP",
  "CREATE",
  "DELETE",
  "DESCRIBE",
  "DETACH",
  "DROP",
  "EXCHANGE",
  "EXPLAIN",
  "FORMAT",
  "GRANT",
  "INFILE",
  "INSERT",
  "INTO",
  "KILL",
  "OPTIMIZE",
  "OUTFILE",
  "RENAME",
  "RESTORE",
  "REVOKE",
  "SET",
  "SETTINGS",
  "SHOW",
  "SYSTEM",
  "TRUNCATE",
  "USE",
  "WATCH",
] as const;

const blockedFunctions = [
  "azureBlobStorage",
  "azureBlobStorageCluster",
  "cluster",
  "clusterAllReplicas",
  "cosn",
  "deltaLake",
  "dictionary",
  "executable",
  "file",
  "format",
  "gcs",
  "generateRandom",
  "hdfs",
  "hdfsCluster",
  "hudi",
  "iceberg",
  "icebergCluster",
  "input",
  "jdbc",
  "kafka",
  "loop",
  "meilisearch",
  "merge",
  "mergeTreeIndex",
  "mongodb",
  "mysql",
  "nats",
  "numbers",
  "odbc",
  "postgresql",
  "prometheus",
  "rabbitmq",
  "redis",
  "remote",
  "remoteSecure",
  "s3",
  "s3Cluster",
  "sqlite",
  "url",
  "urlCluster",
  "values",
  "view",
  "viewIfPermitted",
] as const;

const quotedIdentifierError = "Quoted identifiers are not allowed in custom analytics queries";

export function hasQuotedIdentifierSyntax(query: string) {
  let index = 0;
  let state: "normal" | "single" | "line-comment" | "block-comment" = "normal";

  while (index < query.length) {
    const char = query[index];
    const next = query[index + 1];

    if (state === "normal") {
      if (char === '"' || char === "`") {
        return true;
      }
      if (char === "'") {
        state = "single";
      } else if (char === "-" && next === "-") {
        state = "line-comment";
        index++;
      } else if (char === "/" && next === "*") {
        state = "block-comment";
        index++;
      }
    } else if (state === "single") {
      if (char === "\\" && next !== undefined) {
        index++;
      } else if (char === "'" && next === "'") {
        index++;
      } else if (char === "'") {
        state = "normal";
      }
    } else if (state === "line-comment") {
      if (char === "\n") {
        state = "normal";
      }
    } else if (state === "block-comment") {
      if (char === "*" && next === "/") {
        state = "normal";
        index++;
      }
    }

    index++;
  }

  return false;
}

export function stripSqlLiteralsAndComments(query: string) {
  let result = "";
  let index = 0;
  let state: "normal" | "single" | "double" | "backtick" | "line-comment" | "block-comment" = "normal";

  while (index < query.length) {
    const char = query[index];
    const next = query[index + 1];

    if (state === "normal") {
      if (char === "'") {
        state = "single";
        result += " ";
      } else if (char === '"') {
        state = "double";
        result += " ";
      } else if (char === "`") {
        state = "backtick";
        result += " ";
      } else if (char === "-" && next === "-") {
        state = "line-comment";
        result += "  ";
        index++;
      } else if (char === "/" && next === "*") {
        state = "block-comment";
        result += "  ";
        index++;
      } else {
        result += char;
      }
    } else if (state === "single") {
      if (char === "\\" && next !== undefined) {
        result += "  ";
        index++;
      } else if (char === "'" && next === "'") {
        result += "  ";
        index++;
      } else if (char === "'") {
        state = "normal";
        result += " ";
      } else {
        result += char === "\n" ? "\n" : " ";
      }
    } else if (state === "double") {
      if (char === "\\" && next !== undefined) {
        result += "  ";
        index++;
      } else if (char === '"') {
        state = "normal";
        result += " ";
      } else {
        result += char === "\n" ? "\n" : " ";
      }
    } else if (state === "backtick") {
      if (char === "`") {
        state = "normal";
      }
      result += " ";
    } else if (state === "line-comment") {
      if (char === "\n") {
        state = "normal";
        result += "\n";
      } else {
        result += " ";
      }
    } else if (state === "block-comment") {
      if (char === "*" && next === "/") {
        state = "normal";
        result += "  ";
        index++;
      } else {
        result += char === "\n" ? "\n" : " ";
      }
    }

    index++;
  }

  return result;
}

export function normalizeCustomQuery(query: string) {
  return query.trim().replace(/;+$/g, "").trim();
}

export function getCteNames(query: string) {
  const cteNames = new Set<string>();
  const ctePattern = /(?:\bWITH|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s*\(/gi;
  let match: RegExpExecArray | null;

  while ((match = ctePattern.exec(query)) !== null) {
    cteNames.add(match[1].toLowerCase());
  }

  return cteNames;
}

// Identifiers that end a FROM clause's comma-separated table list. Once one of these
// appears at the top paren level, later commas belong to another clause (GROUP BY,
// ORDER BY, a UNIONed SELECT, …) rather than the table list.
const fromClauseTerminators = new Set([
  "where",
  "prewhere",
  "group",
  "having",
  "order",
  "limit",
  "settings",
  "union",
  "intersect",
  "except",
  "window",
  "qualify",
  "format",
  "into",
]);

function isIdentifierStart(char: string) {
  return /[A-Za-z_]/.test(char);
}

function isIdentifierChar(char: string) {
  return /[A-Za-z0-9_.]/.test(char);
}

function readIdentifier(query: string, start: number): [string, number] {
  let end = start;
  while (end < query.length && isIdentifierChar(query[end])) {
    end++;
  }
  return [query.slice(start, end), end];
}

function skipWhitespace(query: string, index: number): number {
  while (index < query.length && /\s/.test(query[index])) {
    index++;
  }
  return index;
}

// Collect every directly-named table reference in the query. Covers the table after
// each FROM/JOIN and every comma-separated entry in a FROM list (`FROM a, b`), which
// a FROM/JOIN-keyword-only scan would miss. Subquery references (`FROM ( SELECT … )`)
// are skipped here — their inner FROM/JOIN clauses are reached by this same scan.
export function collectTableReferences(query: string): string[] {
  const references: string[] = [];
  const length = query.length;

  // Record the table reference that follows a FROM / JOIN / comma when it is a plain
  // identifier; subqueries and anything else are left to the surrounding scan.
  const readReference = (index: number) => {
    const start = skipWhitespace(query, index);
    if (start < length && isIdentifierStart(query[start])) {
      references.push(readIdentifier(query, start)[0]);
    }
  };

  // Match ARRAY JOIN ahead of a bare JOIN so its inner JOIN isn't rescanned.
  const keywordPattern = /\b(ARRAY\s+JOIN|FROM|JOIN)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = keywordPattern.exec(query)) !== null) {
    const afterKeyword = match.index + match[0].length;
    const keyword = match[1].toLowerCase();

    // ARRAY JOIN takes an array expression (a column or function like
    // mapKeys(...)), not a table reference — skip it.
    if (keyword.includes("array")) {
      continue;
    }

    // A JOIN introduces exactly one table reference.
    if (keyword === "join") {
      readReference(afterKeyword);
      continue;
    }

    // A FROM introduces a comma-separated table list. Read the first reference, then
    // walk the clause tracking paren depth and pick up every top-level comma entry.
    readReference(afterKeyword);

    let depth = 0;
    let index = afterKeyword;
    while (index < length) {
      const char = query[index];
      if (char === "(") {
        depth++;
        index++;
      } else if (char === ")") {
        if (depth === 0) {
          break; // a closing paren that ends an enclosing subquery — clause is done
        }
        depth--;
        index++;
      } else if (char === "," && depth === 0) {
        readReference(index + 1);
        index++;
      } else if (depth === 0 && isIdentifierStart(char)) {
        const [word, end] = readIdentifier(query, index);
        if (fromClauseTerminators.has(word.toLowerCase())) {
          break;
        }
        index = end; // an alias or join keyword — skip past it
      } else {
        index++;
      }
    }
  }

  return references;
}

export function collectInTableReferences(query: string): string[] {
  const references: string[] = [];
  const inPattern = /\b(?:GLOBAL\s+)?(?:NOT\s+)?IN\b/gi;
  let match: RegExpExecArray | null;

  while ((match = inPattern.exec(query)) !== null) {
    const start = skipWhitespace(query, match.index + match[0].length);
    if (start < query.length && isIdentifierStart(query[start])) {
      const [identifier, end] = readIdentifier(query, start);
      // `expr IN function(...)` (e.g. tuple('US','GB')) is a value expression, not
      // the `expr IN table` shorthand — a following "(" marks it as a function call.
      if (query[skipWhitespace(query, end)] === "(") {
        continue;
      }
      references.push(identifier);
    }
  }

  return references;
}

export function validateScopedQuery(query: string): string | null {
  const normalizedQuery = normalizeCustomQuery(query);

  // ClickHouse treats double quotes and backticks as identifier quoting, not
  // string literals. Allowing them lets a quoted table name disappear before the
  // validator scans FROM/JOIN targets.
  if (hasQuotedIdentifierSyntax(normalizedQuery)) {
    return quotedIdentifierError;
  }

  const queryWithoutLiterals = stripSqlLiteralsAndComments(normalizedQuery);
  const compactQuery = queryWithoutLiterals.trim();
  const cteNames = getCteNames(compactQuery);

  if (!/^(SELECT|WITH)\b/i.test(compactQuery)) {
    return "Only SELECT queries are allowed";
  }

  if (compactQuery.includes(";")) {
    return "Only one SQL statement is allowed";
  }

  for (const keyword of blockedKeywords) {
    if (new RegExp(`\\b${keyword}\\b`, "i").test(compactQuery)) {
      return `${keyword} is not allowed in custom analytics queries`;
    }
  }

  for (const fn of blockedFunctions) {
    if (new RegExp(`\\b${fn}\\s*\\(`, "i").test(compactQuery)) {
      return `${fn}() is not allowed in custom analytics queries`;
    }
  }

  // Dictionary accessors (dictGet, dictGetString, dictHas, dictGetHierarchy, …)
  // can read external dictionary data that isn't scoped to the site.
  if (/\bdict[A-Za-z]*\s*\(/i.test(compactQuery)) {
    return "Dictionary functions are not allowed in custom analytics queries";
  }

  // Block any database-qualified reference to system / information_schema,
  // regardless of how it's reached (FROM, JOIN, scalar subquery, function arg).
  // readonly=2 still permits SELECTing from these, so this is the real guard.
  if (/\b(system|information_schema|INFORMATION_SCHEMA)\s*\./i.test(compactQuery)) {
    return "Queries can only read from scoped_events";
  }

  if (/\bWITH\s+scoped_events\s+AS\b/i.test(compactQuery) || /\bAS\s+scoped_events\b/i.test(compactQuery)) {
    return "scoped_events is reserved and cannot be redefined";
  }

  // Every data-source reference must be scoped_events or a declared CTE. collectTableReferences
  // walks the full FROM list, so comma-separated targets (`FROM scoped_events, other`) are
  // validated too — a FROM/JOIN-keyword-only scan captured only the first table and let the
  // rest through. collectInTableReferences covers ClickHouse's `expr IN table_name`
  // shorthand, which is equivalent to `expr IN (SELECT * FROM table_name)`.
  for (const reference of [...collectTableReferences(compactQuery), ...collectInTableReferences(compactQuery)]) {
    const normalizedTableName = reference.toLowerCase();
    if (normalizedTableName !== "scoped_events" && !cteNames.has(normalizedTableName)) {
      return "Queries can only read from scoped_events";
    }
  }

  if (!/\bscoped_events\b/i.test(compactQuery)) {
    return "Query must read from scoped_events";
  }

  return null;
}
