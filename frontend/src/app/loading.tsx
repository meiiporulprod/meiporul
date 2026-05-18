export default function Loading() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10 animate-pulse">
      {/* Generic Page Header Skeleton */}
      <div className="mb-10 mt-2">
        <div className="h-8 bg-slate-800/80 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-800/60 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-slate-800/60 rounded w-1/2"></div>
      </div>

      {/* Generic Content / Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5">
            <div className="flex justify-between items-start mb-4 gap-4">
              <div className="h-5 bg-slate-800/80 rounded w-2/3"></div>
              <div className="h-6 bg-slate-800/80 rounded-full w-24 shrink-0"></div>
            </div>
            <div className="h-3 bg-slate-800/60 rounded w-full mb-2"></div>
            <div className="h-3 bg-slate-800/60 rounded w-5/6 mb-5"></div>
            <div className="flex gap-4">
              <div className="h-3 bg-slate-800/60 rounded w-16"></div>
              <div className="h-3 bg-slate-800/60 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
