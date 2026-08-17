"use client";

import { Button, buttonVariants } from "@my-knowledge/ui/components/button";
import { ArrowLeft } from "@my-knowledge/ui/icons";
import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-280 px-4 py-20 sm:px-8 sm:py-28">
      <div className="max-w-xl border-l pl-6 sm:pl-10">
        <p className="font-mono text-xs text-muted-foreground">500 · ERROR</p>
        <h1 className="font-heading mt-4 text-xl font-semibold tracking-[-0.015em] sm:text-[1.375rem]">
          <span className="hidden [html:lang(zh)_&]:inline">这页暂时无法载入。</span>
          <span className="hidden [html:lang(en)_&]:inline">This page could not be loaded.</span>
          <span className="hidden [html:lang(ja)_&]:inline">このページを読み込めません。</span>
        </h1>
        <p className="mt-4 max-w-md leading-7 text-muted-foreground">
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
        <div className="mt-7 flex flex-wrap items-center gap-x-4">
          <Button className="px-0" onClick={reset} variant="link">
            <span className="hidden [html:lang(zh)_&]:inline">重新载入</span>
            <span className="hidden [html:lang(en)_&]:inline">Try again</span>
            <span className="hidden [html:lang(ja)_&]:inline">再試行</span>
          </Button>
          <Link className={buttonVariants({ className: "px-0", variant: "link" })} href="/">
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
