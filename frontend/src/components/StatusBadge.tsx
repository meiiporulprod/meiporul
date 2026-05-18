import type { PromiseStatus } from "@/lib/types";

const styles: Record<PromiseStatus, string> = {
  pending:     "bg-slate-800/50 text-slate-300 border-slate-700/50 shadow-[0_0_10px_rgba(148,163,184,0.1)]",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]",
  fulfilled:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
  broken:      "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]",
  unclear:     "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
};

const labels: Record<PromiseStatus, string> = {
  pending:     "Pending",
  in_progress: "In Progress",
  fulfilled:   "Fulfilled",
  broken:      "Broken",
  unclear:     "Unclear",
};

export default function StatusBadge({ status }: { status: PromiseStatus }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border backdrop-blur-sm tracking-wide uppercase ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
