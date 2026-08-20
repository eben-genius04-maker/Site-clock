import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Briefcase, Building2, Fingerprint } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrBadge } from "@/components/attendance/qr-badge";
import { EmployeeBiometricsDialog } from "@/components/employees/employee-biometrics-dialog";

const STATUS_TONE = { ACTIVE: "success", SUSPENDED: "warning", TERMINATED: "danger" } as const;

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const employee = await prisma.employee.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      department: true,
      attendances: { orderBy: { clockInAt: "desc" }, take: 10 },
      webauthnCredentials: { select: { id: true } },
    },
  });

  if (!employee) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/employees" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy mb-6">
        <ArrowLeft size={15} /> Back to employees
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-navy/10 text-navy flex items-center justify-center text-lg font-semibold shrink-0">
            {employee.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-navy">{employee.fullName}</h1>
            <p className="text-sm text-slate-500">{employee.position ?? "No position set"}</p>
          </div>
        </div>
        <Badge tone={STATUS_TONE[employee.status]}>{employee.status.toLowerCase()}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Employee details</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-slate-400 mb-1">Employee ID</dt>
                <dd className="font-mono text-slate-700">{employee.employeeCode}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Mail size={12} /> Email</dt>
                <dd className="text-slate-700">{employee.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Phone size={12} /> Phone</dt>
                <dd className="text-slate-700">{employee.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Building2 size={12} /> Department</dt>
                <dd className="text-slate-700">{employee.department?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Briefcase size={12} /> Position</dt>
                <dd className="text-slate-700">{employee.position ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Fingerprint size={12} /> Fingerprint</dt>
                <dd className="text-slate-700">
                  {employee.webauthnCredentials.length > 0 ? "Registered" : "Not registered"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
 <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">Recent attendance</h2>
            </div>
            {employee.attendances.length === 0 ? (
              <p className="text-sm text-slate-400">No clock-ins recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {employee.attendances.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0">
                    <span className="text-slate-600">
                      {a.clockInAt ? new Date(a.clockInAt).toLocaleString("en-GB") : "—"}
                    </span>
                    <span className="text-xs text-slate-400 uppercase">{a.method}</span>
                    <Badge tone={a.status === "LATE" ? "warning" : a.status === "FLAGGED" ? "danger" : "success"}>
                      {a.status.toLowerCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div>
            <EmployeeBiometricsDialog employeeId={employee.id} employeeName={employee.fullName} />
          </div>
        </div>

        <div>
          <QrBadge
            qrToken={employee.qrCodeToken}
            employeeName={employee.fullName}
            employeeCode={employee.employeeCode}
          />
        </div>
      </div>
    </div>
  );
}