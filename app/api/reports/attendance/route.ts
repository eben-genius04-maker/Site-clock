import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const MANAGER_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER", "SUPERVISOR"];

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!MANAGER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId") ?? undefined;
  const departmentId = searchParams.get("departmentId") ?? undefined;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const format = searchParams.get("format");

  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
  start.setHours(0, 0, 0, 0);
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  const records = await prisma.attendance.findMany({
    where: {
      clockInAt: { gte: start, lte: end },
      employee: {
        companyId: user.companyId,
        ...(employeeId && { id: employeeId }),
        ...(departmentId && { departmentId }),
      },
    },
    include: { employee: { select: { fullName: true, employeeCode: true, department: { select: { name: true } } } } },
    orderBy: { clockInAt: "desc" },
  });

  if (format === "csv") {
    const header = "Employee,Employee Code,Department,Date,Clock In,Clock Out,Method,Status,Worked (min),Late (min),Overtime (min)\n";
    const rows = records.map(function (a) {
      const cells = [
        a.employee.fullName,
        a.employee.employeeCode,
        a.employee.department ? a.employee.department.name : "",
        a.clockInAt ? a.clockInAt.toISOString().slice(0, 10) : "",
        a.clockInAt ? a.clockInAt.toISOString().slice(11, 16) : "",
        a.clockOutAt ? a.clockOutAt.toISOString().slice(11, 16) : "",
        a.method,
        a.status,
        a.workedMinutes === null ? "" : a.workedMinutes,
        a.lateMinutes,
        a.overtimeMinutes,
      ];
     return cells.map(function (c) { return '"' + String(c).split('"').join('""') + '"'; }).join(",");
    });
    const csv = header + rows.join("\n");

    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const filename = "attendance-report-" + startStr + "-to-" + endStr + ".csv";

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="' + filename + '"',
      },
    });
  }

  const dailyMap = new Map();
  for (const a of records) {
    if (!a.clockInAt) continue;
    const key = a.clockInAt.toISOString().slice(0, 10);
    const bucket = dailyMap.get(key) || { present: 0, late: 0 };
    bucket.present += 1;
    if (a.status === "LATE") bucket.late += 1;
    dailyMap.set(key, bucket);
  }
  const dailyTrend = Array.from(dailyMap.entries())
    .sort(function (a, b) { return a[0].localeCompare(b[0]); })
    .map(function (entry) {
      return { date: entry[0], present: entry[1].present, late: entry[1].late };
    });

  return NextResponse.json({ records, dailyTrend, total: records.length });
}