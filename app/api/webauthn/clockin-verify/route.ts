import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getRpID, getExpectedOrigin } from "@/lib/webauthn";

// Verifies the fingerprint response and identifies WHICH employee it
// belongs to from the credential ID itself (usernameless clock-in) —
// then creates the attendance record for that employee, not for
// whoever happens to be logged into the browser session.
export async function POST(request: NextRequest) {
  await requireUser(); // confirms the kiosk/page session itself is authenticated

  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get("webauthn_auth_challenge")?.value;
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Session expired. Try again." }, { status: 400 });
  }

  const body = await request.json();

  // credentialId is globally unique (schema @unique), so this alone tells
  // us which employee just used their fingerprint — no prior login needed.
  const credential = await prisma.webAuthnCredential.findUnique({
    where: { credentialId: body.id },
    include: { employee: true },
  });
  if (!credential) {
    return NextResponse.json({ error: "This device isn't registered to anyone." }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: getExpectedOrigin(),
      expectedRPID: getRpID(),
      credential: {
        id: credential.credentialId,
        publicKey: new Uint8Array(credential.publicKey),
        counter: Number(credential.counter),
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Fingerprint didn't match." }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Fingerprint didn't match." }, { status: 400 });
  }

  await prisma.webAuthnCredential.update({
    where: { id: credential.id },
    data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() },
  });
  cookieStore.delete("webauthn_auth_challenge");

  const employeeId = credential.employeeId;

  // Prevent double clock-in for the day.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const existing = await prisma.attendance.findFirst({
    where: { employeeId, clockInAt: { gte: startOfToday } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `${credential.employee.fullName} already clocked in today.` },
      { status: 409 }
    );
  }

  // Lateness, based on assigned shift.
  const now = new Date();
  const assignment = await prisma.employeeShift.findFirst({
    where: {
      employeeId,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    include: { shift: true },
  });

  let status: "ON_TIME" | "LATE" = "ON_TIME";
  let lateMinutes = 0;

  if (assignment) {
    const [h, m] = assignment.shift.startTime.split(":").map(Number);
    const shiftStart = new Date(now);
    shiftStart.setHours(h, m, 0, 0);
    const graceMs = assignment.shift.gracePeriodMinutes * 60000;
    if (now.getTime() > shiftStart.getTime() + graceMs) {
      status = "LATE";
      lateMinutes = Math.round((now.getTime() - shiftStart.getTime()) / 60000);
    }
  }

  const attendance = await prisma.attendance.create({
    data: { employeeId, clockInAt: now, method: "FINGERPRINT", status, lateMinutes },
  });

  return NextResponse.json({
    attendance,
    employeeName: credential.employee.fullName,
  });
}