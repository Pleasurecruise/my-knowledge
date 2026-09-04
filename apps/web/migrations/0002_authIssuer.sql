-- Google is the only configured account provider. Unknown providers and duplicate identities
-- fail the migration instead of silently assigning ownership. Apply with authentication writes stopped.
CREATE TABLE `accountNext` (
  `id` text PRIMARY KEY NOT NULL,
  `accountId` text NOT NULL,
  `issuer` text NOT NULL,
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

INSERT INTO `accountNext` (`id`, `accountId`, `providerId`, `userId`, `accessToken`, `refreshToken`, `idToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `password`, `createdAt`, `updatedAt`, `issuer`)
SELECT `id`, `accountId`, `providerId`, `userId`, `accessToken`, `refreshToken`, `idToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `password`, `createdAt`, `updatedAt`, CASE WHEN `providerId` = 'google' THEN 'https://accounts.google.com' END
FROM `account`;

CREATE UNIQUE INDEX `account_issuer_accountId_unique` ON `accountNext` (`issuer`, `accountId`);
DROP TABLE `account`;
ALTER TABLE `accountNext` RENAME TO `account`;
CREATE INDEX `account_userId_idx` ON `account` (`userId`);
