import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { minutesBetween } from "@/lib/utils";

const MANAGER_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER", "SUPERVISOR"];
const FALLBACK_WORKDAY_MINUTES = 8 * 60;

const schema = z.object({
  attendanceId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!MANAGER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const attendance = await prisma.attendance.findFirst({
    where: { id: parsed.data.attendanceId },
    include: { employee: true },
  });

  if (!attendance || attendance.employee.companyId !== user.companyId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!attendance.clockInAt) {
    return NextResponse.json({ error: "No clock-in recorded." }, { status: 400 });
  }
  if (attendance.clockOutAt) {
    return NextResponse.json({ error: "Already clocked out." }, { status: 409 });
  }

  const now = new Date();
  const workedMinutes = minutesBetween(attendance.clockInAt, now);

  const assignment = await prisma.employeeShift.findFirst({
    where: {
      employeeId: attendance.employeeId,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    include: { shift: true },
  });

  let overtimeMinutes = 0;

  if (assignment) {
    const parts = assignment.shift.endTime.split(":").map(Number);
    const h = parts[0];
    const m = parts[1];
    const shiftEnd = new Date(attendance.clockInAt);
    shiftEnd.setHours(h, m, 0, 0);
    if (shiftEnd.getTime() < attendance.clockInAt.getTime()) {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }
    overtimeMinutes = Math.max(0, Math.round((now.getTime() - shiftEnd.getTime()) / 60000));
  } else {
    overtimeMinutes = Math.max(0, workedMinutes - FALLBACK_WORKDAY_MINUTES);
  }

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: { clockOutAt: now, workedMinutes, overtimeMinutes },
  });

  return NextResponse.json({ attendance: updated, employeeName: attendance.employee.fullName });
}