CREATE TABLE `articleJobs` (
  `id` text PRIMARY KEY NOT NULL,
  `status` text NOT NULL CHECK (`status` IN ('pending', 'processing', 'created', 'failed')),
  `resultJson` text,
  `createdAt` text NOT NULL,
  `updatedAt` text NOT NULL,
  CHECK (
    (`status` IN ('pending', 'processing') AND `resultJson` IS NULL)
    OR (`status` IN ('created', 'failed') AND `resultJson` IS NOT NULL)
  )
);
