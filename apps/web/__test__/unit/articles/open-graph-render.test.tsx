import { mkdir, readFile, writeFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import { expect, it } from "vite-plus/test";
import {
  ArticleOpenGraphCard,
  articleOpenGraphSize,
} from "@/articles/components/article-open-graph-card";

it("renders multilingual and long titles with the supplied local font", async () => {
  const font = await readFile(new URL("../../../public/fonts/knowledge-og.woff", import.meta.url));
  const output = process.env.OG_EVIDENCE;
  if (output) await mkdir(output, { recursive: true });
  for (const { name, title } of [
    { name: "chinese", title: "可扩展的知识边界" },
    { name: "english", title: "A small place for ideas to find each other" },
    {
      name: "long",
      title:
        "在信息与灵感之间建立连接：如何让个人知识库成为能够持续生长、自由探索并与他人分享的思想空间，而不是另一个收集了许多资料却再也不会打开的文件夹",
    },
    { name: "japanese", title: "音と言葉のあいだに、新しいつながりを見つける" },
  ]) {
    const response = new ImageResponse(
      ArticleOpenGraphCard({ title, date: "2026年9月12日", domain: "knowledge.you-find.me" }),
      {
        ...articleOpenGraphSize,
        fonts: [
          {
            name: "Knowledge",
            data: font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength),
            weight: 500,
            style: "normal",
          },
        ],
      },
    );
    const png = Buffer.from(await response.arrayBuffer());
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    if (output) await writeFile(`${output}/${name}.png`, png);
  }
}, 20_000);
