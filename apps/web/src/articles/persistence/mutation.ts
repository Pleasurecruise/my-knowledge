import type { CreateArticleStorage, DeleteArticleStorage, UpdateArticleStorage } from "./types";

export async function createStoredArticle<Row>(storage: CreateArticleStorage<Row>): Promise<Row> {
  try {
    await storage.writeDocuments();
    await storage.writeVector();
    return await storage.insertRow();
  } catch (error) {
    try {
      await storage.cleanupNewVersion();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Article creation and cleanup both failed");
    }
    throw error;
  }
}

export async function updateStoredArticle<Row>(
  storage: UpdateArticleStorage<Row>,
): Promise<Row | undefined> {
  let row: Row | undefined;
  try {
    await storage.writeDocuments();
    await storage.writeVector();
    row = await storage.switchRow();
  } catch (error) {
    try {
      await storage.cleanupNewVersion();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Article update and cleanup both failed");
    }
    throw error;
  }
  if (!row) {
    await storage.cleanupNewVersion();
    return undefined;
  }
  await storage.cleanupPreviousVersion();
  return row;
}

export async function deleteStoredArticle(storage: DeleteArticleStorage): Promise<boolean> {
  if (!(await storage.hideRow())) return false;
  await storage.cleanupVersion();
  return storage.deleteRow();
}
