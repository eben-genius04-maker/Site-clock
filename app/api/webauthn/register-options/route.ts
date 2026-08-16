import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { getRpID, RP_NAME } from "@/lib/webauthn";

// Starts device registration. Two modes:
// - Self-service: employee registers their own device (no body needed).
// - Admin-assisted onboarding: HR/Admin registers on behalf of a specific
//   new employee, sitting together during onboarding (body: { employeeId }).
//   residentKey "required" makes this a discoverable credential, so later
//   clock-in doesn't need the employee to already be logged in — the
//   fingerprint itself identifies them.
export async function POST(request: NextRequest) {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const targetEmployeeId: string | undefined = body.employeeId;

  let employee;
  if (targetEmployeeId) {
    await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "HR_MANAGER"]);
    employee = await prisma.employee.findFirst({
      where: { id: targetEmployeeId, companyId: user.companyId },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }
  } else {
    if (!user.employee) {
      return NextResponse.json({ error: "No employee profile linked to this account." }, { status: 400 });
    }
    employee = user.employee;
  }

  const existingCredentials = await prisma.webAuthnCredential.findMany({
    where: { employeeId: employee.id },
  });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpID(),
    userID: new TextEncoder().encode(employee.id),
    userName: employee.email,
    userDisplayName: employee.fullName,
    attestationType: "none",
    excludeCredentials: existingCredentials.map((c) => ({ id: c.credentialId })),
    authenticatorSelection: {
      residentKey: "required", // discoverable — needed for usernameless clock-in later
      userVerification: "required",
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(
    "webauthn_reg_challenge",
    JSON.stringify({ challenge: options.challenge, employeeId: employee.id }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300,
      path: "/",
    }
  );

  return NextResponse.json(options);
}