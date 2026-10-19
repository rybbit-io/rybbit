import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

const migrationDirectory = new URL("../../../drizzle/", import.meta.url);

const hotPathIndexes = [
  "apikey_key_idx",
  "goals_site_idx",
  "member_organizationId_userId_idx",
  "member_userId_idx",
  "sites_organization_idx",
  "team_organizationId_idx",
  "teamMember_userId_idx",
];

it("creates the hot-path indexes on top of every earlier migration and can rerun", async () => {
  const database = new PGlite();
  try {
    const journal = JSON.parse(await readFile(new URL("meta/_journal.json", migrationDirectory), "utf8"));
    for (const entry of journal.entries as { tag: string }[]) {
      await database.exec(await readFile(new URL(`${entry.tag}.sql`, migrationDirectory), "utf8"));
    }

    const listIndexes = async () =>
      (
        await database.query<{ indexname: string }>(
          `SELECT indexname FROM pg_indexes WHERE indexname = ANY($1) ORDER BY indexname`,
          [hotPathIndexes]
        )
      ).rows.map(row => row.indexname);

    expect(await listIndexes()).toEqual([...hotPathIndexes].sort());

    // Deploys may pre-create these by hand (CONCURRENTLY) under the same names.
    await database.exec(await readFile(new URL("0025_hot_path_indexes.sql", migrationDirectory), "utf8"));
    expect(await listIndexes()).toEqual([...hotPathIndexes].sort());
  } finally {
    await database.close();
  }
}, 60_000);
