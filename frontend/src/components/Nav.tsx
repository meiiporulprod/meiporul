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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) =>
      setUser(s?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Close mobile menu automatically on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [path]);

  const navLinks = [
    { href: "/promises", label: "Promises" },
    { href: "/elections", label: "Elections" },
    { href: "/fact-checks", label: "Fact Checks" },
    { href: "/forum", label: "Forum" },
  ];

  return (
    <header className="sticky top-0 z-50">
      <nav className="border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl relative z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-baseline gap-2 group">
            <span className="font-bold text-xl tracking-tight text-white drop-shadow-md group-hover:text-slate-200 transition-colors">
              மெய்பொருள்
            </span>
            <span className="text-slate-400 font-medium text-sm hidden sm:inline-block">Meiporul</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(({ href, label }) => {
              const isActive = path.startsWith(href) && href !== "/";
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm font-medium transition-all duration-200 relative py-2 ${
                    isActive ? "text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-red-500 rounded-t-full shadow-[0_-2px_10px_rgba(239,68,68,0.5)]" />
                  )}
                </Link>
              );
            })}
            
            <div className="w-px h-4 bg-slate-800 mx-1"></div>

            {user ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm bg-white/10 hover:bg-white/20 text-white border border-white/5 px-4 py-1.5 rounded-full transition-all"
                >
                  Dashboard
                </Link>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/");
                    router.refresh();
                  }}
                  className="text-xs text-slate-400 hover:text-red-400 transition-colors font-medium tracking-wide uppercase"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm bg-red-600 hover:bg-red-500 text-white font-medium px-5 py-1.5 rounded-full transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_20px_rgba(220,38,38,0.5)]"
              >
                Sign in
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 -mr-2 text-slate-300 hover:text-white"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-[64px] bg-slate-950/95 backdrop-blur-xl z-40 md:hidden flex flex-col border-t border-slate-800">
          <div className="flex flex-col h-full overflow-y-auto px-6 py-8">
            <div className="flex flex-col gap-6">
              {navLinks.map(({ href, label }) => {
                const isActive = path.startsWith(href) && href !== "/";
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`text-lg font-medium transition-colors ${
                      isActive ? "text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
            
            <div className="h-px bg-slate-800 my-6 w-full shrink-0"></div>

            <div className="mt-auto pb-4 shrink-0">
              {user ? (
                <div className="flex flex-col gap-4">
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-center text-sm bg-white/10 hover:bg-white/20 text-white border border-white/5 px-4 py-3 rounded-xl transition-all"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      router.push("/");
                      router.refresh();
                    }}
                    className="flex items-center justify-center text-sm text-red-400 font-medium py-3 border border-red-500/20 rounded-xl bg-red-500/5"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center justify-center text-sm bg-red-600 hover:bg-red-500 text-white font-medium px-4 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
