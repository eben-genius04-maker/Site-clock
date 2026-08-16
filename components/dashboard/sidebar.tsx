"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Clock, CalendarDays, Building2,
  FileBarChart, Settings, LogOut, CalendarClock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
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

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const items = NAV.filter((item) => !item.roles || (item.roles as readonly string[]).includes(role));

  return (
    <aside className="w-60 shrink-0 hidden md:flex flex-col py-6 px-4 bg-navy">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gold">
          <Clock size={16} className="text-navy" strokeWidth={2.5} />
        </div>
        <span className="font-display font-semibold text-white text-[17px] tracking-tight">SiteClock</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
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
  );
}
