import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewerComment: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER", "SUPERVISOR"]);
  const { id } = await params;
  const body = await request.json();

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.leaveRequest.findFirst({ where: { id, companyId: user.companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: parsed.data.status,
      reviewerComment: parsed.data.reviewerComment,
      reviewedBy: user.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      actorId: user.id,
      action: `leave.${parsed.data.status.toLowerCase()}`,
      entity: "LeaveRequest",
      entityId: id,
    },
  });

  return NextResponse.json({ leaveRequest: updated });
}
