import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("can rerun the URL fragment migration without resetting saved settings", async () => {
  const database = new PGlite();
  try {
    await database.exec("CREATE TABLE sites (site_id integer PRIMARY KEY); INSERT INTO sites VALUES (1);");
    const migration = await readFile(new URL("../../../drizzle/0023_track_url_fragments.sql", import.meta.url), "utf8");

    await database.exec(migration);
    expect((await database.query('SELECT "trackUrlFragments" FROM sites')).rows).toEqual([
      { trackUrlFragments: false },
    ]);

    await database.exec('UPDATE sites SET "trackUrlFragments" = true WHERE site_id = 1;');
    await database.exec(migration);
    await database.exec("INSERT INTO sites (site_id) VALUES (2);");

    expect((await database.query('SELECT site_id, "trackUrlFragments" FROM sites ORDER BY site_id')).rows).toEqual([
      { site_id: 1, trackUrlFragments: true },
      { site_id: 2, trackUrlFragments: false },
    ]);
  } finally {
    await database.close();
  }
});
