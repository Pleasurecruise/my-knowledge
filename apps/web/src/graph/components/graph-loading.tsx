export function GraphLoading() {
  return (
    <div className="graph-loading motion-safe:animate-pulse" aria-busy="true" aria-hidden="true">
      <div className="graph-workspace">
        <div className="graph-toolbar">
          <div className="h-8 w-24 rounded-md bg-muted" />
          <div className="h-8 w-20 rounded-md bg-muted" />
          <div className="h-8 w-20 rounded-md bg-muted" />
        </div>
        <div className="graph-workspace-body">
          <div className="graph-stage grid place-items-center">
            <div className="flex flex-col items-center gap-16">
              <div className="size-8 rounded-full bg-muted" />
              <div className="size-6 rounded-full bg-muted" />
            </div>
          </div>
          <div className="graph-sidebar">
            <div className="space-y-4 p-5">
              <div className="h-3 w-16 rounded-sm bg-muted" />
              <div className="h-5 w-4/5 rounded-sm bg-muted" />
              <div className="h-16 rounded-sm bg-muted" />
            </div>
            <div className="graph-relationships space-y-4">
              <div className="h-3 w-20 rounded-sm bg-muted" />
              <div className="h-10 rounded-sm bg-muted" />
              <div className="h-10 rounded-sm bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
