export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-8">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon.png"
          alt=""
          className="h-9 w-9 animate-pulse rounded-[10px] border border-line"
        />
        <div className="font-display text-[13px] font-bold text-muted">
          Loading…
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <div className="h-[64px] animate-pulse rounded-[14px] border border-line bg-paper" />
        <div className="h-[64px] animate-pulse rounded-[14px] border border-line bg-paper" />
        <div className="h-[64px] animate-pulse rounded-[14px] border border-line bg-paper" />
      </div>
    </div>
  );
}
