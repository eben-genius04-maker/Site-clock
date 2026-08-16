"use client";

import { useState } from "react";
import { Fingerprint, Loader2, Check, AlertTriangle, SkipForward } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";

type Status = "idle" | "registering" | "done" | "error";

/**
 * Admin-assisted fingerprint registration during onboarding — HR hands
 * their device to the new employee, the employee scans their fingerprint
 * right there. Ties the credential to the specific employeeId, not to
 * whoever's logged into the admin account. Requires HTTPS or localhost.
 */
export function EmployeeFingerprintSetup({
  employeeId,
  employeeName,
  onDone,
}: {
  employeeId: string;
  employeeName: string;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    setStatus("registering");
    setError(null);

    try {
      const optionsRes = await fetch("/api/webauthn/register-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      const options = await optionsRes.json();
      if (!optionsRes.ok) throw new Error(options.error ?? "Couldn't start registration.");

      const registrationResponse = await startRegistration(options);

      const verifyRes = await fetch("/api/webauthn/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationResponse),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(data.error ?? "Verification failed.");

      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Registration was cancelled."
          : err instanceof Error
          ? err.message
          : "Couldn't register this device."
      );
    }
  }

  if (status === "done") {
    return (
      <div className="text-center py-4">
        <div className="rounded-full bg-emerald-50 p-3 w-fit mx-auto mb-3">
          <Check size={20} className="text-emerald-600" />
        </div>
        <p className="text-sm font-medium text-slate-800">Fingerprint registered</p>
        <p className="text-xs text-slate-400 mt-1">{employeeName} can now clock in with a fingerprint.</p>
        <Button className="mt-4 w-full max-w-xs" onClick={onDone}>Done</Button>
      </div>
    );
  }

  return (
    <div className="text-center max-w-xs mx-auto">
      <div className="rounded-full bg-navy/5 p-4 w-fit mx-auto mb-3">
        <Fingerprint size={24} className="text-navy" />
      </div>
      <p className="text-sm text-slate-600 mb-4">
        Hand the device to <span className="font-medium">{employeeName}</span> — they'll place their
        finger on the sensor (or use Face ID) to register.
      </p>
      <Button className="w-full" onClick={handleRegister} disabled={status === "registering"}>
        {status === "registering" ? <Loader2 size={15} className="animate-spin" /> : <Fingerprint size={15} />}
        Start fingerprint registration
      </Button>
      {error && (
        <p className="text-xs text-red-600 mt-2 flex items-center gap-1 justify-center">
          <AlertTriangle size={12} /> {error}
        </p>
      )}
      <button onClick={onDone} className="text-xs text-slate-400 hover:text-slate-600 mt-4 flex items-center gap-1 justify-center w-full">
        <SkipForward size={12} /> Skip for now — set up later
      </button>
    </div>
  );
}