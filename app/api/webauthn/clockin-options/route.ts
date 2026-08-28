import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { requireUser } from "@/lib/auth";
import { getRpID } from "@/lib/webauthn";

// Starts a fingerprint clock-in attempt. Usernameless / discoverable —
// no allowCredentials list, so any employee's registered device can
// respond. The device itself surfaces the right credential to the
// person via their OS's fingerprint/Face ID picker, and clockin-verify
// figures out who it belongs to from the credential ID returned.
//
// requireUser() here just confirms someone is logged into the kiosk/page
// this is running on (e.g. a supervisor's session on a shared attendance
// device) — it is NOT the identity being clocked in.
export async function POST() {
  await requireUser();

  const options = await generateAuthenticationOptions({
    rpID: getRpID(),
    userVerification: "required",
    // no allowCredentials — discoverable credentials only
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