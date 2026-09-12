import type { AnchorHTMLAttributes } from "react";
import { IntentLink } from "@/shell/intent-link";

export function ArticleLink({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (href?.startsWith("/") && !href.startsWith("//") && !props.download && !props.target)
    return (
      <IntentLink {...props} href={href}>
        {children}
      </IntentLink>
    );
  return (
    <a {...props} href={href}>
      {children}
    </a>
  );
}
