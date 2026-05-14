import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/articles", label: "Articles" },
  { href: "/dashboard/promises", label: "Promises" },
  { href: "/dashboard/drafts", label: "Drafts" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <Link href="/" className="text-sm font-bold">மெய்பொருள்</Link>
          <p className="text-xs text-slate-500 mt-0.5">Dashboard</p>
        </div>
        <nav className="p-3 flex flex-col gap-1 flex-1">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
        </div>
      </aside>
      {/* Content */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
