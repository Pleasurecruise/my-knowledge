export type CreateArticleStorage<Row> = {
  writeDocuments: () => Promise<void>;
  writeIndex: () => Promise<void>;
  insertRow: () => Promise<Row>;
  cleanupNewVersion: () => Promise<void>;
};

export type UpdateArticleStorage<Row> = {
  writeDocuments: () => Promise<void>;
  writeIndex: () => Promise<void>;
  switchRow: () => Promise<Row | undefined>;
  cleanupNewVersion: () => Promise<void>;
  cleanupPreviousVersion: () => Promise<void>;
};

export type DeleteArticleStorage = {
  hideRow: () => Promise<boolean>;
  cleanupVersion: () => Promise<void>;
  deleteRow: () => Promise<boolean>;
};

export type StoredArticleDocument = {
  contentHash: string;
  key: string;
  markdown: string;
  etag: string;
};

export type WrittenArticleDocument = {
  key: string;
  etag: string;
};
