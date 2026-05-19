"use client";

import { useState } from "react";

export default function CommunityNoteModal({
  tweetUrl,
  onClose,
}: {
  tweetUrl: string;
  onClose: () => void;
}) {
  const [noteText, setNoteText]   = useState("");
  const [status,   setStatus]     = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg]   = useState("");
  const [copied,   setCopied]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    const res = await fetch("/api/social/community-note", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ tweet_url: tweetUrl, note_text: noteText }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error ?? "Something went wrong");
      setStatus("error");
    } else {
      setStatus("success");
    }
  }

  function copyNote() {
    navigator.clipboard.writeText(`${noteText}\n\nSource: meiporul.vercel.app`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
        {status !== "success" ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-white">Add Community Note</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Help others understand the context behind this tweet
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-300 transition-colors ml-4"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tweet URL */}
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">Tweet</label>
              <div className="text-xs text-slate-500 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 truncate">
                {tweetUrl}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Your note
                  <span className="float-right">{noteText.length}/280</span>
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  maxLength={280}
                  rows={4}
                  placeholder="Add context, clarification, or fact-check for this tweet…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 resize-none"
                  required
                />
              </div>

              {status === "error" && (
                <p className="text-xs text-red-400">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === "submitting" || noteText.length < 10}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {status === "submitting" ? "Submitting…" : "Submit for review"}
              </button>
            </form>
          </>
        ) : (
          /* Success state */
          <div className="text-center space-y-5">
            <div className="w-12 h-12 bg-emerald-900/40 border border-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Submitted for review</p>
              <p className="text-slate-400 text-sm mt-1">
                Our team will review and publish it shortly.
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-4 space-y-3">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Also post this on X Community Notes
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                X Community Notes lets contributors add context to tweets directly on the platform —
                your note reaches more people.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={copyNote}
                  className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
                >
                  {copied ? "Copied!" : "Copy note text"}
                </button>
                <a
                  href="https://x.com/i/communitynotes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-xs bg-white/10 hover:bg-white/20 text-white text-center py-2 rounded-lg transition-colors"
                >
                  Open X Notes →
                </a>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
