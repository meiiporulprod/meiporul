"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const path = usePathname();
  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        path === href ? "text-white" : "text-slate-400 hover:text-white"
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
        <div className="flex items-center gap-6">
          {link("/promises", "Promises")}
          {link("/fact-checks", "Fact Checks")}
          <Link
            href="/dashboard"
            className="text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
}
