import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { generateEmployeeCode } from "@/lib/utils";

const createEmployeeSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  position: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  dateEmployed: z.string().datetime().optional(),
  salary: z.number().positive().optional(),
  emergencyContact: z.string().optional(),
  address: z.string().optional(),
});

// GET /api/employees?search=&departmentId=&status=&page=&pageSize=
export async function GET(request: NextRequest) {
  const user = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER", "SUPERVISOR"]);
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search") ?? undefined;
  const departmentId = searchParams.get("departmentId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Math.min(Number(searchParams.get("pageSize") ?? "20"), 100);

  const where = {
    companyId: user.companyId,
    ...(departmentId && { departmentId }),
    ...(status && { status: status as "ACTIVE" | "SUSPENDED" | "TERMINATED" }),
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { employeeCode: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: { department: true },
      orderBy: { fullName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  return NextResponse.json({ employees, total, page, pageSize });
}

// POST /api/employees
export async function POST(request: NextRequest) {
  const user = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER"]);
  const body = await request.json();

  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const count = await prisma.employee.count({ where: { companyId: user.companyId } });
  const employeeCode = generateEmployeeCode("SC", count + 1);

  const employee = await prisma.employee.create({
    data: {
      ...parsed.data,
      dateEmployed: parsed.data.dateEmployed ? new Date(parsed.data.dateEmployed) : undefined,
      companyId: user.companyId,
      employeeCode,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      actorId: user.id,
      action: "employee.created",
      entity: "Employee",
      entityId: employee.id,
    },
  });

  return NextResponse.json({ employee }, { status: 201 });
}
