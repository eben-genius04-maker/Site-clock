import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const createLeaveSchema = z.object({
  type: z.enum(["ANNUAL", "SICK", "CASUAL", "MATERNITY", "EMERGENCY"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const isManager = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER", "SUPERVISOR"].includes(user.role);

  const requests = await prisma.leaveRequest.findMany({
    where: {
      companyId: user.companyId,
      ...(status && { status: status as "PENDING" | "APPROVED" | "REJECTED" }),
      // Non-managers only ever see their own requests.
      ...(!isManager && user.employee ? { employeeId: user.employee.id } : {}),
    },
    include: { employee: { select: { fullName: true, department: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user.employee) {
    return NextResponse.json({ error: "No employee profile linked to this account." }, { status: 400 });
  }

  const body = await request.json();
  const parsed = createLeaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      employeeId: user.employee.id,
      companyId: user.companyId,
      type: parsed.data.type,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      reason: parsed.data.reason,
    },
  });

  return NextResponse.json({ leaveRequest }, { status: 201 });
}
