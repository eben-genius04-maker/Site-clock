import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  let settings = await prisma.companySettings.findUnique({ where: { companyId: user.companyId } });
  if (!settings) {
    settings = await prisma.companySettings.create({ data: { companyId: user.companyId } });
  }
  const company = await prisma.company.findUnique({ where: { id: user.companyId } });
  return NextResponse.json({ settings, company });
}

const updateSchema = z.object({
  workStartTime: z.string().optional(),
  workEndTime: z.string().optional(),
  attendanceRadiusM: z.number().int().positive().optional(),
  logoUrl: z.string().url().optional(),
});

export async function PATCH(request: NextRequest) {
  const user = await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { logoUrl, ...settingsData } = parsed.data;

  const settings = await prisma.companySettings.upsert({
    where: { companyId: user.companyId },
    update: settingsData,
    create: { companyId: user.companyId, ...settingsData },
  });

  if (logoUrl) {
    await prisma.company.update({
      where: { id: user.companyId },
      data: { logoUrl },
    });
  }

  return NextResponse.json({ settings });
}