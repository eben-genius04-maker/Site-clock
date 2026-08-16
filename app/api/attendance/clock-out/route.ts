import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { minutesBetween } from "@/lib/utils";

const clockOutSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const FALLBACK_WORKDAY_MINUTES = 8 * 60; // used only if the employee has no assigned shift

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user.employee) {
    return NextResponse.json({ error: "No employee profile linked to this account." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = clockOutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attendance = await prisma.attendance.findFirst({
    where: { employeeId: user.employee.id, clockInAt: { gte: startOfToday }, clockOutAt: null },
    orderBy: { clockInAt: "desc" },
  });

  if (!attendance || !attendance.clockInAt) {
    return NextResponse.json({ error: "No active clock-in found for today." }, { status: 404 });
  }

  const now = new Date();
  const workedMinutes = minutesBetween(attendance.clockInAt, now);

  // Overtime = time worked past the employee's actual scheduled shift end,
  // not a flat 8 hours — a 3pm shift worked until 5pm is 2 hours overtime,
  // regardless of what time they clocked in.
  const assignment = await prisma.employeeShift.findFirst({
    where: {
      employeeId: user.employee.id,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    include: { shift: true },
  });

  let overtimeMinutes = 0;

  if (assignment) {
    const [h, m] = assignment.shift.endTime.split(":").map(Number);
    const shiftEnd = new Date(attendance.clockInAt);
    shiftEnd.setHours(h, m, 0, 0);
    // handles overnight shifts (e.g. night shift ending after midnight)
    if (shiftEnd.getTime() < attendance.clockInAt.getTime()) {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }
    overtimeMinutes = Math.max(0, Math.round((now.getTime() - shiftEnd.getTime()) / 60000));
  } else {
    // no shift assigned — fall back to the flat 8-hour rule
    overtimeMinutes = Math.max(0, workedMinutes - FALLBACK_WORKDAY_MINUTES);
  }

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      clockOutAt: now,
      clockOutLat: parsed.data.latitude,
      clockOutLng: parsed.data.longitude,
      workedMinutes,
      overtimeMinutes,
    },
  });

  return NextResponse.json({ attendance: updated });
}