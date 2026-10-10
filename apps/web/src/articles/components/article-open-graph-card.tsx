import type { ArticleOpenGraphCardProps } from "./article-open-graph-card.types";

export const articleOpenGraphSize = { width: 1200, height: 630 };
export const articleOpenGraphVersion = "4";

// The title gets one line beside the illustration, measured in full-width characters.
const TITLE_UNITS = 16;

export function ArticleOpenGraphCard({ base, date, title }: ArticleOpenGraphCardProps) {
  let line = "";
  let units = 0;
  for (const character of title) {
    const unit = /[\u2e80-\uffef]/.test(character) ? 1 : 0.55;
    if (units + unit > TITLE_UNITS) {
      line = `${line.trimEnd()}…`;
      break;
    }
    line += character;
    units += unit;
  }
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        fontFamily: "Knowledge",
        width: "100%",
        height: "100%",
      }}
    >
      {/* The fixed part of every card: the blue wash, the illustration card and the handwritten name. */}
      <img src={base} alt="" width={1200} height={630} style={{ position: "absolute" }} />
      <span style={{ position: "absolute", left: 76, top: 356, color: "#1d2634", fontSize: 31 }}>
        {line}
      </span>
      <span style={{ position: "absolute", left: 76, top: 418, color: "#5d6b7e", fontSize: 21 }}>
        {date}
      </span>
    </div>
  );
}
