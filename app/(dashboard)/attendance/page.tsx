import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClockWidget } from "@/components/attendance/clock-widget";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AttendancePage() {
  const user = await requireUser();

  const history = user.employee
    ? await prisma.attendance.findMany({
        where: { employeeId: user.employee.id },
        orderBy: { clockInAt: "desc" },
        take: 14,
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-navy">Attendance</h2>
        <p className="text-sm text-slate-500 mt-1">Clock in, clock out, and review your history.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ClockWidget />

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent history</CardTitle>
          </CardHeader>
          <div className="divide-y divide-slate-50">
            {history.length === 0 && (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">No attendance records yet.</p>
            )}
            {history.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-slate-600">
                  {a.clockInAt?.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {a.clockInAt?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} –{" "}
                  {a.clockOutAt?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) ?? "—"}
                </span>
                <Badge tone={a.status === "LATE" ? "warning" : a.status === "FLAGGED" ? "danger" : "success"}>
                  {a.status.replace("_", " ").toLowerCase()}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
