import {
  enrichTweet,
  TweetBody,
  TweetContainer,
  TweetHeader,
  TweetMedia,
  TweetInfoCreatedAt,
  QuotedTweet,
} from "react-tweet";
import type { Tweet } from "react-tweet/api";
import type { MarkdownEmbed } from "@my-knowledge/content";

export function TweetCard({ tweet, align }: { tweet: Tweet; align: MarkdownEmbed["align"] }) {
  const post = enrichTweet(tweet);
  return (
    <TweetContainer
      className={`not-prose markdown-embed markdown-embed-twitter markdown-embed-${align} tweet-card`}
    >
      <TweetHeader tweet={post} />
      <TweetBody tweet={post} />
      {post.mediaDetails?.length ? <TweetMedia tweet={post} /> : null}
      {post.quoted_tweet ? <QuotedTweet tweet={post.quoted_tweet} /> : null}
      <footer className="tweet-card-date">
        <TweetInfoCreatedAt tweet={post} />
      </footer>
    </TweetContainer>
  );
}
