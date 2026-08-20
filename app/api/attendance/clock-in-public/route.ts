import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const publicClockInSchema = z.object({
  qrToken: z.string(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = publicClockInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { qrToken } = parsed.data;

  const employee = await prisma.employee.findFirst({
    where: { qrCodeToken: qrToken },
  });

  if (!employee) {
    return NextResponse.json({ error: "Badge not recognized." }, { status: 404 });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const existing = await prisma.attendance.findFirst({
    where: { employeeId: employee.id, clockInAt: { gte: startOfToday } },
  });
  if (existing) {
    return NextResponse.json({ error: employee.fullName + " already clocked in today." }, { status: 409 });
  }

  const now = new Date();
  const assignment = await prisma.employeeShift.findFirst({
    where: {
      employeeId: employee.id,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    include: { shift: true },
  });

  let status: "ON_TIME" | "LATE" = "ON_TIME";
  let lateMinutes = 0;

  if (assignment) {
    const parts = assignment.shift.startTime.split(":").map(Number);
    const h = parts[0];
    const m = parts[1];
    const shiftStart = new Date(now);
    shiftStart.setHours(h, m, 0, 0);
    const graceMs = assignment.shift.gracePeriodMinutes * 60000;
    if (now.getTime() > shiftStart.getTime() + graceMs) {
      status = "LATE";
      lateMinutes = Math.round((now.getTime() - shiftStart.getTime()) / 60000);
    }
  }

  const attendance = await prisma.attendance.create({
    data: {
      employeeId: employee.id,
      clockInAt: now,
      method: "QR_CODE",
      status,
      lateMinutes,
    },
  });

  return NextResponse.json({ attendance, employeeName: employee.fullName }, { status: 201 });
}