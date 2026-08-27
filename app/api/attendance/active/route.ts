import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const MANAGER_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER", "SUPERVISOR"];

export async function GET() {
  const user = await requireUser();
  if (!MANAGER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const shifts = await prisma.shift.findMany({
    where: { companyId: user.companyId },
    orderBy: { startTime: "asc" },
  });

  const activeAttendances = await prisma.attendance.findMany({
    where: {
      clockInAt: { gte: startOfToday },
      clockOutAt: null,
      employee: { companyId: user.companyId },
    },
    include: {
      employee: {
        select: { id: true, fullName: true, employeeCode: true },
      },
    },
    orderBy: { clockInAt: "asc" },
  });

  const now = new Date();
  const employeeIds = activeAttendances.map((a) => a.employeeId);

  const currentAssignments = await prisma.employeeShift.findMany({
    where: {
      employeeId: { in: employeeIds },
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
  });

  const shiftByEmployeeId = new Map(currentAssignments.map((a) => [a.employeeId, a.shiftId]));

  const grouped = shifts.map((shift) => ({
    shift,
    entries: activeAttendances
      .filter((a) => shiftByEmployeeId.get(a.employeeId) === shift.id)
      .map((a) => ({
        attendanceId: a.id,
        clockInAt: a.clockInAt,
        method: a.method,
        employee: a.employee,
      })),
  }));

  const noShift = activeAttendances
    .filter((a) => !shiftByEmployeeId.has(a.employeeId))
    .map((a) => ({
      attendanceId: a.id,
      clockInAt: a.clockInAt,
      method: a.method,
      employee: a.employee,
    }));

  return NextResponse.json({ grouped, noShift });
}