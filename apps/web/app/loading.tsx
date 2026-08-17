export default function Loading() {
  return (
    <div aria-busy="true" className="mx-auto max-w-280 px-4 pt-7 pb-24 sm:px-8">
      <span className="sr-only">
        <span className="hidden [html:lang(zh)_&]:inline">正在载入</span>
        <span className="hidden [html:lang(en)_&]:inline">Loading</span>
        <span className="hidden [html:lang(ja)_&]:inline">読み込み中</span>
      </span>
      <div aria-hidden="true" className="mx-auto max-w-180 motion-safe:animate-pulse">
        <div className="h-7 w-28 rounded-sm bg-muted" />
        <div className="mt-4 h-3 w-3/5 rounded-sm bg-muted" />
        <div className="mt-10 space-y-4 border-y py-6">
          <div className="h-3 w-full rounded-sm bg-muted" />
          <div className="h-3 w-5/6 rounded-sm bg-muted" />
          <div className="h-3 w-2/3 rounded-sm bg-muted" />
        </div>
      </div>
    </div>
  );
}
