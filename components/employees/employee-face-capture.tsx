"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Check, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmployeeFaceCapture({
  onCaptured,
  onSkip,
}: {
  onCaptured: (dataUrl: string) => void;
  onSkip: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Couldn't access the camera. Check permissions."));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleCapture() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setCaptured(canvas.toDataURL("image/jpeg", 0.85));
  }

  function handleRetake() {
    setCaptured(null);
  }

  function handleConfirm() {
    if (captured) onCaptured(captured);
  }

  return (
    <div>
      <p className="text-sm text-slate-600 mb-3">
        Take a reference photo — this is what future selfie clock-ins get compared against.
      </p>

      <div className="rounded-lg overflow-hidden bg-slate-900 aspect-square relative max-w-xs mx-auto">
        {!captured ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        ) : (
          <img src={captured} alt="Captured reference photo" className="w-full h-full object-cover" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {error && <p className="text-sm text-red-600 mt-3 text-center">{error}</p>}

      <div className="flex gap-3 mt-4 max-w-xs mx-auto">
        {!captured ? (
          <Button className="flex-1" onClick={handleCapture} disabled={!!error}>
            <Camera size={15} /> Capture
          </Button>
        ) : (
          <>
            <Button variant="outline" className="flex-1" onClick={handleRetake}>
              <RotateCcw size={15} /> Retake
            </Button>
            <Button className="flex-1" onClick={handleConfirm}>
              <Check size={15} /> Use this photo
            </Button>
          </>
        )}
      </div>

      <button onClick={onSkip} className="text-xs text-slate-400 hover:text-slate-600 mt-4 mx-auto flex items-center gap-1 justify-center w-full">
        <SkipForward size={12} /> Skip for now — add a photo later
      </button>
    </div>
  );
}