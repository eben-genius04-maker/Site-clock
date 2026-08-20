 "use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Clock, CalendarDays, Building2,
  FileBarChart, Settings, LogOut, CalendarClock, Menu, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@prisma/client";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: null },
  { href: "/employees", icon: Users, label: "Employees", roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER", "SUPERVISOR"] },
  { href: "/attendance", icon: Clock, label: "Attendance", roles: null },
  { href: "/leave", icon: CalendarDays, label: "Leave", roles: null },
  { href: "/departments", icon: Building2, label: "Departments", roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER"] },
  { href: "/shifts", icon: CalendarClock, label: "Shifts", roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER"] },
  { href: "/reports", icon: FileBarChart, label: "Reports", roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER"] },
  { href: "/settings", icon: Settings, label: "Settings", roles: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
] as const;

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const items = NAV.filter((item) => {
    if (!item.roles) return true;
    return (item.roles as readonly string[]).includes(role);
  });

  function NavLinks() {
    return (
      <nav className="flex flex-col gap-1">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: active ? "rgba(212,175,55,0.12)" : "transparent",
                color: active ? "#D4AF37" : "#B8C4D9",
              }}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-navy sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gold">
            <Clock size={16} className="text-navy" strokeWidth={2.5} />
          </div>
          <span className="font-display font-semibold text-white text-[17px] tracking-tight">SiteClock</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="text-white p-2"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile drawer + backdrop */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="relative w-64 shrink-0 flex flex-col py-6 px-4 bg-navy">
            <div className="flex items-center justify-between mb-8">
              <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 px-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gold">
 <Clock size={16} className="text-navy" strokeWidth={2.5} />
                </div>
                <span className="font-display font-semibold text-white text-[17px] tracking-tight">SiteClock</span>
              </Link>
              <button onClick={() => setOpen(false)} className="text-white p-1" aria-label="Close menu">
                <X size={22} />
              </button>
            </div>

            <NavLinks />

            <div className="mt-auto pt-6 border-t border-white/10">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#B8C4D9] w-full hover:text-white"
              >
                <LogOut size={17} strokeWidth={2} />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar (unchanged) */}
      <aside className="w-60 shrink-0 hidden md:flex flex-col py-6 px-4 bg-navy">
        <Link href="/dashboard" className="flex items-center gap-2 px-2 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gold">
            <Clock size={16} className="text-navy" strokeWidth={2.5} />
          </div>
          <span className="font-display font-semibold text-white text-[17px] tracking-tight">SiteClock</span>
        </Link>

        <NavLinks />

        <div className="mt-auto pt-6 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#B8C4D9] w-full hover:text-white"
          >
            <LogOut size={17} strokeWidth={2} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}