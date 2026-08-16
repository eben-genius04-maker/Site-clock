"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function QrScanner({ onScan }: { onScan: (token: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
  if (!open) return;
  let cancelled = false;
  let started = false;

  import("html5-qrcode").then(({ Html5Qrcode }) => {
    if (cancelled || !containerRef.current) return;

    const scanner = new Html5Qrcode("qr-scanner-region");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText: string) => {
          onScan(decodedText);
          if (started) scanner.stop().catch(() => {});
          setOpen(false);
        },
        () => {}
      )
      .then(() => {
        started = true;
      })
      .catch(() => setError("Couldn't access the camera. Check permissions and try again."));
  });

  return () => {
    cancelled = true;
    if (started) {
      scannerRef.current?.stop().catch(() => {});
    }
  };
}, [open, onScan]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline">
          <Camera size={16} /> Scan QR code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan badge</DialogTitle>
        </DialogHeader>
        <div id="qr-scanner-region" ref={containerRef} className="rounded-lg overflow-hidden bg-slate-100 aspect-square" />
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        {!error && (
          <p className="text-xs text-slate-400 mt-3 text-center">
            Point the camera at the employee's QR badge.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}