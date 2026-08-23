 "use client";

import { useState, useEffect, useCallback } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { MapPin, Fingerprint, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrScanner } from "@/components/attendance/qr-scanner";
import { SelfieCapture } from "@/components/attendance/selfie-capture";

type ClockState = "idle" | "locating" | "submitting" | "done" | "error";

export function ClockWidget({ profilePhotoUrl, fingerprintRegistered, hasActiveClockIn }: {
  profilePhotoUrl: string | null;
  fingerprintRegistered: boolean;
  hasActiveClockIn: boolean;
}) {
  const [state, setState] = useState<ClockState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [clockedIn, setClockedIn] = useState(hasActiveClockIn);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function handleGpsClockIn() {
    setState("locating");
    setMessage(null);

    if (!navigator.geolocation) {
      setState("error");
      setMessage("Geolocation isn't available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setState("submitting");
        try {
          const res = await fetch("/api/attendance/clock-in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              method: "GPS",
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Clock-in failed.");

          setState("done");
          setMessage(
            data.attendance.status === "FLAGGED"
              ? "Clocked in — flagged for review (outside office radius)."
              : data.attendance.status === "LATE"
              ? "Clocked in — marked late (" + data.attendance.lateMinutes + " min)."
              : "Clocked in on time."
          );
        } catch (err) {
          setState("error");
          setMessage(err instanceof Error ? err.message : "Something went wrong.");
        }
      },
      () => {
        setState("error");
        setMessage("Location permission was denied. Try QR or manual instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const handleQrScan = useCallback(async (qrToken: string) => {
    setState("submitting");
    setMessage(null);

    try {
      const res = await fetch("/api/attendance/clock-in-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Clock-in failed.");

      setState("done");
      setClockedIn(true);
      const name = data.employeeName ? data.employeeName + " — " : "";
      const isLate = data.attendance && data.attendance.status === "LATE";
      const lateMin = data.attendance ? data.attendance.lateMinutes : 0;
      setMessage(name + (isLate ? "clocked in, marked late (" + lateMin + " min)." : "clocked in on time."));
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Invalid or expired badge.");
    }
  }, []);

  const handleSelfieVerified = useCallback(async (confidence: number) => {
    try {
      const res = await fetch("/api/attendance/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "FACE", faceMatchConfidence: confidence }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Clock-in failed.");
      setState("done");
      setClockedIn(true);
      setMessage(
        data.attendance.status === "FLAGGED"
          ? "Clocked in — flagged for review (face match needs confirmation)."
          : data.attendance.status === "LATE"
          ? "Clocked in — marked late (" + data.attendance.lateMinutes + " min)."
          : "Clocked in on time."
      );
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }, []);

  async function handleFingerprintClockIn() {
    try {
      const optionsRes = await fetch("/api/webauthn/clockin-options", { method: "POST" });
      const options = await optionsRes.json();
      if (!optionsRes.ok) throw new Error(options.error ?? "Couldn't start fingerprint clock-in.");

      const authResponse = await startAuthentication(options);

      const res = await fetch("/api/webauthn/clockin-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authResponse),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fingerprint didn't match.");

      setState("done");
      setClockedIn(true);
      setMessage(
        data.attendance.status === "LATE"
          ? data.employeeName + " clocked in — marked late (" + data.attendance.lateMinutes + " min)."
          : data.employeeName + " clocked in on time."
      );
    } catch (err) {
      setState("error");
      setMessage(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Fingerprint check was cancelled."
          : err instanceof Error
          ? err.message
          : "Fingerprint clock-in failed."
      );
    }
  }

  function handleClockOut() {
    setState("locating");
    setMessage(null);

    if (!navigator.geolocation) {
      submitClockOut(undefined, undefined);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        submitClockOut(position.coords.latitude, position.coords.longitude);
      },
      () => {
        submitClockOut(undefined, undefined);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submitClockOut(latitude: number | undefined, longitude: number | undefined) {
    setState("submitting");
    try {
      const res = await fetch("/api/attendance/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Clock-out failed.");

      setState("done");
      setClockedIn(false);
      const hours = Math.floor(data.attendance.workedMinutes / 60);
      const mins = data.attendance.workedMinutes % 60;
      setMessage(
        "Clocked out — worked " + hours + "h " + mins + "m" +
        (data.attendance.overtimeMinutes > 0 ? " (" + data.attendance.overtimeMinutes + " min overtime)." : ".")
      );
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }
  return (
    <Card className="max-w-md">
      <CardContent className="text-center py-8">
        <p className="font-mono text-4xl font-semibold text-navy tabular-nums">
          {now ? now.toLocaleTimeString("en-GB") : "--:--:--"}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {now ? now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : ""}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {clockedIn ? (
            <Button
              size="lg"
              onClick={handleClockOut}
              disabled={state === "locating" || state === "submitting"}
            >
              {state === "locating" || state === "submitting" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <MapPin size={16} />
              )}
              Clock out
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                onClick={handleGpsClockIn}
                disabled={state === "locating" || state === "submitting"}
              >
                {state === "locating" || state === "submitting" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <MapPin size={16} />
                )}
                Clock in with GPS
              </Button>
              <QrScanner onScan={handleQrScan} />
              <SelfieCapture profilePhotoUrl={profilePhotoUrl} onVerified={handleSelfieVerified} />
              <Button
                size="lg"
                variant="outline"
                onClick={handleFingerprintClockIn}
                disabled={state === "submitting"}
              >
                <Fingerprint size={16} /> Clock in with fingerprint
              </Button>
            </>
          )}
        </div>

        {message && (
          <div
            className="mt-5 flex items-center gap-2 justify-center text-sm rounded-lg px-3 py-2"
            style={{
              backgroundColor: state === "error" ? "#FEF2F2" : "#ECFDF5",
              color: state === "error" ? "#DC2626" : "#059669",
            }}
          >
            {state === "error" ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            {message}
          </div>
        )}

        <p className="text-xs text-slate-400 mt-6">
          Choose whichever method fits — GPS checks your location, QR checks your badge, selfie checks your face, fingerprint checks your registered device.
        </p>
      </CardContent>
    </Card>
  );
}