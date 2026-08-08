import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { distanceMeters } from "@/lib/utils";

const clockInSchema = z.object({
  method: z.enum(["GPS", "QR_CODE", "FACE", "MANUAL"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  qrToken: z.string().optional(),
  faceMatchConfidence: z.number().min(0).max(1).optional(),
});

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user.employee) {
    return NextResponse.json({ error: "No employee profile linked to this account." }, { status: 400 });
  }

  const body = await request.json();
  const parsed = clockInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { method, latitude, longitude, address, qrToken, faceMatchConfidence } = parsed.data;

  // Prevent double clock-in for the day.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const existing = await prisma.attendance.findFirst({
    where: { employeeId: user.employee.id, clockInAt: { gte: startOfToday } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already clocked in today." }, { status: 409 });
  }

  if (method === "QR_CODE" && qrToken !== user.employee.qrCodeToken) {
    return NextResponse.json({ error: "Invalid QR code." }, { status: 400 });
  }

  let distanceFromOfficeM: number | null = null;
  let needsReview = false;

  if (method === "GPS") {
    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "Location is required for GPS clock-in." }, { status: 400 });
    }
    const offices = await prisma.officeLocation.findMany({ where: { companyId: user.companyId } });
    if (offices.length > 0) {
      const distances = offices.map((o) => distanceMeters(latitude, longitude, o.latitude, o.longitude));
      const nearest = Math.min(...distances);
      const nearestOffice = offices[distances.indexOf(nearest)];
      distanceFromOfficeM = nearest;
      if (nearest > nearestOffice.radiusMeters) {
        needsReview = true; // flagged instead of hard-rejected, so a real check-in isn't silently lost
      }
    }
  }

  if (method === "FACE") {
    if (faceMatchConfidence === undefined) {
      return NextResponse.json({ error: "Face match confidence is required." }, { status: 400 });
    }
    // Threshold: below 0.85 confidence gets flagged for manual review rather than rejected outright.
    needsReview = faceMatchConfidence < 0.85;
  }

  // Determine lateness from the employee's active shift, if any.
  const now = new Date();
  const assignment = await prisma.employeeShift.findFirst({
    where: { employeeId: user.employee.id, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
    include: { shift: true },
  });

  let status: "ON_TIME" | "LATE" | "FLAGGED" = "ON_TIME";
  let lateMinutes = 0;

  if (assignment) {
    const [h, m] = assignment.shift.startTime.split(":").map(Number);
    const shiftStart = new Date(now);
    shiftStart.setHours(h, m, 0, 0);
    const graceMs = assignment.shift.gracePeriodMinutes * 60000;
    if (now.getTime() > shiftStart.getTime() + graceMs) {
      status = "LATE";
      lateMinutes = Math.round((now.getTime() - shiftStart.getTime()) / 60000);
    }
  }
  if (needsReview) status = "FLAGGED";

  const attendance = await prisma.attendance.create({
    data: {
      employeeId: user.employee.id,
      clockInAt: now,
      method,
      status,
      lateMinutes,
      clockInLat: latitude,
      clockInLng: longitude,
      clockInAddress: address,
      distanceFromOfficeM,
      faceMatchConfidence,
      needsReview,
    },
  });

  if (needsReview) {
    await prisma.notification.create({
      data: {
        companyId: user.companyId,
        userId: user.id, // in production, fan this out to HR/admin users instead
        title: "Attendance flagged for review",
        body: `${user.employee.fullName}'s clock-in via ${method} needs manual review.`,
      },
    });
  }

  return NextResponse.json({ attendance }, { status: 201 });
}
