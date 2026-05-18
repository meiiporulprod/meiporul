"use client";
import { usePathname } from "next/navigation";
import Nav from "./Nav";

export default function GlobalNavWrapper() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return null;
  return <Nav />;
}
