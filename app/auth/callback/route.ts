import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Handles the redirect after email confirmation / OAuth sign-in.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    const authUser = data?.user;

    if (authUser) {
      const existing = await prisma.user.findUnique({ where: { id: authUser.id } });

      if (!existing) {
        const companyName = (authUser.user_metadata?.company_name as string) || "New Company";
        const fullName = (authUser.user_metadata?.full_name as string) || "";

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
            fullName,
            role: "COMPANY_ADMIN",
            companyId: company.id,
          },
        });
      }
    }
  }

  return NextResponse.redirect(origin + redirectTo);
}