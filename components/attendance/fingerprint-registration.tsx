"use client";

import { useState } from "react";
import { Fingerprint, Loader2, Check, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Status = "idle" | "registering" | "done" | "error";

/**
 * Lets the current employee register this device's fingerprint/Face ID
 * for clock-in. Requires HTTPS (or localhost) — browsers block WebAuthn
 * entirely on plain http:// LAN addresses.
 */
export function FingerprintRegistration({ alreadyRegistered }: { alreadyRegistered: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    setStatus("registering");
    setError(null);

    try {
      const optionsRes = await fetch("/api/webauthn/register-options", { method: "POST" });
      const options = await optionsRes.json();
      if (!optionsRes.ok) throw new Error(options.error ?? "Couldn't start registration.");

      const registrationResponse = await 'startRegistration(options)';

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

  if (alreadyRegistered || status === "done") {
    return (
      <Card className="p-5 flex items-center gap-3 max-w-xs">
        <div className="rounded-full bg-emerald-50 p-2">
          <Check size={16} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800">Fingerprint registered</p>
          <p className="text-xs text-slate-400">This device can now clock in with a fingerprint.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 max-w-xs">
      <div className="flex items-center gap-2 text-navy mb-2">
        <Fingerprint size={16} />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Fingerprint clock-in
        </span>
      </div>
      <p className="text-sm text-slate-600 mb-3">
        Register this device to clock in with your fingerprint or Face ID instead of GPS or QR.
      </p>
      <Button size="sm" className="w-full" onClick={handleRegister} disabled={status === "registering"}>
        {status === "registering" ? <Loader2 size={14} className="animate-spin" /> : <Fingerprint size={14} />}
        Register this device
      </Button>
      {error && (
        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
          <AlertTriangle size={12} /> {error}
        </p>
      )}
      <p className="text-xs text-slate-400 mt-2">
        Needs a device with a fingerprint sensor or Face ID, and a secure (https) connection.
      </p>
    </Card>
  );
}