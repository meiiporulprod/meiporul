import type { PromiseStatus } from "@/lib/types";

const styles: Record<PromiseStatus, string> = {
  pending:     "bg-slate-700 text-slate-300",
  in_progress: "bg-blue-900 text-blue-300",
  fulfilled:   "bg-green-900 text-green-300",
  broken:      "bg-red-900 text-red-300",
  unclear:     "bg-yellow-900 text-yellow-300",
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
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
