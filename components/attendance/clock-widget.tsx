"use client";

import { useState, useEffect } from "react";
import { MapPin, QrCode, Camera, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ClockState = "idle" | "locating" | "submitting" | "done" | "error";

export function ClockWidget() {
  const [state, setState] = useState<ClockState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
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
              ? `Clocked in — marked late (${data.attendance.lateMinutes} min).`
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

  return (
    <Card className="max-w-md">
      <CardContent className="text-center py-8">
        <p className="font-mono text-4xl font-semibold text-navy tabular-nums">
          {now.toLocaleTimeString("en-GB")}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>

        <div className="mt-8 flex flex-col gap-3">
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
          <Button size="lg" variant="outline" disabled>
            <QrCode size={16} /> Scan QR code
          </Button>
          <Button size="lg" variant="outline" disabled>
            <Camera size={16} /> Selfie verification
          </Button>
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
          QR and selfie clock-in need camera access — wire these up to a QR scanner
          library (e.g. html5-qrcode) and a face-match API before enabling in production.
        </p>
      </CardContent>
    </Card>
  );
}
