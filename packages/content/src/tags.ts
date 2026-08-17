import { MAX_TAGS } from "./schema";

export function validateTagSyntax(tag: string): void {
  if (
    tag.length === 0 ||
    tag !== tag.trim() ||
    /\s/u.test(tag) ||
    tag.startsWith("/") ||
    tag.endsWith("/") ||
    tag.includes("//") ||
    !/^[\p{L}\p{N}][\p{L}\p{N}_/-]*$/u.test(tag)
  ) {
    throw new Error(`Invalid tag: ${tag}`);
  }
}

export function canonicalizeTags(
  tags: readonly string[],
  existingTags: readonly string[] = [],
): string[] {
  if (tags.length > MAX_TAGS) throw new Error(`An article may have at most ${MAX_TAGS} tags`);

  const existing = new Map(existingTags.map((tag) => [tag.toLocaleLowerCase("en-US"), tag]));
  const canonical = new Map<string, string>();

  for (const tag of tags) {
    validateTagSyntax(tag);
    const key = tag.toLocaleLowerCase("en-US");
    const existingTag = existing.get(key);
    const currentTag = canonical.get(key);
    canonical.set(key, existingTag || currentTag || tag);
  }

  return [...canonical.values()];
}
