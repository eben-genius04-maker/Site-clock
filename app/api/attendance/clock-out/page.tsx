 import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, Clock, Palmtree, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const user = await requireUser();
  const companyId = user.companyId;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [totalEmployees, todaysAttendance, pendingLeave, recentAttendance] = await Promise.all([
    prisma.employee.count({ where: { companyId, status: "ACTIVE" } }),
    prisma.attendance.findMany({
      where: {
        employee: { companyId },
        clockInAt: { gte: startOfToday, lte: endOfToday },
      },
      include: { employee: { include: { department: true } } },
      orderBy: { clockInAt: "desc" },
    }),
    prisma.leaveRequest.count({ where: { companyId, status: "PENDING" } }),
    prisma.auditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const presentToday = todaysAttendance.filter((a) => a.status !== "ABSENT").length;
  const lateToday = todaysAttendance.filter((a) => a.status === "LATE").length;
  const onLeaveToday = await prisma.leaveRequest.count({
    where: {
      companyId,
      status: "APPROVED",
      startDate: { lte: endOfToday },
      endDate: { gte: startOfToday },
    },
  });
  const absentToday = Math.max(0, totalEmployees - presentToday - onLeaveToday);
  const attendanceRate = totalEmployees > 0 ? ((presentToday / totalEmployees) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Employees" value={totalEmployees} />
        <StatCard icon={UserCheck} label="Present Today" value={presentToday} tone="accent" />
        <StatCard icon={UserX} label="Absent" value={absentToday} tone="danger" />
        <StatCard icon={Clock} label="Late" value={lateToday} tone="gold" />
        <StatCard icon={Palmtree} label="On Leave" value={onLeaveToday} />
        <StatCard icon={TrendingUp} label="Attendance Rate" value={`
          ${attendanceRate}%`} tone="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Today&apos;s Check-ins</CardTitle>
            <span className="text-xs text-slate-400">{todaysAttendance.length} recorded</span>
          </CardHeader>
          <div className="divide-y divide-slate-50">
            {todaysAttendance.length === 0 && (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">
                No clock-ins yet today.
              </p>
            )}
            {todaysAttendance.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{a.employee.fullName}</p>
                  <p className="text-xs text-slate-400">{a.employee.department?.name ?? "—"}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-xs text-slate-500">
                    {a.clockInAt?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) ?? "—"}
                  </span>
                  <Badge tone={a.status === "LATE" ? "warning" : a.status === "ABSENT" ? "danger" : "success"}>
                    {a.status.replace("_", " ").toLowerCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentAttendance.length === 0 && (
              <p className="text-sm text-slate-400 py-4">No recent activity.</p>
            )}
            {recentAttendance.map((log) => (
              <div key={log.id} className="flex gap-3 py-3 border-b border-slate-50 last:border-0">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <div>
                  <p className="text-[13px] text-slate-700 leading-snug">{log.action.replace(/\./g, " · ")}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {log.createdAt.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {pendingLeave > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{pendingLeave}</span> leave request{pendingLeave === 1 ? "" : "s"} awaiting review.
            </p>
            <a href="/leave" className="text-sm font-medium text-amber-800 hover:underline">Review now →</a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}