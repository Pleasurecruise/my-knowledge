import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

export function markdownEquivalent(source: string, candidate: string): boolean {
  const withoutPosition = (key: string, value: unknown) => (key === "position" ? undefined : value);
  return (
    JSON.stringify(parser.parse(source), withoutPosition) ===
    JSON.stringify(parser.parse(candidate), withoutPosition)
  );
}
