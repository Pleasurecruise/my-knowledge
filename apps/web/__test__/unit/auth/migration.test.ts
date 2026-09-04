import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { describe, expect, it } from "vite-plus/test";

import { authSchema } from "@/db/schema";

const initial = readFileSync(
  new URL("../../../migrations/0001_initial.sql", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL("../../../migrations/0002_authIssuer.sql", import.meta.url),
  "utf8",
);
const seed = `
INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
VALUES ('owner', 'Owner', 'owner@example.com', 1, 100, 100);
INSERT INTO account (id, accountId, providerId, userId, accessToken, createdAt, updatedAt)
VALUES ('google-account', 'google-subject', 'google', 'owner', 'synthetic-token', 100, 100);
INSERT INTO session (id, expiresAt, token, createdAt, updatedAt, userId)
VALUES ('session', 9999999999, 'synthetic-session', 100, 100, 'owner');`;

function migrate(database: DatabaseSync) {
  database.exec("BEGIN");
  try {
    database.exec(migration);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

describe("Better Auth account migration", () => {
  it.each([false, true])(
    "supports an empty or populated database (populated: %s)",
    async (populated) => {
      using database = new DatabaseSync(":memory:");
      database.exec(initial);
      if (populated) database.exec(seed);
      migrate(database);
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      const db = drizzle(
        async (query, params, method) => {
          const statement = database.prepare(query);
          statement.setReturnArrays(true);
          if (method === "run") {
            statement.run(...params);
            return { rows: [] };
          }
          return { rows: statement.all(...params) };
        },
        { schema: authSchema },
      );
      const auth = betterAuth({
        secret: "local-migration-test-secret-0123456789",
        baseURL: "http://localhost:3000",
        database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
      });
      const context = await auth.$context;
      const owner = await context.internalAdapter.findAccountOwnerByKey({
        issuer: "https://accounts.google.com",
        accountId: "google-subject",
      });
      if (populated) {
        expect(owner).toMatchObject({
          kind: "owned",
          user: { id: "owner" },
          account: { id: "google-account", accessToken: "synthetic-token" },
        });
        expect(database.prepare("SELECT token FROM session").get()).toEqual({
          token: "synthetic-session",
        });
        expect(() =>
          database.exec(
            "INSERT INTO account SELECT 'duplicate', accountId, issuer, providerId, userId, accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt FROM account",
          ),
        ).toThrow();
      } else expect(owner).toBeNull();
    },
  );

  it.each(["unknown", "duplicate"])(
    "rolls back unsupported %s account data without losing rows",
    (failure) => {
      using database = new DatabaseSync(":memory:");
      database.exec(initial + seed);
      if (failure === "unknown") database.exec("UPDATE account SET providerId = 'unknown'");
      else
        database.exec(
          "INSERT INTO account SELECT 'duplicate', accountId, providerId, userId, accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt FROM account",
        );
      const before = database.prepare("SELECT * FROM account").all();
      expect(() => migrate(database)).toThrow();
      expect(database.prepare("SELECT * FROM account").all()).toEqual(before);
    },
  );
});
