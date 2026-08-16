 "use client";

import { useState, useEffect } from "react";
import { Fingerprint, Camera, Check, Loader2 } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmployeeFaceCapture } from "@/components/employees/employee-face-capture";
import { EmployeeFingerprintSetup } from "@/components/employees/employee-fingerprint-setup";

type Mode = "menu" | "face" | "fingerprint";

export function EmployeeBiometricsDialog({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const [loading, setLoading] = useState(true);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasFingerprint, setHasFingerprint] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode("menu");
    setLoading(true);
    fetch(`/api/employees/${employeeId}`)
      .then((res) => res.json())
      .then((data) => {
        setHasPhoto(!!data.employee?.photoUrl);
        setHasFingerprint((data.employee?.webauthnCredentials?.length ?? 0) > 0);
      })
      .finally(() => setLoading(false));
  }, [open, employeeId]);

  async function handleFaceCaptured(dataUrl: string) {
    await fetch(`/api/employees/${employeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: dataUrl }),
    });
    setHasPhoto(true);
    setMode("menu");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs text-accent hover:underline whitespace-nowrap">
          Register biometrics
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{employeeName} — biometrics</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-8 flex justify-center">
            <Loader2 size={20} className="animate-spin text-slate-400" />
          </div>
        )}

        {!loading && mode === "menu" && (
          <div className="space-y-3">
            <button
              onClick={() => setMode("face")}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-navy/30 hover:bg-slate-50 text-left"
            >
              <div className="flex items-center gap-3">
                <Camera size={18} className="text-navy" />
                <span className="text-sm font-medium text-slate-800">Face photo</span>
              </div>
              {hasPhoto ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600"><Check size={13} /> Set</span>
              ) : (
                <span className="text-xs text-slate-400">Not set</span>
              )}
            </button>

            <button
              onClick={() => setMode("fingerprint")}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-navy/30 hover:bg-slate-50 text-left"
            >
              <div className="flex items-center gap-3">
                <Fingerprint size={18} className="text-navy" />
                <span className="text-sm font-medium text-slate-800">Fingerprint</span>
              </div>
              {hasFingerprint ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600"><Check size={13} /> Registered</span>
              ) : (
                <span className="text-xs text-slate-400">Not registered</span>
              )}
            </button>

            <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>Close</Button>
          </div>
        )}

        {mode === "face" && (
          <EmployeeFaceCapture onCaptured={handleFaceCaptured} onSkip={() => setMode("menu")} />
        )}
        
         {mode === "fingerprint" && (
          <EmployeeFingerprintSetup
            employeeId={employeeId}
            employeeName={employeeName}
            onDone={() => { setHasFingerprint(true); setMode("menu"); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}