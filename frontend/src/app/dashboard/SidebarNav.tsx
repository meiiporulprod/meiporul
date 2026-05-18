"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/articles", label: "Articles" },
  { href: "/dashboard/promises", label: "Promises" },
  { href: "/dashboard/drafts", label: "Drafts" },
];

export default function SidebarNav() {
  const pathname = usePathname();
  
  return (
    <nav className="p-2 md:p-4 flex flex-row md:flex-col gap-1 md:gap-2 flex-1 overflow-x-auto md:overflow-visible no-scrollbar">
      {navItems.map(({ href, label }) => {
        const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap text-xs md:text-sm px-4 py-2.5 rounded-xl font-bold tracking-widest uppercase transition-all duration-300 ${
              isActive 
                ? "bg-slate-800 border border-slate-700/50 text-white shadow-md" 
                : "text-slate-500 border border-transparent hover:text-slate-200 hover:bg-slate-800/40 hover:border-slate-700/30"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
