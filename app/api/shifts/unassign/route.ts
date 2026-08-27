import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const MANAGER_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER"];

const unassignSchema = z.object({
  employeeShiftId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!MANAGER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = unassignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const assignment = await prisma.employeeShift.findFirst({
    where: { id: parsed.data.employeeShiftId },
    include: { employee: true },
  });

  if (!assignment || assignment.employee.companyId !== user.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.employeeShift.update({
    where: { id: assignment.id },
    data: { effectiveTo: new Date() },
  });

  return NextResponse.json({ success: true });
}