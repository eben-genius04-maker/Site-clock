"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Card } from "@/components/ui/card";
import { Download, IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Renders the current employee's personal QR badge. The QR encodes their
 * unique qrCodeToken (from the Employee table) — scanning it is what the
 * clock-in flow checks against on the server (see /api/attendance/clock-in).
 * Print this or keep it on a phone as a physical/digital ID badge.
 */
export function QrBadge({ qrToken, employeeName, employeeCode }: {
  qrToken: string;
  employeeName: string;
  employeeCode: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, qrToken, {
      width: 220,
      margin: 2,
      color: { dark: "#0B1E3D", light: "#FFFFFF" },
    }).then(() => setReady(true));
  }, [qrToken]);

  function handleDownload() {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `siteclock-badge-${employeeCode}.png`;
    a.click();
  }

  return (
    <Card className="p-6 flex flex-col items-center text-center max-w-xs">
      <div className="flex items-center gap-2 text-navy mb-3">
        <IdCard size={16} />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">My badge</span>
      </div>
      <canvas ref={canvasRef} className="rounded-lg border border-slate-100" />
      <p className="mt-3 text-sm font-medium text-slate-800">{employeeName}</p>
      <p className="font-mono text-xs text-slate-400">{employeeCode}</p>
      <Button variant="outline" size="sm" className="mt-4 w-full" onClick={handleDownload} disabled={!ready}>
        <Download size={14} /> Save badge image
      </Button>
      <p className="text-xs text-slate-400 mt-3">
        Show this to a scanner to clock in — keep it private, it works like a key.
      </p>
    </Card>
  );
}