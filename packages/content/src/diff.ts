import { MarkdownEmbedError } from "./embed-error";

type DiffLine = { text: string; kind: "add" | "remove" | "context" | "header" };

/** Validate unified text patches without executing Git or interpreting paths. */
export function parseDiff(source: string): DiffLine[] {
  let oldRemaining = 0;
  let newRemaining = 0;
  let file = false;
  let oldHeader = false;
  let hunk = false;
  let fileHunk = false;
  let previousContent = false;
  const fail = (): never => {
    throw new MarkdownEmbedError(
      "Diff requires a complete unified text patch with matching hunk counts",
    );
  };
  const result: DiffLine[] = [];
  for (const text of source.split("\n")) {
    if (text === "\\ No newline at end of file") {
      if (!previousContent) fail();
      previousContent = false;
      result.push({ text, kind: "header" });
      continue;
    }
    previousContent = false;
    if (oldRemaining > 0 || newRemaining > 0) {
      const prefix = text[0];
      if (prefix !== " " && prefix !== "+" && prefix !== "-") fail();
      if (prefix !== "+") oldRemaining--;
      if (prefix !== "-") newRemaining--;
      if (oldRemaining < 0 || newRemaining < 0) fail();
      result.push({ text, kind: prefix === "+" ? "add" : prefix === "-" ? "remove" : "context" });
      previousContent = true;
      continue;
    }
    const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?: .*)?$/u.exec(text);
    if (match) {
      if (!file || oldHeader) fail();
      oldRemaining = Number(match[2] ?? "1");
      newRemaining = Number(match[4] ?? "1");
      if (
        ![match[1], match[3], String(oldRemaining), String(newRemaining)].every((value) =>
          Number.isSafeInteger(Number(value)),
        ) ||
        oldRemaining + newRemaining === 0
      )
        fail();
      hunk = true;
      fileHunk = true;
    } else if (text.startsWith("--- ") && text.length > 4) {
      if (oldHeader || (file && !fileHunk)) fail();
      oldHeader = true;
      file = false;
      fileHunk = false;
    } else if (text.startsWith("+++ ") && text.length > 4) {
      if (!oldHeader) fail();
      oldHeader = false;
      file = true;
    } else if (
      /^(?:diff --git |index |new file mode |deleted file mode |old mode |new mode |similarity index |rename from |rename to |copy from |copy to ).+/u.test(
        text,
      )
    ) {
      if (oldHeader || (file && !fileHunk)) fail();
      if (text.startsWith("diff --git ")) {
        file = false;
        fileHunk = false;
      }
    } else fail();
    result.push({ text, kind: "header" });
  }
  if (!hunk || !file || !fileHunk || oldHeader || oldRemaining !== 0 || newRemaining !== 0) fail();
  return result;
}
