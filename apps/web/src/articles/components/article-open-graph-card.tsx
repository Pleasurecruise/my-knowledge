import type { ArticleOpenGraphCardProps } from "./article-open-graph-card.types";

export const articleOpenGraphSize = { width: 1200, height: 630 };

export function ArticleOpenGraphCard({ date, domain, tags, title }: ArticleOpenGraphCardProps) {
  const titleCharacters = Array.from(title);
  const visibleTitle =
    titleCharacters.length > 68 ? `${titleCharacters.slice(0, 67).join("")}…` : title;
  const titleSize =
    titleCharacters.length <= 18
      ? 72
      : titleCharacters.length <= 36
        ? 64
        : titleCharacters.length <= 54
          ? 56
          : 50;

  return (
    <div
      style={{
        alignItems: "center",
        background: "#e8eef2",
        color: "#263640",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#fbfdfe",
          border: "1px solid #cbd7de",
          borderRadius: 10,
          display: "flex",
          flexDirection: "column",
          height: 534,
          padding: "52px 58px 30px",
          position: "relative",
          width: 1088,
        }}
      >
        <div
          style={{
            background: "#477a98",
            borderRadius: 3,
            height: 5,
            left: 10,
            position: "absolute",
            top: -3,
            width: 176,
          }}
        />
        <div style={{ alignItems: "center", display: "flex", height: 48 }}>
          <div
            style={{
              alignItems: "center",
              background: "#477a98",
              borderRadius: 5,
              color: "#fbfdfe",
              display: "flex",
              fontSize: 16,
              fontWeight: 700,
              height: 38,
              justifyContent: "center",
              letterSpacing: "-0.03em",
              width: 38,
            }}
          >
            MK
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.025em" }}>
              my knowledge
            </div>
            <div
              style={{
                color: "#6d7f8a",
                fontSize: 12,
                letterSpacing: "0.12em",
                marginTop: 2,
                textTransform: "uppercase",
              }}
            >
              Personal knowledge
            </div>
          </div>
        </div>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flex: 1,
            padding: "10px 24px 14px",
          }}
        >
          <div
            style={{
              borderLeft: "4px solid #477a98",
              display: "flex",
              fontFamily: "Georgia, Times New Roman, serif",
              fontSize: titleSize,
              fontWeight: 600,
              letterSpacing: "-0.035em",
              lineHeight: 1.08,
              paddingLeft: 24,
              width: "100%",
            }}
          >
            {visibleTitle}
          </div>
        </div>
        <div style={{ alignItems: "center", display: "flex", height: 44 }}>
          <div style={{ display: "flex", flex: 1 }}>
            {tags.slice(0, 3).map((tag) => (
              <div
                key={tag}
                style={{
                  border: "1px solid #cbd7de",
                  borderRadius: 4,
                  color: "#607581",
                  display: "flex",
                  fontSize: 14,
                  marginRight: 10,
                  padding: "6px 11px",
                }}
              >
                #{tag}
              </div>
            ))}
          </div>
          <div
            style={{
              color: "#607581",
              display: "flex",
              fontSize: 13,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {domain} · {date}
          </div>
        </div>
      </div>
    </div>
  );
}
