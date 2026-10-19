import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const migrationDirectory = new URL("../../../drizzle/", import.meta.url);
const MIGRATION = "0025_hot_path_indexes";

const hotPathIndexes = [
  { name: "apikey_key_idx", table: "apikey", columns: '("key")' },
  { name: "goals_site_idx", table: "goals", columns: '("site_id")' },
  { name: "member_organizationId_userId_idx", table: "member", columns: '("organizationId","userId")' },
  { name: "member_userId_idx", table: "member", columns: '("userId")' },
  { name: "sites_organization_idx", table: "sites", columns: '("organization_id")' },
  { name: "team_organizationId_idx", table: "team", columns: '("organizationId")' },
  { name: "teamMember_userId_idx", table: "teamMember", columns: '("userId")' },
];
const indexedTables = [...new Set(hotPathIndexes.map(index => index.table))];

async function migrate(database: PGlite, { through }: { through: string }) {
  const journal = JSON.parse(await readFile(new URL("meta/_journal.json", migrationDirectory), "utf8"));
  for (const entry of journal.entries as { tag: string }[]) {
    await database.exec(await readFile(new URL(`${entry.tag}.sql`, migrationDirectory), "utf8"));
    if (entry.tag === through) return;
  }
  throw new Error(`${through} is not in the journal`);
}

async function runHotPathMigration(database: PGlite) {
  await database.exec(await readFile(new URL(`${MIGRATION}.sql`, migrationDirectory), "utf8"));
}

async function listIndexes(database: PGlite) {
  const { rows } = await database.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes WHERE indexname = ANY($1) ORDER BY indexname`,
    [hotPathIndexes.map(index => index.name)]
  );
  return rows.map(row => row.indexname);
}

// Drizzle runs the whole migration in one transaction, so any lock a statement
// takes is held until commit. Run it the same way and read the locks held.
async function tableLocksDuringMigration(database: PGlite) {
  await database.exec("BEGIN");
  try {
    await runHotPathMigration(database);
    const { rows } = await database.query<{ relname: string; mode: string }>(
      `SELECT c.relname, l.mode FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
       WHERE l.pid = pg_backend_pid() AND c.relname = ANY($1) ORDER BY c.relname, l.mode`,
      [indexedTables]
    );
    return rows;
  } finally {
    await database.exec("COMMIT");
  }
}

describe(MIGRATION, () => {
  it("creates the hot-path indexes on top of every earlier migration, and a rerun is a no-op", async () => {
    const database = new PGlite();
    try {
      await migrate(database, { through: MIGRATION });
      const expected = hotPathIndexes.map(index => index.name).sort();
      expect(await listIndexes(database)).toEqual(expected);

      expect(await tableLocksDuringMigration(database)).toEqual([]);
      expect(await listIndexes(database)).toEqual(expected);
    } finally {
      await database.close();
    }
  }, 60_000);

  it("takes no table lock and leaves an index alone when it was pre-created under the same name", async () => {
    const database = new PGlite();
    try {
      await migrate(database, { through: "0024_sites_id_index" });
      for (const index of hotPathIndexes) {
        // A distinguishable definition shows the migration skipped it.
        await database.exec(
          `CREATE INDEX "${index.name}" ON "${index.table}" USING hash (${index.columns.split(",")[0].replace(/[()]/g, "")})`
        );
      }

      expect(await tableLocksDuringMigration(database)).toEqual([]);

      const { rows } = await database.query<{ indexdef: string }>(
        `SELECT indexdef FROM pg_indexes WHERE indexname = ANY($1)`,
        [hotPathIndexes.map(index => index.name)]
      );
      expect(rows).toHaveLength(hotPathIndexes.length);
      expect(rows.every(row => row.indexdef.includes("USING hash"))).toBe(true);
    } finally {
      await database.close();
    }
  }, 60_000);

  it("locks each table while it builds an index that was not pre-created", async () => {
    const database = new PGlite();
    try {
      await migrate(database, { through: "0024_sites_id_index" });

      const locks = await tableLocksDuringMigration(database);
      expect([...new Set(locks.filter(lock => lock.mode === "ShareLock").map(lock => lock.relname))].sort()).toEqual(
        [...indexedTables].sort()
      );
      expect(await listIndexes(database)).toEqual(hotPathIndexes.map(index => index.name).sort());
    } finally {
      await database.close();
    }
  }, 60_000);
});
