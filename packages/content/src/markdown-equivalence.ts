import { markdownParser } from "./markdown";

export function markdownEquivalent(source: string, candidate: string): boolean {
  const withoutPosition = (key: string, value: unknown) => (key === "position" ? undefined : value);
  return (
    JSON.stringify(markdownParser.parse(source), withoutPosition) ===
    JSON.stringify(markdownParser.parse(candidate), withoutPosition)
  );
}
