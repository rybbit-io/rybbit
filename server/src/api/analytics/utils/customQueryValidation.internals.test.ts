import { describe, expect, it } from "vitest";
import {
  collectInTableReferences,
  collectTableReferences,
  getCteNames,
  hasQuotedIdentifierSyntax,
  normalizeCustomQuery,
  stripSqlLiteralsAndComments,
} from "./customQueryValidation.js";

// These cover the UNTESTED internals of customQueryValidation.ts. The public
// validateScopedQuery is exercised separately in customQueryValidation.test.ts.

// =============================================================================
// stripSqlLiteralsAndComments
// =============================================================================

describe("stripSqlLiteralsAndComments", () => {
  // The function blanks out literal/comment content while PRESERVING string
  // length and newline positions, so later regex offsets still line up. Every
  // assertion below relies on that length invariant.
  it("preserves overall length (blanks in place, never deletes)", () => {
    const inputs = [
      "SELECT 'abc' FROM t",
      "SELECT 1 -- comment\nFROM t",
      "SELECT /* c */ 1 FROM t",
      'SELECT "col" FROM t',
    ];
    for (const input of inputs) {
      expect(stripSqlLiteralsAndComments(input)).toHaveLength(input.length);
    }
  });

  describe("string literals", () => {
    it("blanks a simple single-quoted literal but keeps surrounding SQL", () => {
      expect(stripSqlLiteralsAndComments("SELECT 'abc' FROM t")).toBe("SELECT       FROM t");
    });

    it("handles a doubled-quote escape ('') inside a literal without ending early", () => {
      // "'it''s'" is one literal; the whole thing becomes blanks.
      expect(stripSqlLiteralsAndComments("SELECT 'it''s' FROM t")).toBe("SELECT         FROM t");
    });

    it("handles a backslash escape inside a literal", () => {
      // \' does not terminate the string; the closing ' does.
      expect(stripSqlLiteralsAndComments("SELECT 'a\\'b' FROM t")).toBe("SELECT        FROM t");
    });

    it("preserves newlines inside a literal (position alignment)", () => {
      expect(stripSqlLiteralsAndComments("SELECT 'a\nb' FROM t")).toBe("SELECT   \n   FROM t");
    });

    it("blanks an unterminated string literal to end of input", () => {
      expect(stripSqlLiteralsAndComments("SELECT 'abc")).toBe("SELECT     ");
    });
  });

  describe("line comments (--)", () => {
    it("blanks a -- comment but keeps the terminating newline and following SQL", () => {
      expect(stripSqlLiteralsAndComments("SELECT 1 -- FROM secret\nFROM t")).toBe(
        "SELECT 1               \nFROM t"
      );
    });
  });

  describe("block comments (/* */)", () => {
    it("blanks a /* */ block comment", () => {
      expect(stripSqlLiteralsAndComments("SELECT /* FROM secret */ 1 FROM t")).toBe(
        "SELECT                   1 FROM t"
      );
    });

    it("blanks an unterminated block comment to end of input", () => {
      expect(stripSqlLiteralsAndComments("SELECT 1 /* FROM secret")).toBe("SELECT 1               ");
    });

    it("does not treat nested /* as re-opening — first */ ends the comment", () => {
      // The comment ends at the first */; the trailing "*/" becomes live SQL.
      const out = stripSqlLiteralsAndComments("SELECT 1 /* a /* b */ x */ FROM t");
      expect(out).toHaveLength("SELECT 1 /* a /* b */ x */ FROM t".length);
      // The "x */" after the first close is NOT stripped.
      expect(out).toContain("x */ FROM t");
    });
  });

  describe("quoted identifiers", () => {
    it("blanks a double-quoted identifier", () => {
      expect(stripSqlLiteralsAndComments('SELECT "col" FROM t')).toBe("SELECT       FROM t");
    });

    it("blanks a backtick-quoted identifier", () => {
      expect(stripSqlLiteralsAndComments("SELECT `col` FROM t")).toBe("SELECT       FROM t");
    });
  });

  describe("adversarial: hidden table names must NOT survive stripping", () => {
    it("a table name inside a string literal is correctly ignored", () => {
      // `'FROM events'` is data, not a clause; only the real FROM scoped_events remains.
      const out = stripSqlLiteralsAndComments("SELECT 'FROM events' FROM scoped_events");
      expect(out).toBe("SELECT               FROM scoped_events");
      expect(collectTableReferences(out)).toEqual(["scoped_events"]);
    });

    it("a table name inside a block comment is correctly ignored", () => {
      const out = stripSqlLiteralsAndComments("SELECT 1 /* , events */ FROM scoped_events");
      expect(collectTableReferences(out)).toEqual(["scoped_events"]);
    });

    it("a literal containing /* does not confuse the tokenizer into comment mode", () => {
      // The `/*` lives inside a string, so it stays a string; nothing leaks out.
      const out = stripSqlLiteralsAndComments("SELECT '/* not a comment */' FROM t");
      expect(out).toBe("SELECT                       FROM t");
      expect(out).toContain("FROM t");
    });

    it("a -- inside a string literal does not start a comment", () => {
      const out = stripSqlLiteralsAndComments("SELECT '-- x' AS c FROM scoped_events");
      expect(out).toContain("AS c FROM scoped_events");
    });
  });
});

