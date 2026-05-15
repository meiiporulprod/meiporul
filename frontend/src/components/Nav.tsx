"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) =>
      setUser(s?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        path.startsWith(href) && href !== "/" ? "text-white" : "text-slate-400 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          மெய்பொருள் <span className="text-slate-500 font-normal text-sm">Meiporul</span>
        </Link>
        <div className="flex items-center gap-5">
          {link("/promises", "Promises")}
          {link("/elections", "Elections")}
          {link("/fact-checks", "Fact Checks")}
          {link("/forum", "Forum")}
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push("/");
                  router.refresh();
                }}
                className="text-xs text-slate-500 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
