import { spawnSync } from "node:child_process";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { generateRandomString, makeSignature } from "better-auth/crypto";

import { getPlatformProxy } from "wrangler";
import { fileURLToPath } from "node:url";

import authFixture from "../fixtures/auth.json" with { type: "json" };

const appDirectory = new URL("../../", import.meta.url);

const objects: Array<[fixture: string, objectPath: string]> = [
  ["rich", "11111111-1111-4111-8111-111111111111"],
  ["related", "22222222-2222-4222-8222-222222222222"],
  ["private", "33333333-3333-4333-8333-333333333333"],
];

function wrangler(args: string[]) {
  const result = spawnSync("./node_modules/.bin/wrangler", args, {
    cwd: appDirectory,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status === null) throw new Error("Wrangler exited without a status code");
  if (result.status !== 0) process.exit(result.status);
}

// This directory belongs exclusively to disposable browser fixtures.
await rm(new URL(".wrangler/test-state", appDirectory), { recursive: true, force: true });
wrangler([
  "d1",
  "migrations",
  "apply",
  "DB",
  "--local",
  "--persist-to",
  ".wrangler/test-state",
  "--config",
  "wrangler.test.json",
]);

const sessionId = generateRandomString(32, "a-z", "A-Z", "0-9");
const sessionToken = generateRandomString(32, "a-z", "A-Z", "0-9");
for (const value of [authFixture.userId, sessionId, sessionToken]) {
  if (!/^[A-Za-z0-9-]+$/u.test(value))
    throw new Error("Better Auth returned an unsafe SQL fixture ID");
}
const createdAt = Math.floor(Date.now() / 1_000);
const sessionExpiresAt = createdAt + 60 * 60 * 24 * 7;
const signedSessionToken = `${sessionToken}.${await makeSignature(sessionToken, authFixture.secret)}`;

wrangler([
  "d1",
  "execute",
  "DB",
  "--local",
  "--persist-to",
  ".wrangler/test-state",
  "--config",
  "wrangler.test.json",
  "--file",
  "__test__/fixtures/seed.sql",
]);

wrangler([
  "d1",
  "execute",
  "DB",
  "--local",
  "--persist-to",
  ".wrangler/test-state",
  "--config",
  "wrangler.test.json",
  "--command",
  `PRAGMA foreign_keys = ON;
DELETE FROM session WHERE userId = '${authFixture.userId}';
DELETE FROM user WHERE id = '${authFixture.userId}';
INSERT INTO user (id, name, email, emailVerified, image, createdAt, updatedAt)
VALUES ('${authFixture.userId}', 'Playwright Owner', '${authFixture.email}', 1, NULL, ${createdAt}, ${createdAt});
INSERT INTO session (id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId)
VALUES ('${sessionId}', ${sessionExpiresAt}, '${sessionToken}', ${createdAt}, ${createdAt}, '', '', '${authFixture.userId}');`,
]);

const authDirectory = new URL("../.auth/", import.meta.url);
await mkdir(authDirectory, { recursive: true });
await writeFile(
  new URL("owner.json", authDirectory),
  `${JSON.stringify(
    {
      cookies: [
        {
          name: "better-auth.session_token",
          value: signedSessionToken,
          domain: "127.0.0.1",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
          expires: sessionExpiresAt,
        },
      ],
      origins: [],
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const { env, dispose } = await getPlatformProxy<CloudflareEnv>({
  configPath: fileURLToPath(new URL("wrangler.test.json", appDirectory)),
  persist: { path: fileURLToPath(new URL(".wrangler/test-state/v3", appDirectory)) },
});
try {
  for (const [fixture, objectPath] of objects) {
    const documents = Object.fromEntries(
      await Promise.all(
        ["zh", "en", "ja"].map(async (locale): Promise<[string, string]> => [
          locale,
          await readFile(new URL(`../fixtures/${fixture}/${locale}.md`, import.meta.url), "utf8"),
        ]),
      ),
    );
    const row = await env.DB.prepare("SELECT contentHash FROM articles WHERE id = ?")
      .bind(objectPath)
      .first<{ contentHash: string }>();
    if (!row) throw new Error("Missing fixture row");
    for (const [locale, edition] of Object.entries(documents)) {
      const key = locale === "zh" ? "zh.md" : `i18n/${locale}.md`;
      await env.KNOWLEDGE_BUCKET.put(`knowledge/${objectPath}/${key}`, edition, {
        customMetadata: { contentHash: row.contentHash },
      });
    }
  }
} finally {
  await dispose();
}
