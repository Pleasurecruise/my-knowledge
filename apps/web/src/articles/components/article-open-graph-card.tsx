import { IdentityMark } from "@/shell/identity-mark";
import type { ArticleOpenGraphCardProps } from "./article-open-graph-card.types";

export const articleOpenGraphSize = { width: 1200, height: 630 };
export const articleOpenGraphVersion = "4";

export function ArticleOpenGraphCard({ date, domain, title }: ArticleOpenGraphCardProps) {
  return (
    <div
      style={{
        background: "#f6f6f2",
        color: "#2b302e",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Knowledge",
        fontWeight: 500,
        width: "100%",
        height: "100%",
        padding: "64px 80px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", color: "#607149", gap: 10 }}>
        <IdentityMark size={28} />
        <span style={{ color: "#61685f", fontSize: 19 }}>my knowledge</span>
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", paddingBottom: 14 }}>
        <div
          style={{
            display: "block",
            fontSize: 48,
            lineHeight: 1.5,
            lineClamp: 3,
            textOverflow: "ellipsis",
            overflow: "hidden",
            width: "100%",
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid #d8ddd3",
          paddingTop: 22,
          color: "#61685f",
          fontSize: 17,
        }}
      >
        <span>{domain}</span>
        <span>{date}</span>
      </div>
    </div>
  );
}
