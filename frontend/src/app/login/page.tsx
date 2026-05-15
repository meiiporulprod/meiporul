"use client";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); }
      else { router.push("/forum"); router.refresh(); }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setLoading(false); }
      else {
        setInfo("Account created! Check your email to confirm, then sign in.");
        setMode("login");
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1 text-center">மெய்பொருள்</h1>
        <p className="text-slate-400 text-center text-sm mb-8">Community platform</p>

        {/* Mode tabs */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 mb-4">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); setInfo(""); }}
              className={`flex-1 text-sm py-1.5 rounded-lg font-medium transition-colors ${
                mode === m ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          {info  && <p className="text-green-400 text-xs">{info}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-slate-900 font-medium py-2 rounded-lg text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
