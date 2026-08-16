import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const MANAGER_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER"];

export async function GET() {
  const user = await requireUser();
  const shifts = await prisma.shift.findMany({
    where: { companyId: user.companyId },
    include: { _count: { select: { assignments: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ shifts: shifts });
}

const createSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["MORNING", "AFTERNOON", "NIGHT", "FLEXIBLE"]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm format"),
  gracePeriodMinutes: z.number().int().min(0).max(120).default(10),
});

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!MANAGER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = Object.assign({}, parsed.data, { companyId: user.companyId });

  const shift = await prisma.shift.create({
    data: data,
  });

  return NextResponse.json({ shift: shift }, { status: 201 });
}