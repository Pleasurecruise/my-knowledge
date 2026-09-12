"use client";

import { Button, buttonVariants } from "@my-knowledge/ui/components/button";
import { ArrowLeft, RefreshCw } from "@my-knowledge/ui/icons";
import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-shell flex min-h-[60svh] items-center">
      <div className="mx-auto w-full max-w-(--article-measure) py-10">
        <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">500 /</p>
        <h1 className="mt-5 text-2xl font-medium tracking-tight sm:text-3xl">
          <span className="hidden [html:lang(zh)_&]:inline">这页暂时无法载入。</span>
          <span className="hidden [html:lang(en)_&]:inline">This page could not be loaded.</span>
          <span className="hidden [html:lang(ja)_&]:inline">このページを読み込めません。</span>
        </h1>
        <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
          <span className="hidden [html:lang(zh)_&]:inline">
            请求没有完成。你可以重试，或返回首页继续浏览。
          </span>
          <span className="hidden [html:lang(en)_&]:inline">
            The request did not complete. Retry it or return home to continue browsing.
          </span>
          <span className="hidden [html:lang(ja)_&]:inline">
            リクエストが完了しませんでした。再試行するか、ホームに戻ってください。
          </span>
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button onClick={reset}>
            <RefreshCw data-icon="inline-start" />
            <span className="hidden [html:lang(zh)_&]:inline">重新载入</span>
            <span className="hidden [html:lang(en)_&]:inline">Try again</span>
            <span className="hidden [html:lang(ja)_&]:inline">再試行</span>
          </Button>
          <Link className={buttonVariants({ variant: "ghost" })} href="/">
            <ArrowLeft data-icon="inline-start" />
            <span className="hidden [html:lang(zh)_&]:inline">返回首页</span>
            <span className="hidden [html:lang(en)_&]:inline">Return home</span>
            <span className="hidden [html:lang(ja)_&]:inline">ホームに戻る</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
