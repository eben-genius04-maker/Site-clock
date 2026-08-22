 import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const EDITOR_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER"];
const MONTHLY_HOURS = 173.33;
const OVERTIME_MULTIPLIER = 1.5;

const generateSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
});

function countWorkingDays(start: Date, end: Date, weekendDays: number[]) {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const dow = d.getDay() + 1; // JS getDay is 0=Sunday, our convention is 1=Sunday
    if (!weekendDays.includes(dow)) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const periodStart = searchParams.get("periodStart");
  const periodEnd = searchParams.get("periodEnd");

  if (!periodStart || !periodEnd) {
    return NextResponse.json({ error: "periodStart and periodEnd are required." }, { status: 400 });
  }

  const entries = await prisma.payrollEntry.findMany({
    where: {
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      employee: { companyId: user.companyId },
    },
    include: { employee: { select: { fullName: true, employeeCode: true } } },
    orderBy: { employee: { fullName: "asc" } },
  });

  return NextResponse.json({ entries });
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!EDITOR_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const periodStart = new Date(parsed.data.periodStart);
  const periodEnd = new Date(parsed.data.periodEnd);
  periodStart.setHours(0, 0, 0, 0);
  periodEnd.setHours(23, 59, 59, 999);

  const settings = await prisma.companySettings.findUnique({ where: { companyId: user.companyId } });
  const weekendDays = settings?.weekendDays ?? [1, 7];

  const now = new Date();
  const effectiveEnd = periodEnd < now ? periodEnd : now;

  const employees = await prisma.employee.findMany({
    where: { companyId: user.companyId, status: "ACTIVE", salary: { not: null } },
  });

  // Clear any existing entries for this exact period so regenerating doesn't duplicate.
  await prisma.payrollEntry.deleteMany({
    where: {
      periodStart,
      periodEnd,
      employee: { companyId: user.companyId },
    },
  });

  const results = [];

  for (const employee of employees) {
    const salary = Number(employee.salary);
    const hourlyRate = salary / MONTHLY_HOURS;

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        clockInAt: { gte: periodStart, lte: periodEnd },
      },
    });

    let totalWorkedMinutes = 0;
    let totalOvertimeMinutes = 0;
    let totalLateMinutes = 0;

    for (const a of attendances) {
      totalWorkedMinutes += a.workedMinutes ?? 0;
      totalOvertimeMinutes += a.overtimeMinutes;
      totalLateMinutes += a.lateMinutes;
    }

    const regularMinutes = Math.max(0, totalWorkedMinutes - totalOvertimeMinutes);
    const overtimePay = (totalOvertimeMinutes / 60) * hourlyRate * OVERTIME_MULTIPLIER;
    const lateDeduction = (totalLateMinutes / 60) * hourlyRate;

    const expectedWorkingDays = countWorkingDays(periodStart, effectiveEnd, weekendDays);
    const daysPresent = new Set(
      attendances.map((a) => a.clockInAt?.toDateString())
    ).size;
    const absentDays = Math.max(0, expectedWorkingDays - daysPresent);
    const absenceDeduction = expectedWorkingDays > 0
      ? (salary / expectedWorkingDays) * absentDays
      : 0;

    const grossPay = salary + overtimePay - lateDeduction - absenceDeduction;
    const netPay = Math.max(0, grossPay);
 const entry = await prisma.payrollEntry.create({
      data: {
        employeeId: employee.id,
        periodStart,
        periodEnd,
        regularMinutes,
        overtimeMinutes: totalOvertimeMinutes,
        lateDeduction,
        absenceDeduction,
        grossPay,
        netPay,
      },
    });

    results.push(entry);
  }

  return NextResponse.json({ generated: results.length });
}