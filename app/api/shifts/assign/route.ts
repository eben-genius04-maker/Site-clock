import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const MANAGER_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER"];

const assignSchema = z.object({
  employeeId: z.string().uuid(),
  shiftId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!MANAGER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({
    where: { id: parsed.data.employeeId, companyId: user.companyId },
  });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  const shift = await prisma.shift.findFirst({
    where: { id: parsed.data.shiftId, companyId: user.companyId },
  });
  if (!shift) {
    return NextResponse.json({ error: "Shift not found." }, { status: 404 });
  }

  const now = new Date();

  const existing = await prisma.employeeShift.findFirst({
    where: {
      employeeId: parsed.data.employeeId,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
  });

  if (existing) {
    await prisma.employeeShift.update({
      where: { id: existing.id },
      data: { effectiveTo: now },
    });
  }

  const assignment = await prisma.employeeShift.create({
    data: {
      employeeId: parsed.data.employeeId,
      shiftId: parsed.data.shiftId,
      effectiveFrom: now,
    },
  });

  return NextResponse.json({ assignment: assignment }, { status: 201 });
}