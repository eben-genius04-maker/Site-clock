import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getRpID } from "@/lib/webauthn";

// Starts a fingerprint clock-in attempt: returns a challenge scoped to this
// employee's already-registered devices only.
export async function POST() {
  const user = await requireUser();
  if (!user.employee) {
    return NextResponse.json({ error: "No employee profile linked to this account." }, { status: 400 });
  }

  const credentials = await prisma.webAuthnCredential.findMany({
    where: { employeeId: user.employee.id },
  });

  if (credentials.length === 0) {
    return NextResponse.json({ error: "No fingerprint registered on this account yet." }, { status: 400 });
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpID(),
    userVerification: "required",
    allowCredentials: credentials.map((c) => ({ id: c.credentialId })),
  });

  const cookieStore = await cookies();
  cookieStore.set("webauthn_auth_challenge", options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });

  return NextResponse.json(options);
}