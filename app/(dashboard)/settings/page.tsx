"use client";

import { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Settings = {
  workStartTime: string;
  workEndTime: string;
  attendanceRadiusM: number;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((res) => res.json()).then((data) => setSettings(data.settings));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-navy">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Working hours and attendance rules for your company.</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader><CardTitle>Attendance</CardTitle></CardHeader>
        <CardContent>
          {!settings ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Work start</label>
                  <Input
                    type="time"
                    value={settings.workStartTime}
                    onChange={(e) => setSettings({ ...settings, workStartTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Work end</label>
                  <Input
                    type="time"
                    value={settings.workEndTime}
                    onChange={(e) => setSettings({ ...settings, workEndTime: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Default GPS attendance radius (meters)
                </label>
                <Input
                  type="number"
                  min={10}
                  value={settings.attendanceRadiusM}
                  onChange={(e) => setSettings({ ...settings, attendanceRadiusM: Number(e.target.value) })}
                />
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : null}
                {saved ? "Saved" : "Save changes"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}