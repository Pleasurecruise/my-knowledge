import { expect, it } from "vite-plus/test";
import { parseMarkdownEmbed } from "@my-knowledge/content";
import { layoutArchitecture } from "../src/architecture";

function layout(source: string, compact = false) {
  const graph = parseMarkdownEmbed("embed:architecture", `flowchart LR\n${source}`);
  if (graph?.kind !== "architecture") throw new Error("Expected an architecture fixture");
  return layoutArchitecture(graph, compact);
}

it("reflows wide branches into bounded paired rows on phones", () => {
  const result = layout(
    "Browser --> API\nVesper --> API\nAPI --> Validate\nValidate --> D1\nValidate --> R2\nValidate --> KV\nValidate --> Search",
    true,
  );
  expect(result.width).toBe(400);
  expect(result.height).toBe(608);
  expect(result.edges).toHaveLength(7);
  for (const a of result.nodes) {
    expect(a.x + 160).toBeLessThanOrEqual(result.width);
    expect(a.y + 80).toBeLessThanOrEqual(result.height);
    for (const b of result.nodes) {
      if (a.id !== b.id)
        expect(a.x + 160 <= b.x || b.x + 160 <= a.x || a.y + 80 <= b.y || b.y + 80 <= a.y).toBe(
          true,
        );
    }
  }
});

it("groups branches and joins without overlapping node boxes", () => {
  const result = layout(
    "Browser --> API\nVesper --> API\nAPI --> Validate\nValidate --> D1\nValidate --> R2\nValidate --> KV\nValidate --> Search",
  );
  const columns = [...new Set(result.nodes.map((node) => node.x))];
  expect(columns.map((x) => result.nodes.filter((node) => node.x === x).length)).toEqual([
    2, 1, 1, 4,
  ]);
  for (const a of result.nodes)
    for (const b of result.nodes) {
      if (a.id === b.id) continue;
      expect(a.x + 160 <= b.x || b.x + 160 <= a.x || a.y + 80 <= b.y || b.y + 80 <= a.y).toBe(true);
    }
  for (const node of result.nodes) {
    expect(node.x + 160).toBeLessThanOrEqual(result.width);
    expect(node.y + 80).toBeLessThanOrEqual(result.height);
  }
  expect(result.edges).toHaveLength(7);
});

it("routes skipped columns above intervening nodes", () => {
  const result = layout("Web --> UI\nUI --> Content\nWeb --> Content");
  const crossing = result.edges.find((edge) => edge.from === "Web" && edge.to === "Content");
  expect(crossing?.path).toContain(" 12 ");
  expect(result.nodes.every((node) => node.y > 12)).toBe(true);
});

it.each(["A --> B\nB --> A", "A --> A\nA --> B", "A --> B\nC --> D", "A --> B\nB --> C\nC --> B"])(
  "retains every node and edge for cyclic or disconnected input: %s",
  (source) => {
    const result = layout(source);
    expect(result.edges).toHaveLength(source.split("\n").length);
    expect(new Set(result.nodes.map((node) => `${node.x},${node.y}`)).size).toBe(
      result.nodes.length,
    );
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.edges.every((edge) => !/NaN|undefined/.test(edge.path))).toBe(true);
  },
);
