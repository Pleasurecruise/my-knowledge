import { z } from "zod";
import packs from "./emoji-packs.json";

const packSchema = z.strictObject({
  key: z.string().regex(/^[a-z0-9]+$/iu),
  name: z.string().trim().min(1),
  display: z.enum(["emoji", "sticker"]),
  items: z.array(
    z.strictObject({
      name: z.string().regex(/^[^:\s]+$/u),
      value: z.url().refine((value) => {
        const url = new URL(value);
        return url.protocol === "https:" && !url.username && !url.password;
      }, "Emoji images require an HTTPS URL without credentials"),
    }),
  ),
});

export type EmojiPack = z.infer<typeof packSchema>;
export type ImageEmoji = EmojiPack["items"][number] & { display: EmojiPack["display"] };

export function createEmojiCatalog(source: unknown): ReadonlyMap<string, ImageEmoji> {
  const catalog = new Map<string, ImageEmoji>();
  for (const pack of z.array(packSchema).parse(source)) {
    for (const item of pack.items) {
      const shortcode = `:${pack.key}_${item.name}:`;
      if (catalog.has(shortcode)) throw new Error("Duplicate emoji shortcode");
      catalog.set(shortcode, { ...item, display: pack.display });
    }
  }
  return catalog;
}

// Owner-selected packs; numeric names remain stable as the catalog grows.
export const imageEmojis = createEmojiCatalog(packs);
