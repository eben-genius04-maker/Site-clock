import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const existing = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (existing) {
    return NextResponse.json({ success: true });
  }

  const body = await request.json();
  const companyName = body.companyName || "New Company";

  const company = await prisma.company.create({
    data: {
      name: companyName,
      settings: { create: {} },
    },
  });

  await prisma.user.create({
    data: {
      id: authUser.id,
      email: authUser.email || "",
      role: "COMPANY_ADMIN",
      companyId: company.id,
    },
  });

  return NextResponse.json({ success: true });
}