import { Bell, Search } from "lucide-react";
import type { User } from "@prisma/client";

export function Topbar({ user }: { user: User & { company?: { name: string } | null } }) {
  const initials = user.email.slice(0, 2).toUpperCase();

  return (
    <header className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-slate-200 bg-white/70 backdrop-blur sticky top-0 z-10">
      <div>
        <h1 className="font-display text-xl font-semibold text-navy">
          {user.company?.name ?? "SiteClock"}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search employees..."
            className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white w-56 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          />
        </div>
        <button className="relative p-2 rounded-lg hover:bg-slate-100" aria-label="Notifications">
          <Bell size={18} className="text-slate-500" />
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-navy">
          {initials}
        </div>
      </div>
    </header>
  );
}
