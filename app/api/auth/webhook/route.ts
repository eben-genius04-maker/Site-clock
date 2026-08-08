import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Configure this URL as a Supabase Auth Hook ("User created") in your
// Supabase project settings, or call it manually after signUp() in
// register/page.tsx if you're not using DB webhooks. It provisions the
// Company + User rows for a brand-new sign-up so the app has somewhere
// for the first COMPANY_ADMIN to land.
//
// Secure this in production: verify the request against Supabase's
// webhook signing secret before trusting the payload.
export async function POST(request: NextRequest) {
  const payload = await request.json();
  const record = payload.record;

  if (!record?.id || !record?.email) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const companyName = record.raw_user_meta_data?.company_name ?? "New Company";

  const company = await prisma.company.create({
    data: {
      name: companyName,
      settings: { create: {} },
    },
  });

  await prisma.user.create({
    data: {
      id: record.id,
      email: record.email,
      role: "COMPANY_ADMIN",
      companyId: company.id,
    },
  });

  return NextResponse.json({ success: true });
}
