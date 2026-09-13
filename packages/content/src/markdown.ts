import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified, type Plugin } from "unified";
import { visit } from "unist-util-visit";

const syntax = unified().use(remarkParse);
const embedSourceExamples: Plugin<[], ReturnType<typeof syntax.parse>> = function () {
  const parse = this.parser;
  if (!parse) throw new Error("Markdown syntax must be configured before source examples");
  this.parser = (source, file) => {
    const lines = source.split("\n");
    const examples = new Map<number, string>();
    let fence: { marker: string; length: number } | undefined;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      const match = /^ {0,3}(`{3,}|~{3,})(.*)\r?$/u.exec(line);
      if (!match?.[1]) continue;
      const marker = match[1].charAt(0);
      if (fence) {
        if (marker === fence.marker && match[1].length >= fence.length && !match[2]?.trim())
          fence = undefined;
        continue;
      }
      if (
        /^```[ \t]*\r?$/u.test(line) &&
        /^```embed:[a-z-]+[ \t]*\r?$/iu.test(lines[index + 1] ?? "")
      ) {
        const closing = lines.findIndex(
          (value, offset) => offset > index + 1 && /^```[ \t]*\r?$/u.test(value),
        );
        if (closing !== -1 && /^```[ \t]*\r?$/u.test(lines[closing + 1] ?? "")) {
          examples.set(
            index + 1,
            lines
              .slice(index + 1, closing + 1)
              .map((value) => value.replace(/\r$/u, ""))
              .join("\n"),
          );
          // Mask only the inner closing fence, retaining all source offsets.
          lines[closing] = (lines[closing] ?? "").replace("```", "   ");
          index = closing + 1;
          continue;
        }
      }
      if (marker === "`" && match[2]?.includes("`")) continue;
      fence = { marker, length: match[1].length };
    }
    const tree = parse(lines.join("\n"), file);
    visit(tree, (node) => {
      if (node.type !== "code") return;
      const value = examples.get(node.position?.start.line ?? 0);
      if (value === undefined) return;
      Object.assign(node, { value, lang: "markdown" });
    });
    return tree;
  };
};

/** Shared syntax; callers clone the frozen processor before adding transforms. */
export const markdownParser = syntax
  .use(embedSourceExamples)
  .use(remarkFrontmatter, ["yaml"])
  .use(remarkGfm)
  .use(remarkMath)
  .freeze();
