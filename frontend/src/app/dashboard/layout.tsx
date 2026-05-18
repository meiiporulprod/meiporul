import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SidebarNav from "./SidebarNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row max-w-7xl mx-auto pt-0 md:pt-8 md:px-4 lg:px-8">
      {/* Background Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[600px] bg-red-900/10 blur-[130px] rounded-[100%] pointer-events-none -z-10" />

      {/* Sidebar / Top Nav */}
      <aside className="w-full md:w-64 shrink-0 bg-slate-900/40 backdrop-blur-xl border-b md:border-b-0 md:border-r border-slate-800/80 md:rounded-l-2xl flex flex-col z-20">
        <div className="p-4 md:p-6 border-b border-slate-800/60 flex items-center justify-between md:flex-col md:items-start md:gap-1">
          <Link href="/" className="font-['Bebas_Neue'] tracking-wider text-2xl md:text-3xl text-slate-100 hover:text-white drop-shadow-sm">மெய்பொருள்</Link>
          <p className="text-[10px] text-red-400 font-mono uppercase tracking-widest font-bold">Admin Portal</p>
        </div>
        <SidebarNav />
        <div className="p-4 md:p-6 border-t border-slate-800/60 hidden md:block">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Logged In</p>
          <p className="text-xs text-slate-300 truncate font-semibold">{user.email}</p>
        </div>
      </aside>
      
      {/* Content */}
      <main className="flex-1 bg-slate-950/20 md:bg-slate-900/20 backdrop-blur-md md:border border-slate-800/50 md:rounded-r-2xl overflow-auto p-4 sm:p-6 md:p-8 relative z-10 min-h-[80vh]">
        {children}
      </main>
    </div>
  );
}
