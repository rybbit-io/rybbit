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
  "arrowFlight",
  "azureBlobStorage",
  "azureBlobStorageCluster",
  "cluster",
  "clusterAllReplicas",
  "currentProfiles",
  "currentRoles",
  "currentUser",
  "defaultProfiles",
  "defaultRoles",
  "enabledProfiles",
  "enabledRoles",
  "cosn",
  "deltaLake",
  "dictionary",
  "executable",
  "file",
  "filesystemAvailable",
  "filesystemCapacity",
  "filesystemUnreserved",
  "format",
  "FQDN",
  "fuzzJSON",
  "fuzzQuery",
  "gcs",
  "generateRandom",
  "getClientHTTPHeader",
  "getMacro",
  "getOSKernelVersion",
  "getServerPort",
  "getSetting",
  "getSettingOrDefault",
  "hdfs",
  "hdfsCluster",
  "hostName",
  "hostname",
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
  "mergeTreeProjection",
  "mongodb",
  "mysql",
  "nats",
  "numbers",
  "odbc",
  "paimon",
  "postgresql",
  "prometheus",
  "rabbitmq",
  "redis",
  "remote",
  "remoteSecure",
  "s3",
  "s3Cluster",
  "showCertificate",
  "sleep",
  "sleepEachRow",
  "sqlite",
  "tcpPort",
  "timeSeriesData",
  "timeSeriesMetrics",
  "timeSeriesTags",
  "url",
  "urlCluster",
  "values",
  "view",
  "viewExplain",
  "viewIfPermitted",
  "ytsaurus",
] as const;

// External-storage table functions come in many suffixed variants
// (icebergS3, icebergAzure, deltaLakeLocal, hudiCluster, azureBlobStorage…).
// Match the family prefix so a new variant doesn't slip past the exact list.
const blockedFunctionPrefixes = [
  "iceberg",
  "deltaLake",
  "hudi",
  "hive",
  "azure",
  "s3",
  "hdfs",
  "gcs",
  "oss",
  "cosn",
  "timeSeries",
  "fuzz",
  "numbers",
  "zeros",
  "generate",
] as const;

const unsupportedSyntaxError =
  "Quoted identifiers, # and // comments, and $$ strings are not allowed in custom analytics queries";

// Rejects syntax the literal stripper below can't model. ClickHouse treats
// double quotes and backticks as identifier quoting, `#` / `#!` / `//` as line
// comments, and `$tag$…$tag$` as string literals. If any of these reached the
// stripper it would disagree with ClickHouse about where a literal starts and
// ends, and text it classified as "inside a string" would execute as SQL —
// e.g. `WHERE 1=1 # '\nUNION ALL SELECT * FROM events -- '`. None of them are
// needed for analytics SQL, so they're rejected outright outside a
// single-quoted literal.
export function hasUnsupportedSyntax(query: string) {
  let index = 0;
  let state: "normal" | "single" | "line-comment" | "block-comment" = "normal";

  while (index < query.length) {
    const char = query[index];
    const next = query[index + 1];

    if (state === "normal") {
      if (char === '"' || char === "`" || char === "#" || char === "$" || (char === "/" && next === "/")) {
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
  if (hasUnsupportedSyntax(normalizedQuery)) {
    return unsupportedSyntaxError;
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

  for (const prefix of blockedFunctionPrefixes) {
    const match = new RegExp(`\\b(${prefix}[A-Za-z0-9_]*)\\s*\\(`, "i").exec(compactQuery);
    if (match) {
      return `${match[1]}() is not allowed in custom analytics queries`;
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

// ClickHouse error codes whose message text is safe and useful to show to the
// query author (syntax position, unknown column, type mismatch, limits hit).
// Anything else — storage/IO/network errors that mention hosts, paths, or the
// internal user — is collapsed to a generic message with just the code.
const userFacingClickhouseErrorCodes = new Set([
  6, // CANNOT_PARSE_TEXT
  10, // NOT_FOUND_COLUMN_IN_BLOCK
  16, // NO_SUCH_COLUMN_IN_TABLE
  36, // BAD_ARGUMENTS
  42, // NUMBER_OF_ARGUMENTS_DOESNT_MATCH
  43, // ILLEGAL_TYPE_OF_ARGUMENT
  44, // ILLEGAL_COLUMN
  46, // UNKNOWN_FUNCTION
  47, // UNKNOWN_IDENTIFIER
  48, // NOT_IMPLEMENTED
  49, // LOGICAL_ERROR (surfaces as a type-inference failure on user SQL)
  53, // TYPE_MISMATCH
  62, // SYNTAX_ERROR
  69, // ARGUMENT_OUT_OF_BOUND
  70, // CANNOT_CONVERT_TYPE
  117, // INCORRECT_DATA
  158, // TOO_MANY_ROWS
  159, // TIMEOUT_EXCEEDED
  160, // TOO_SLOW
  164, // READONLY
  179, // MULTIPLE_EXPRESSIONS_FOR_ALIAS
  182, // ILLEGAL_PREWHERE
  184, // ILLEGAL_AGGREGATION
  215, // NOT_AN_AGGREGATE
  241, // MEMORY_LIMIT_EXCEEDED
  306, // TOO_DEEP_RECURSION
  386, // NO_COMMON_TYPE
  394, // QUERY_WAS_CANCELLED
  452, // SETTING_CONSTRAINT_VIOLATION
  497, // ACCESS_DENIED (handled separately, listed for clarity)
]);

export function sanitizeClickhouseError(error: unknown): string {
  const raw = error instanceof Error && error.message ? error.message : "";
  if (!raw) {
    return "Failed to run query";
  }
  const code = Number(/^Code: (\d+)\./.exec(raw)?.[1]);
  if (code === 497 || /Not enough privileges/i.test(raw)) {
    return "Query references data outside scoped_events";
  }
  if (!Number.isFinite(code) || !userFacingClickhouseErrorCodes.has(code)) {
    return Number.isFinite(code) ? `Query failed (ClickHouse error ${code})` : "Failed to run query";
  }
  return raw
    .replace(/\s*\(version [^()]*(?:\([^()]*\)[^()]*)*\)/g, "")
    .replace(/\s*\([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)/gi, "")
    .replace(/\s*\(from [^)]*\)/g, "")
    .replace(/\s*Stack trace:[\s\S]*$/, "")
    .trim();
}
