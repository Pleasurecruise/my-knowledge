import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";

const mode = process.argv[2];
if (mode !== "--local" && mode !== "--remote")
  throw new Error("Specify --local or --remote for the database check");

const expected = new DatabaseSync(":memory:");
try {
  expected.exec(readFileSync(new URL("../migrations/0001_initial.sql", import.meta.url), "utf8"));
  const columnSchema = z.object({
    name: z.string(),
    type: z.string(),
    notnull: z.number(),
    dflt_value: z.string().nullable(),
    pk: z.number(),
  });
  for (const table of ["articles", "articleTranslations"]) {
    const command = `PRAGMA table_info('${table}')`;
    const output = execFileSync(
      "./node_modules/.bin/wrangler",
      ["d1", "execute", "DB", mode, "--json", "--command", command, ...process.argv.slice(3)],
      { encoding: "utf8" },
    );
    const [response] = z
      .tuple([z.object({ success: z.literal(true), results: z.array(columnSchema) })])
      .parse(JSON.parse(output));
    const columns = z.array(columnSchema).parse(expected.prepare(command).all());
    if (JSON.stringify(response.results) !== JSON.stringify(columns))
      throw new Error(
        `${table} does not match the initialization schema. Rebuild the affected D1 store preserving canonical content and metadata before deploying; see docs/DEPLOYMENT.md.`,
      );
  }
  console.log("Article database schema matches the current initialization.");
} finally {
  expected.close();
}
