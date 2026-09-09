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
const seed = `
INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
VALUES ('owner', 'Owner', 'owner@example.com', 1, 100, 100);
INSERT INTO account (id, accountId, providerId, userId, accessToken, createdAt, updatedAt)
VALUES ('google-account', 'google-subject', 'google', 'owner', 'synthetic-token', 100, 100);
INSERT INTO session (id, expiresAt, token, createdAt, updatedAt, userId)
VALUES ('session', 9999999999, 'synthetic-session', 100, 100, 'owner');`;

describe("Better Auth initial schema", () => {
  it.each([false, true])(
    "supports account creation and lookup after initialization (seeded: %s)",
    async (populated) => {
      using database = new DatabaseSync(":memory:");
      database.exec(initial);
      if (populated) database.exec(seed);
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
      await context.internalAdapter.createUser(
        {
          id: "new-owner",
          name: "New owner",
          email: "new-owner@example.com",
          emailVerified: true,
        },
        { method: "oauth", oauth: { providerId: "google" } },
      );
      const created = await context.internalAdapter.createAccount({
        userId: "new-owner",
        providerId: "google",
        accountId: "new-google-subject",
      });
      expect(
        database
          .prepare("SELECT id FROM account WHERE providerId = ? AND accountId = ?")
          .get("google", "new-google-subject"),
      ).toEqual({ id: created.id });
      const owner = await context.internalAdapter.findAccountOwnerByKey({
        providerId: "google",
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
            "INSERT INTO account SELECT 'duplicate', accountId, providerId, userId, accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt FROM account",
          ),
        ).toThrow();
      } else expect(owner).toBeNull();
      expect(
        database
          .prepare("PRAGMA table_info(account)")
          .all()
          .map((column) => column.name),
      ).not.toContain("issuer");
      await context.internalAdapter.createAccount({
        userId: "new-owner",
        providerId: "another-provider",
        accountId: "new-google-subject",
      });
      expect(
        await context.internalAdapter.findAccountOwnerByKey({
          providerId: "another-provider",
          accountId: "new-google-subject",
        }),
      ).toMatchObject({ kind: "owned", account: { providerId: "another-provider" } });
      await expect(
        context.internalAdapter.createAccount({
          userId: "new-owner",
          providerId: "google",
          accountId: "new-google-subject",
        }),
      ).rejects.toThrow();
    },
  );
});
