import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

/** Gets the current app User (Supabase auth + Prisma profile joined), or null. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { employee: true, company: true },
  });

  return user;
}

/** Server Component / Route Handler guard — redirects to /login if unauthenticated. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Guard for role-gated pages/routes. Throws a 403-style redirect if not permitted. */
export async function requireRole(allowed: Role[]) {
  const user = await requireUser();
  if (!allowed.includes(user.role)) {
    redirect("/dashboard?error=forbidden");
  }
  return user;
}
