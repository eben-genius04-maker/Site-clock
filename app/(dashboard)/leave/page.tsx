import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_TONE = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" } as const;

export default async function LeavePage() {
  const user = await requireUser();
  const isManager = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER", "SUPERVISOR"].includes(user.role);

  const requests = await prisma.leaveRequest.findMany({
    where: {
      companyId: user.companyId,
      ...(!isManager && user.employee ? { employeeId: user.employee.id } : {}),
    },
    include: { employee: { select: { fullName: true, department: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-navy">Leave</h2>
        <p className="text-sm text-slate-500 mt-1">
          {isManager ? "Review and approve leave requests." : "Your leave requests and their status."}
        </p>
      </div>

      <Card>
        <div className="divide-y divide-slate-50">
          {requests.length === 0 && (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">No leave requests yet.</p>
          )}
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {isManager ? r.employee.fullName : r.type.charAt(0) + r.type.slice(1).toLowerCase()}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {r.startDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} –{" "}
                  {r.endDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  {isManager && ` · ${r.employee.department?.name ?? "—"}`}
                </p>
              </div>
              <Badge tone={STATUS_TONE[r.status]}>{r.status.toLowerCase()}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
