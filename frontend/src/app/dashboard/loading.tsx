export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-8">
        <div className="h-8 bg-slate-800/80 rounded w-40"></div>
        <div className="h-9 bg-slate-800/80 rounded-lg w-28"></div>
      </div>

      {/* Stats Skeleton Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5">
            <div className="h-3 bg-slate-800/60 rounded w-20 mb-3"></div>
            <div className="h-8 bg-slate-800/80 rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* List/Table Skeleton */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
        <div className="bg-slate-800/30 p-4 border-b border-slate-800/80">
          <div className="h-4 bg-slate-800/60 rounded w-32"></div>
        </div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-4 border-b border-slate-800/80 flex justify-between items-center">
            <div className="space-y-2 w-1/2">
              <div className="h-4 bg-slate-800/80 rounded w-full"></div>
              <div className="h-3 bg-slate-800/60 rounded w-2/3"></div>
            </div>
            <div className="h-6 bg-slate-800/80 rounded-full w-24"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
