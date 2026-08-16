import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  const departments = await prisma.department.findMany({
    where: { companyId: user.companyId },
    include: { _count: { select: { employees: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ departments });
}

const createSchema = z.object({ name: z.string().min(2) });

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.department.findFirst({
    where: { companyId: user.companyId, name: parsed.data.name },
  });
  if (existing) {
    return NextResponse.json({ error: "A department with that name already exists." }, { status: 409 });
  }

  const department = await prisma.department.create({
    data: { name: parsed.data.name, companyId: user.companyId },
  });
  return NextResponse.json({ department }, { status: 201 });
}