// =============================================================================
// getCteNames
// =============================================================================

describe("getCteNames", () => {
  it("collects a single WITH ... AS ( name", () => {
    expect([...getCteNames("WITH foo AS (SELECT 1)")]).toEqual(["foo"]);
  });

  it("collects comma-separated CTE names", () => {
    expect([...getCteNames("WITH foo AS (SELECT 1), bar AS (SELECT 2)")]).toEqual(["foo", "bar"]);
  });

  it("is case-insensitive on keywords and lowercases the captured name", () => {
    expect([...getCteNames("with FOO as (select 1)")]).toEqual(["foo"]);
    expect([...getCteNames("WITH Bar AS (SELECT 1)")]).toEqual(["bar"]);
  });

  it("tolerates missing whitespace before the opening paren", () => {
    expect([...getCteNames("with foo as(select 1)")]).toEqual(["foo"]);
  });

  it("returns an empty set when AS is not followed by a paren (not a CTE)", () => {
    expect([...getCteNames("WITH foo AS SELECT 1")]).toEqual([]);
    expect([...getCteNames("SELECT x AS foo FROM scoped_events")]).toEqual([]);
  });

  it("deduplicates repeated names", () => {
    expect([...getCteNames("WITH foo AS (SELECT 1), foo AS (SELECT 2)")]).toEqual(["foo"]);
  });
});

// =============================================================================
// collectTableReferences
// =============================================================================

describe("collectTableReferences", () => {
  it("collects the table after FROM and after JOIN", () => {
    expect(collectTableReferences("SELECT * FROM a JOIN b ON 1=1")).toEqual(["a", "b"]);
  });

  it("collects every entry of a comma-separated FROM list", () => {
    expect(collectTableReferences("SELECT * FROM a, b, c WHERE x")).toEqual(["a", "b", "c"]);
  });

  it("stops the FROM list at a clause terminator (WHERE/GROUP/ORDER/etc.)", () => {
    // The comma after WHERE belongs to another clause, not the table list.
    expect(collectTableReferences("SELECT * FROM a WHERE x IN (1, 2)")).toEqual(["a"]);
    expect(collectTableReferences("SELECT * FROM a GROUP BY x, y")).toEqual(["a"]);
    expect(collectTableReferences("SELECT * FROM a ORDER BY x, y")).toEqual(["a"]);
  });

  it("descends into a subquery's inner FROM rather than naming the subquery", () => {
    expect(collectTableReferences("SELECT * FROM (SELECT * FROM inner) x")).toEqual(["inner"]);
  });

  it("skips ARRAY JOIN (array expression, not a table)", () => {
    expect(collectTableReferences("SELECT k FROM t ARRAY JOIN mapKeys(m) AS k")).toEqual(["t"]);
    expect(collectTableReferences("SELECT k FROM t LEFT ARRAY JOIN mapKeys(m) AS k")).toEqual(["t"]);
  });

  it("does not treat commas inside SELECT lists or function args as table entries", () => {
    expect(collectTableReferences("SELECT count(*), uniq(x) FROM t GROUP BY p")).toEqual(["t"]);
  });

  it("captures a dotted (db-qualified) table name whole", () => {
    expect(collectTableReferences("SELECT * FROM system.tables")).toEqual(["system.tables"]);
  });
});

