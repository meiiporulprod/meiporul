import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";

const STATUSES = [
  { value: "pending",     label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "fulfilled",   label: "Fulfilled" },
  { value: "broken",      label: "Broken" },
  { value: "unclear",     label: "Unclear" },
];

const FEASIBILITIES = [
  { value: "",              label: "— Not assessed —" },
  { value: "fulfillable",   label: "Fulfillable — can be fully delivered" },
  { value: "partial",       label: "Partially Fulfillable — barriers to full delivery" },
  { value: "blocked",       label: "Structurally Blocked — external factors prevent it" },
  { value: "unfulfillable", label: "Not Fulfillable — cannot be delivered" },
];

export default async function EditPromisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: promise } = await supabase
    .from("promises")
    .select("id, promise_text, promise_tamil, category, status, status_evidence, status_source_url, impact_level, made_by, made_on, source_name, feasibility")
    .eq("id", id)
    .single();

  if (!promise) notFound();

  async function updatePromise(formData: FormData) {
    "use server";
    const sb = await createClient();
    const feasibilityVal = formData.get("feasibility") as string;
    await sb
      .from("promises")
      .update({
        status:            formData.get("status") as string,
        status_evidence:   formData.get("status_evidence") as string || null,
        status_source_url: formData.get("status_source_url") as string || null,
        status_updated_at: new Date().toISOString(),
        feasibility:       feasibilityVal || null,
      })
      .eq("id", id);
    redirect("/dashboard/promises");
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <a href="/dashboard/promises" className="text-sm text-slate-400 hover:text-white transition-colors">
          ← Back to promises
        </a>
      </div>

      <h1 className="text-xl font-bold mb-1">Update Promise</h1>
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-6 capitalize">
        {promise.category} · {promise.made_by}
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <p className="text-sm leading-relaxed text-slate-200">{promise.promise_text}</p>
        {promise.promise_tamil && (
          <p className="text-sm leading-relaxed text-slate-400 mt-2">{promise.promise_tamil}</p>
        )}
      </div>

      <form action={updatePromise} className="space-y-5">
        {/* Status */}
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2">
            Status
          </label>
          <select
            name="status"
            defaultValue={promise.status}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-slate-500"
          >
            {STATUSES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Feasibility */}
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2">
            Feasibility Assessment
          </label>
          <select
            name="feasibility"
            defaultValue={promise.feasibility ?? ""}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-slate-500"
          >
            {FEASIBILITIES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Evidence */}
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2">
            Status Evidence
          </label>
          <textarea
            name="status_evidence"
            defaultValue={promise.status_evidence ?? ""}
            rows={5}
            placeholder="Document what has or hasn't happened. Be specific — dates, GOs, news links, official statements."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-y"
          />
        </div>

        {/* Source URL */}
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2">
            Source URL (evidence link)
          </label>
          <input
            type="url"
            name="status_source_url"
            defaultValue={promise.status_source_url ?? ""}
            placeholder="https://..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-500"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-white text-slate-900 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors"
          >
            Save changes
          </button>
          <a
            href="/dashboard/promises"
            className="px-5 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
