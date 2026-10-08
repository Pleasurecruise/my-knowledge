import {
  enrichTweet,
  TweetBody,
  TweetContainer,
  TweetHeader,
  TweetMedia,
  QuotedTweet,
} from "react-tweet";
import type { Tweet } from "react-tweet/api";
import type { MarkdownEmbed } from "@my-knowledge/content";

const createdAtFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function TweetCard({ tweet, align }: { tweet: Tweet; align: MarkdownEmbed["align"] }) {
  const post = enrichTweet(tweet);
  const createdAt = new Date(post.created_at);
  const parts = Object.fromEntries(
    createdAtFormat.formatToParts(createdAt).map(({ type, value }) => [type, value]),
  );
  const date = `${parts.hour}:${parts.minute} ${parts.dayPeriod} · ${parts.month} ${parts.day}, ${parts.year}`;
  return (
    <TweetContainer
      className={`not-prose markdown-embed markdown-embed-twitter markdown-embed-${align} tweet-card`}
    >
      <TweetHeader tweet={post} />
      <TweetBody tweet={post} />
      {post.mediaDetails?.length ? <TweetMedia tweet={post} /> : null}
      {post.quoted_tweet ? <QuotedTweet tweet={post.quoted_tweet} /> : null}
      <footer className="tweet-card-date">
        <a aria-label={date} href={post.url} rel="noopener noreferrer" target="_blank">
          <time dateTime={createdAt.toISOString()}>{date}</time>
        </a>
      </footer>
    </TweetContainer>
  );
}
