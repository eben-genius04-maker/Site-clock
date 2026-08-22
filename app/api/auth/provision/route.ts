import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { companyName, accessToken } = body;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !authUser) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const existing = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (existing) {
    return NextResponse.json({ success: true });
  }

  const company = await prisma.company.create({
    data: {
      name: companyName || "New Company",
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