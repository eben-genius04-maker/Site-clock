import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getRpID, getExpectedOrigin } from "@/lib/webauthn";

// Confirms the fingerprint/Face ID response matches the challenge from
// register-options, then saves the device's public key against whichever
// employee that challenge was issued for (self, or an employee an admin
// is onboarding).
export async function POST(request: NextRequest) {
  await requireUser(); // just confirms someone's authenticated to call this at all

  const cookieStore = await cookies();
  const raw = cookieStore.get("webauthn_reg_challenge")?.value;
  if (!raw) {
    return NextResponse.json({ error: "Registration session expired. Try again." }, { status: 400 });
  }

  const { challenge: expectedChallenge, employeeId } = JSON.parse(raw) as {
    challenge: string;
    employeeId: string;
  };

  const body = await request.json();

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: getExpectedOrigin(),
      expectedRPID: getRpID(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Couldn't verify this device." }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Device verification failed." }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;

  await prisma.webAuthnCredential.create({
    data: {
      employeeId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      deviceName: request.headers.get("user-agent")?.includes("Mobile") ? "Mobile device" : "Desktop device",
    },
  });

  cookieStore.delete("webauthn_reg_challenge");

  return NextResponse.json({ success: true });
}