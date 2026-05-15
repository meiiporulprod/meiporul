"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RetryFactCheck({
  postId,
  claim,
}: {
  postId: string;
  claim: string;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function retry() {
    setLoading(true);
    await fetch("/api/forum/fact-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId, claim }),
    }).catch(console.error);
    setDone(true);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={retry}
      disabled={loading || done}
      className="text-xs text-slate-400 hover:text-white underline disabled:opacity-50 transition-colors"
    >
      {loading ? "Running fact-check…" : done ? "Done — refreshing…" : "Retry fact-check"}
    </button>
  );
}
