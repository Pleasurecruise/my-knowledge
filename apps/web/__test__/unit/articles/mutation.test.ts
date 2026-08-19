import { describe, expect, it } from "vite-plus/test";

import {
  createStoredArticle,
  deleteStoredArticle,
  updateStoredArticle,
} from "@/articles/persistence/mutation";

function recordStorageStep(log: string[], name: string, failure?: Error) {
  return async () => {
    log.push(name);
    if (failure) throw failure;
  };
}

describe("article storage coordination", () => {
  const createBoundaries: Array<"documents" | "index" | "row"> = ["documents", "index", "row"];

  it.each(createBoundaries)("cleans a failed create at the %s boundary", async (boundary) => {
    const log: string[] = [];
    const failure = new Error(boundary);
    await expect(
      createStoredArticle({
        writeDocuments: recordStorageStep(
          log,
          "documents",
          boundary === "documents" ? failure : undefined,
        ),
        writeIndex: recordStorageStep(log, "index", boundary === "index" ? failure : undefined),
        insertRow: async () => {
          log.push("row");
          if (boundary === "row") throw failure;
          return "created";
        },
        cleanupNewVersion: recordStorageStep(log, "cleanup-new"),
      }),
    ).rejects.toBe(failure);
    expect(log.at(-1)).toBe("cleanup-new");
  });

  it("reports both the primary and cleanup failures", async () => {
    const primary = new Error("index");
    const cleanup = new Error("cleanup");
    await expect(
      createStoredArticle({
        writeDocuments: async () => {},
        writeIndex: async () => {
          throw primary;
        },
        insertRow: async () => "unreachable",
        cleanupNewVersion: async () => {
          throw cleanup;
        },
      }),
    ).rejects.toEqual(
      new AggregateError([primary, cleanup], "Article creation and cleanup both failed"),
    );
  });

  it("switches an update before cleaning the previous version", async () => {
    const log: string[] = [];
    await expect(
      updateStoredArticle({
        writeDocuments: recordStorageStep(log, "documents"),
        writeIndex: recordStorageStep(log, "index"),
        switchRow: async () => {
          log.push("switch-row");
          return "updated";
        },
        cleanupNewVersion: recordStorageStep(log, "cleanup-new"),
        cleanupPreviousVersion: recordStorageStep(log, "cleanup-previous"),
      }),
    ).resolves.toBe("updated");
    expect(log).toEqual(["documents", "index", "switch-row", "cleanup-previous"]);
  });

  const updateBoundaries: Array<"documents" | "index" | "row"> = ["documents", "index", "row"];

  it.each(updateBoundaries)("cleans a failed update at the %s boundary", async (boundary) => {
    const log: string[] = [];
    const failure = new Error(boundary);
    await expect(
      updateStoredArticle({
        writeDocuments: recordStorageStep(
          log,
          "documents",
          boundary === "documents" ? failure : undefined,
        ),
        writeIndex: recordStorageStep(log, "index", boundary === "index" ? failure : undefined),
        switchRow: async () => {
          log.push("switch-row");
          if (boundary === "row") throw failure;
          return "updated";
        },
        cleanupNewVersion: recordStorageStep(log, "cleanup-new"),
        cleanupPreviousVersion: recordStorageStep(log, "cleanup-previous"),
      }),
    ).rejects.toBe(failure);
    expect(log.at(-1)).toBe("cleanup-new");
    expect(log).not.toContain("cleanup-previous");
  });

  it("reports update and cleanup failures together", async () => {
    const primary = new Error("documents");
    const cleanup = new Error("cleanup");
    await expect(
      updateStoredArticle({
        writeDocuments: async () => {
          throw primary;
        },
        writeIndex: async () => {},
        switchRow: async () => "unreachable",
        cleanupNewVersion: async () => {
          throw cleanup;
        },
        cleanupPreviousVersion: async () => {},
      }),
    ).rejects.toEqual(
      new AggregateError([primary, cleanup], "Article update and cleanup both failed"),
    );
  });

  it("surfaces previous-version cleanup failure after switching the row", async () => {
    const log: string[] = [];
    const failure = new Error("cleanup previous");
    await expect(
      updateStoredArticle({
        writeDocuments: recordStorageStep(log, "documents"),
        writeIndex: recordStorageStep(log, "index"),
        switchRow: async () => {
          log.push("switch-row");
          return "updated";
        },
        cleanupNewVersion: recordStorageStep(log, "cleanup-new"),
        cleanupPreviousVersion: recordStorageStep(log, "cleanup-previous", failure),
      }),
    ).rejects.toBe(failure);
    expect(log).toEqual(["documents", "index", "switch-row", "cleanup-previous"]);
  });

  it("cleans the new update version after a stale row switch", async () => {
    const log: string[] = [];
    await expect(
      updateStoredArticle({
        writeDocuments: recordStorageStep(log, "documents"),
        writeIndex: recordStorageStep(log, "index"),
        switchRow: async () => {
          log.push("switch-row");
          return undefined;
        },
        cleanupNewVersion: recordStorageStep(log, "cleanup-new"),
        cleanupPreviousVersion: recordStorageStep(log, "cleanup-previous"),
      }),
    ).resolves.toBeUndefined();
    expect(log).toEqual(["documents", "index", "switch-row", "cleanup-new"]);
  });

  it("keeps delete retryable by hiding before external cleanup", async () => {
    const log: string[] = [];
    const cleanupFailure = new Error("index unavailable");
    await expect(
      deleteStoredArticle({
        hideRow: async () => {
          log.push("hide-row");
          return true;
        },
        cleanupVersion: recordStorageStep(log, "cleanup-version", cleanupFailure),
        deleteRow: async () => {
          log.push("delete-row");
          return true;
        },
      }),
    ).rejects.toBe(cleanupFailure);
    expect(log).toEqual(["hide-row", "cleanup-version"]);
  });

  it("does not clean or delete when hiding loses the concurrency race", async () => {
    const log: string[] = [];
    await expect(
      deleteStoredArticle({
        hideRow: async () => {
          log.push("hide-row");
          return false;
        },
        cleanupVersion: recordStorageStep(log, "cleanup-version"),
        deleteRow: async () => {
          log.push("delete-row");
          return true;
        },
      }),
    ).resolves.toBe(false);
    expect(log).toEqual(["hide-row"]);
  });

  it("returns false when a concurrent update prevents the final row delete", async () => {
    const log: string[] = [];
    await expect(
      deleteStoredArticle({
        hideRow: async () => {
          log.push("hide-row");
          return true;
        },
        cleanupVersion: recordStorageStep(log, "cleanup-version"),
        deleteRow: async () => {
          log.push("delete-row");
          return false;
        },
      }),
    ).resolves.toBe(false);
    expect(log).toEqual(["hide-row", "cleanup-version", "delete-row"]);
  });

  it("deletes the row only after hiding and cleaning the version", async () => {
    const log: string[] = [];
    await expect(
      deleteStoredArticle({
        hideRow: async () => {
          log.push("hide-row");
          return true;
        },
        cleanupVersion: recordStorageStep(log, "cleanup-version"),
        deleteRow: async () => {
          log.push("delete-row");
          return true;
        },
      }),
    ).resolves.toBe(true);
    expect(log).toEqual(["hide-row", "cleanup-version", "delete-row"]);
  });
});
