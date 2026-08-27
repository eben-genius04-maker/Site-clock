import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const shift = await prisma.shift.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!shift) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const assignments = await prisma.employeeShift.findMany({
    where: {
      shiftId: id,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    include: { employee: { select: { id: true, fullName: true, employeeCode: true, position: true } } },
  });

  return NextResponse.json({ shift, assignments });
}