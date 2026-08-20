CREATE TABLE `articles` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `contentHash` text NOT NULL,
  `metaJson` text NOT NULL,
  `tagsJson` text NOT NULL,
  `linksJson` text NOT NULL,
  `visibility` text DEFAULT 'private' NOT NULL CHECK (`visibility` IN ('private', 'public')),
  `createdAt` text NOT NULL,
  `updatedAt` text NOT NULL
);

CREATE UNIQUE INDEX `articles_slug_unique` ON `articles` (`slug`);
CREATE INDEX `articles_visibility_updatedAt_idx` ON `articles` (`visibility`, `updatedAt`);

CREATE TABLE `user` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL,
  `emailVerified` integer DEFAULT 0 NOT NULL,
  `image` text,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL
);

CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);

CREATE TABLE `session` (
  `id` text PRIMARY KEY NOT NULL,
  `expiresAt` integer NOT NULL,
  `token` text NOT NULL,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL,
  `ipAddress` text,
  `userAgent` text,
  `userId` text NOT NULL,
  FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);
CREATE INDEX `session_userId_idx` ON `session` (`userId`);

CREATE TABLE `account` (
  `id` text PRIMARY KEY NOT NULL,
  `accountId` text NOT NULL,
  `providerId` text NOT NULL,
  `userId` text NOT NULL,
  `accessToken` text,
  `refreshToken` text,
  `idToken` text,
  `accessTokenExpiresAt` integer,
  `refreshTokenExpiresAt` integer,
  `scope` text,
  `password` text,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL,
  FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `account_userId_idx` ON `account` (`userId`);

CREATE TABLE `verification` (
  `id` text PRIMARY KEY NOT NULL,
  `identifier` text NOT NULL,
  `value` text NOT NULL,
  `expiresAt` integer NOT NULL,
  `createdAt` integer,
  `updatedAt` integer
);

CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);
