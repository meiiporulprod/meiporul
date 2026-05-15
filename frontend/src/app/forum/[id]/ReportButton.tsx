"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReportButton({
  postId,
  initialReported,
  isLoggedIn,
}: {
  postId: string;
  initialReported: boolean;
  isLoggedIn: boolean;
}) {
  const [reported, setReported] = useState(initialReported);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    if (!isLoggedIn) { router.push("/login"); return; }
    setLoading(true);
    const res = await fetch("/api/forum/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId, action_type: "reported_id" }),
    });
    if (res.ok) {
      const data = await res.json();
      setReported(data.toggled === "added");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-sm font-semibold px-5 py-2.5 rounded-lg border transition-colors disabled:opacity-50 ${
        reported
          ? "bg-green-900/40 border-green-700 text-green-300 hover:bg-red-900/30 hover:border-red-700 hover:text-red-300"
          : "bg-red-700 border-red-600 text-white hover:bg-red-600"
      }`}
    >
      {loading ? "…" : reported ? "✓ I reported this" : "I reported this"}
    </button>
  );
}
