import { visit } from "unist-util-visit";
import { markdownParser } from "./markdown";

export function markdownCodeFence(value: string): string {
  return "`".repeat(
    Math.max(3, ...Array.from(value.matchAll(/`+/gu), ([match]) => match.length + 1)),
  );
}

export function markdownForEditor(source: string): string {
  const replacements: { start: number; end: number; value: string }[] = [];
  visit(markdownParser.parse(source), "code", (node) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (
      start === undefined ||
      end === undefined ||
      !/^```[ \t]*\r?\n {0,3}```embed:/u.test(source.slice(start, end))
    )
      return;
    const fence = markdownCodeFence(node.value);
    replacements.push({ start, end, value: `${fence}markdown\n${node.value}\n${fence}` });
  });
  for (const { start, end, value } of replacements.reverse()) {
    source = source.slice(0, start) + value + source.slice(end);
  }
  return source;
}
