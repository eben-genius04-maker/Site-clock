 "use client";

import { useState, useEffect, useCallback } from "react";
import { LogOut, Loader2, Clock, User } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Entry = {
  attendanceId: string;
  clockInAt: string;
  method: string;
  employee: { id: string; fullName: string; employeeCode: string };
};

type Group = {
  shift: { id: string; name: string; startTime: string; endTime: string };
  entries: Entry[];
};

export default function ManagerClockOutPage() {
  const [grouped, setGrouped] = useState<Group[]>([]);
  const [noShift, setNoShift] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockingOutId, setClockingOutId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(function () {
    setLoading(true);
    fetch("/api/attendance/active")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        setGrouped(data.grouped ?? []);
        setNoShift(data.noShift ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(function () { load(); }, [load]);

  async function handleClockOut(attendanceId: string, employeeName: string) {
    setClockingOutId(attendanceId);
    setError("");
    setMessage("");

    const res = await fetch("/api/attendance/clock-out-manager", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendanceId: attendanceId }),
    });

    setClockingOutId(null);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to clock out.");
      return;
    }

    setMessage(employeeName + " clocked out.");
    load();
  }

  function EntryRow({ entry }: { entry: Entry }) {
    return (
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-navy/10 text-navy w-8 h-8 flex items-center justify-center text-xs font-semibold">
            {entry.employee.fullName.split(" ").map(function (n) { return n[0]; }).slice(0, 2).join("")}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{entry.employee.fullName}</p>
            <p className="text-xs text-slate-400 font-mono">
              {entry.employee.employeeCode} · in at {new Date(entry.clockInAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={function () { handleClockOut(entry.attendanceId, entry.employee.fullName); }}
          disabled={clockingOutId === entry.attendanceId}
        >
          {clockingOutId === entry.attendanceId ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
          Clock out
        </Button>
      </div>
    );
  }

  const totalActive = grouped.reduce(function (sum, g) { return sum + g.entries.length; }, 0) + noShift.length;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-navy">Clock out</h2>
        <p className="text-sm text-slate-500 mt-1">
          Select which employee to clock out, grouped by shift — keeps overtime accurate per person.
        </p>
      </div>

      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && <p className="text-center text-slate-400 text-sm py-12">Loading...</p>}

      {!loading && totalActive === 0 && (
        <Card className="p-8 text-center text-slate-400 text-sm">
          No one is currently clocked in.
        </Card>
      )}
      {!loading && grouped.map(function (g) {
        if (g.entries.length === 0) return null;
        return (
          <Card key={g.shift.id}>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Clock size={15} /> {g.shift.name}
                  <span className="text-xs font-normal text-slate-400 font-mono">
                    {g.shift.startTime} - {g.shift.endTime}
                  </span>
                </span>
              </CardTitle>
            </CardHeader>
            <div className="divide-y divide-slate-50">
              {g.entries.map(function (entry) {
                return <EntryRow key={entry.attendanceId} entry={entry} />;
              })}
            </div>
          </Card>
        );
      })}

      {!loading && noShift.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <User size={15} /> No shift assigned
              </span>
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-slate-50">
            {noShift.map(function (entry) {
              return <EntryRow key={entry.attendanceId} entry={entry} />;
            })}
          </div>
        </Card>
      )}
    </div>
  );
}