// =============================================================================
// collectInTableReferences
// =============================================================================

describe("collectInTableReferences", () => {
  it("collects the operand of `expr IN table`", () => {
    expect(collectInTableReferences("WHERE x IN events")).toEqual(["events"]);
  });

  it("handles NOT IN and GLOBAL IN / GLOBAL NOT IN", () => {
    expect(collectInTableReferences("WHERE x NOT IN events")).toEqual(["events"]);
    expect(collectInTableReferences("WHERE x GLOBAL IN events")).toEqual(["events"]);
    expect(collectInTableReferences("WHERE x GLOBAL NOT IN events")).toEqual(["events"]);
  });

  it("is case-insensitive", () => {
    expect(collectInTableReferences("WHERE x in events")).toEqual(["events"]);
  });

  it("ignores `IN (...)` value lists and `IN function(...)` calls", () => {
    // A following "(" marks a value expression, not the IN-table shorthand.
    expect(collectInTableReferences("WHERE x IN (1, 2, 3)")).toEqual([]);
    expect(collectInTableReferences("WHERE x IN tuple('a', 'b')")).toEqual([]);
  });

  it("collects multiple IN-table references in one query", () => {
    expect(collectInTableReferences("WHERE a IN t1 AND b IN t2")).toEqual(["t1", "t2"]);
  });
});

// =============================================================================
// hasQuotedIdentifierSyntax
// =============================================================================

describe("hasQuotedIdentifierSyntax", () => {
  it("detects a double-quoted identifier", () => {
    expect(hasQuotedIdentifierSyntax('SELECT "x" FROM t')).toBe(true);
  });

  it("detects a backtick-quoted identifier", () => {
    expect(hasQuotedIdentifierSyntax("SELECT `x` FROM t")).toBe(true);
  });

  it("does NOT flag a double quote or backtick that lives inside a string literal", () => {
    expect(hasQuotedIdentifierSyntax("SELECT 'has \" quote'")).toBe(false);
    expect(hasQuotedIdentifierSyntax("SELECT 'has ` tick'")).toBe(false);
  });

  it("does NOT flag a double quote inside a line or block comment", () => {
    expect(hasQuotedIdentifierSyntax("SELECT 1 -- a \" b\nFROM t")).toBe(false);
    expect(hasQuotedIdentifierSyntax('SELECT 1 /* a " b */ FROM t')).toBe(false);
  });

  it("respects doubled-quote and backslash escapes when tracking string state", () => {
    // The '' keeps us inside the string, so the later " is still inside it.
    expect(hasQuotedIdentifierSyntax(`SELECT 'it''s a \" test'`)).toBe(false);
    expect(hasQuotedIdentifierSyntax(`SELECT 'a\\' \" b'`)).toBe(false);
  });

  it("returns false for a clean query with no quoting", () => {
    expect(hasQuotedIdentifierSyntax("SELECT count(*) FROM scoped_events")).toBe(false);
  });
});

// =============================================================================
// normalizeCustomQuery
// =============================================================================

describe("normalizeCustomQuery", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeCustomQuery("  SELECT 1  ")).toBe("SELECT 1");
  });

  it("strips one or more trailing semicolons", () => {
    expect(normalizeCustomQuery("SELECT 1;")).toBe("SELECT 1");
    expect(normalizeCustomQuery("SELECT 1;;;")).toBe("SELECT 1");
  });

  it("strips trailing semicolons after trailing whitespace", () => {
    expect(normalizeCustomQuery("  SELECT 1 ;;  ")).toBe("SELECT 1");
  });

  it("leaves a mid-query semicolon in place (only anchored trailing ones are removed)", () => {
    // The regex is anchored to end-of-string, so an interior ; survives — which
    // is how validateScopedQuery can later detect multi-statement input.
    expect(normalizeCustomQuery("SELECT 1; SELECT 2")).toBe("SELECT 1; SELECT 2");
  });
});
