import type { MarkdownEmbed } from "@my-knowledge/content";

type Architecture = Extract<MarkdownEmbed, { kind: "architecture" }>;

// Use conservative glyph widths at the diagram's 14px font size. Break at words
// where possible, and at grapheme boundaries for CJK or long unbroken labels.
function labelLines(label: string) {
  const lines: string[] = [];
  let line = "";
  let width = 0;
  const segments = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  for (const word of label.split(/(\s+)/u)) {
    const glyphs = [...segments.segment(word)].map(({ segment }) => segment);
    const sizes = glyphs.map((glyph) =>
      /\s/u.test(glyph)
        ? 5
        : /^[MW@%&#]$/u.test(glyph)
          ? 14
          : /^[\x20-\x7e]$/u.test(glyph)
            ? 9
            : /[\u{1f000}-\u{1faff}\u2600-\u27ff]/u.test(glyph)
              ? 28
              : 14,
    );
    const wordWidth = sizes.reduce((sum, size) => sum + size, 0);
    if (line.trim() && wordWidth <= 128 && width + wordWidth > 128) {
      lines.push(line.trimEnd());
      line = "";
      width = 0;
    }
    for (const [index, glyph] of glyphs.entries()) {
      const size = sizes[index] ?? 14;
      if (!line && /\s/u.test(glyph)) continue;
      if (width + size > 128 && line) {
        lines.push(line.trimEnd());
        line = "";
        width = 0;
        if (/\s/u.test(glyph)) continue;
      }
      line += glyph;
      width += size;
    }
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}

export function layoutArchitecture(graph: Architecture, compact = false) {
  const labeled = graph.nodes.map((node) => ({ ...node, lines: labelLines(node.label) }));
  const nodeHeight = Math.max(80, ...labeled.map((node) => node.lines.length * 20 + 24));
  const incoming = new Map(graph.nodes.map((node) => [node.id, 0]));
  const levels = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of graph.edges) incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  const queue = graph.nodes.filter((node) => incoming.get(node.id) === 0).map((node) => node.id);
  const visited = new Set<string>();
  for (const id of queue) {
    visited.add(id);
    for (const edge of graph.edges.filter((edge) => edge.from === id)) {
      levels.set(edge.to, Math.max(levels.get(edge.to) ?? 0, (levels.get(id) ?? 0) + 1));
      const count = (incoming.get(edge.to) ?? 0) - 1;
      incoming.set(edge.to, count);
      if (count === 0) queue.push(edge.to);
    }
  }
  // Cycles are valid input. Give their remaining nodes distinct columns and route returns outside.
  let nextLevel = visited.size
    ? Math.max(
        ...graph.nodes
          .filter((node) => visited.has(node.id))
          .map((node) => levels.get(node.id) ?? 0),
      ) + 1
    : 0;
  for (const node of graph.nodes) {
    if (!visited.has(node.id)) levels.set(node.id, nextLevel++);
  }
  const groups = new Map<number, typeof labeled>();
  for (const node of labeled) {
    const level = levels.get(node.id) ?? 0;
    const group = groups.get(level);
    if (group) group.push(node);
    else groups.set(level, [node]);
  }
  if (compact) {
    const rowStep = nodeHeight + 40;
    let row = 0;
    const nodes = [...groups.entries()].flatMap(([level, group]) => {
      const start = row;
      row += Math.ceil(group.length / 2);
      return group.map((node, index) => ({
        ...node,
        height: nodeHeight,
        level,
        x: group.length % 2 === 1 && index === group.length - 1 ? 120 : 32 + (index % 2) * 176,
        y: 24 + (start + Math.floor(index / 2)) * rowStep,
      }));
    });
    const positions = new Map(nodes.map((node) => [node.id, node]));
    const edges = graph.edges.map((edge, index) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) throw new Error("Architecture edge references a missing node");
      const x = from.x + 80;
      const y = from.y + nodeHeight;
      const end = to.x + 80;
      const rail = 8 + (index % 5) * 4;
      const path =
        to.y === from.y + rowStep
          ? `M${x} ${y} C${x} ${y + 20} ${end} ${to.y - 20} ${end} ${to.y}`
          : `M${x} ${y} L${x} ${y + 16} L${rail} ${y + 16} L${rail} ${to.y - 16} L${end} ${to.y - 16} L${end} ${to.y}`;
      return {
        ...edge,
        path: `${path} M${end - 6} ${to.y - 8} L${end} ${to.y} L${end + 6} ${to.y - 8}`,
      };
    });
    return { nodes, edges, width: 400, height: row * rowStep + 8 };
  }
  const rowStep = nodeHeight + 32;
  const rows = Math.max(...[...groups.values()].map((nodes) => nodes.length));
  const routed = graph.edges.filter(
    (edge) => (levels.get(edge.to) ?? 0) !== (levels.get(edge.from) ?? 0) + 1,
  );
  const top = 24 + routed.length * 14;
  const nodes = [...groups.entries()].flatMap(([level, group]) =>
    group.map((node, row) => ({
      ...node,
      height: nodeHeight,
      level,
      x: 24 + level * 224,
      y: top + ((rows - group.length) / 2 + row) * rowStep,
    })),
  );
  const positions = new Map(nodes.map((node) => [node.id, node]));
  const edges = graph.edges.map((edge) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) throw new Error("Architecture edge references a missing node");
    const start = from.x + 160;
    const startY = from.y + nodeHeight / 2;
    const endY = to.y + nodeHeight / 2;
    if (to.x === from.x + 224) {
      const middle = start + 32;
      return {
        ...edge,
        path: `M${start} ${startY} C${middle} ${startY} ${middle} ${endY} ${to.x} ${endY} M${to.x - 8} ${endY - 6} L${to.x} ${endY} L${to.x - 8} ${endY + 6}`,
      };
    }
    const rail = 12 + routed.indexOf(edge) * 14;
    const end = to.x;
    return {
      ...edge,
      path: `M${start} ${startY} L${start + 20} ${startY} L${start + 20} ${rail} L${end - 20} ${rail} L${end - 20} ${endY} L${end} ${endY} M${end - 8} ${endY - 6} L${end} ${endY} L${end - 8} ${endY + 6}`,
    };
  });
  return {
    nodes,
    edges,
    width: Math.max(...nodes.map((node) => node.x)) + 184 + (routed.length ? 24 : 0),
    height: top + rows * rowStep,
  };
}
