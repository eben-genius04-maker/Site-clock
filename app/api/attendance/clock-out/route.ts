import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { minutesBetween } from "@/lib/utils";

const clockOutSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const STANDARD_WORKDAY_MINUTES = 8 * 60;

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
  const overtimeMinutes = Math.max(0, workedMinutes - STANDARD_WORKDAY_MINUTES);

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
