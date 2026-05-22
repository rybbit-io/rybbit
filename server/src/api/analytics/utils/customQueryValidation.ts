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
  "INSERT",
  "KILL",
  "OPTIMIZE",
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
  "cluster",
  "cosn",
  "executable",
  "file",
  "format",
  "generateRandom",
  "hdfs",
  "input",
  "jdbc",
  "merge",
  "mongodb",
  "mysql",
  "numbers",
  "odbc",
  "postgresql",
  "remote",
  "s3",
  "s3Cluster",
  "url",
] as const;

const blockedTableNames = [
  "bot_events",
  "events",
  "hourly_events_by_site_mv",
  "hourly_events_by_site_mv_target",
  "information_schema",
  "monitor_events",
  "session_replay_events",
  "session_replay_metadata",
  "system",
] as const;

function stripSqlLiteralsAndComments(query: string) {
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
      } else if (char === "\"") {
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
      } else if (char === "\"") {
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

function getCteNames(query: string) {
  const cteNames = new Set<string>();
  const ctePattern = /(?:\bWITH|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s*\(/gi;
  let match: RegExpExecArray | null;

  while ((match = ctePattern.exec(query)) !== null) {
    cteNames.add(match[1].toLowerCase());
  }

  return cteNames;
}

export function validateScopedQuery(query: string): string | null {
  const normalizedQuery = normalizeCustomQuery(query);
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

  if (/\bWITH\s+scoped_events\s+AS\b/i.test(compactQuery) || /\bAS\s+scoped_events\b/i.test(compactQuery)) {
    return "scoped_events is reserved and cannot be redefined";
  }

  for (const tableName of blockedTableNames) {
    if (new RegExp(`,\\s*${tableName}\\b`, "i").test(compactQuery)) {
      return "Queries can only read from scoped_events";
    }
  }

  const tableReferencePattern = /\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_.]*|\()/gi;
  let match: RegExpExecArray | null;
  while ((match = tableReferencePattern.exec(compactQuery)) !== null) {
    const tableName = match[1];
    if (tableName === "(") {
      continue;
    }

    const normalizedTableName = tableName.toLowerCase();
    if (normalizedTableName !== "scoped_events" && !cteNames.has(normalizedTableName)) {
      return "Queries can only read from scoped_events";
    }
  }

  if (!/\bscoped_events\b/i.test(compactQuery)) {
    return "Query must read from scoped_events";
  }

  return null;
}
