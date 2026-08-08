import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth";

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]).optional(),
  salary: z.number().positive().optional(),
  emergencyContact: z.string().optional(),
  address: z.string().optional(),
  photoUrl: z.string().url().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const employee = await prisma.employee.findFirst({
    where: { id, companyId: user.companyId },
    include: { department: true, attendances: { orderBy: { clockInAt: "desc" }, take: 10 } },
  });

  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ employee });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER"]);
  const { id } = await params;
  const body = await request.json();

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.employee.findFirst({ where: { id, companyId: user.companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const employee = await prisma.employee.update({ where: { id }, data: parsed.data });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      actorId: user.id,
      action: "employee.updated",
      entity: "Employee",
      entityId: id,
      metadata: parsed.data,
    },
  });

  return NextResponse.json({ employee });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);
  const { id } = await params;

  const existing = await prisma.employee.findFirst({ where: { id, companyId: user.companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft delete — keeps attendance/payroll history intact.
  await prisma.employee.update({ where: { id }, data: { status: "TERMINATED" } });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      actorId: user.id,
      action: "employee.terminated",
      entity: "Employee",
      entityId: id,
    },
  });

  return NextResponse.json({ success: true });
}
