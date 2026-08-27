 "use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type Shift = {
  id: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  _count: { assignments: number };
};

type Employee = {
  id: string;
  fullName: string;
  employeeCode: string;
};

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [type, setType] = useState("MORNING");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [gracePeriod, setGracePeriod] = useState("10");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignShiftId, setAssignShiftId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");

  const loadAll = useCallback(function () {
    setLoading(true);
    Promise.all([
      fetch("/api/shifts").then(function (r) { return r.json(); }),
      fetch("/api/employees?pageSize=200").then(function (r) { return r.json(); }),
    ]).then(function (results) {
      setShifts(results[0].shifts || []);
      setEmployees(results[1].employees || []);
      setLoading(false);
    });
  }, []);

  useEffect(function () { loadAll(); }, [loadAll]);

  async function handleCreateShift(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        type: type,
        startTime: startTime,
        endTime: endTime,
        gracePeriodMinutes: Number(gracePeriod),
      }),
    });

    setCreating(false);

    if (!res.ok) {
      const data = await res.json();
      setCreateError(data.error && data.error.formErrors ? data.error.formErrors[0] : "Failed to create shift.");
      return;
    }

    setName("");
    loadAll();
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setAssigning(true);
    setAssignError("");
    setAssignSuccess("");

    const res = await fetch("/api/shifts/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: assignEmployeeId,
        shiftId: assignShiftId,
      }),
    });

    setAssigning(false);

    if (!res.ok) {
      const data = await res.json();
      setAssignError(data.error || "Failed to assign shift.");
      return;
    }

    setAssignSuccess("Shift assigned.");
    loadAll();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-navy">Shifts</h2>
        <p className="text-sm text-slate-500 mt-1">
          Create shifts and assign employees — this is what lateness and overtime get calculated against.
        </p>
      </div>

      <Card className="p-5">
        <p className="text-sm font-medium text-slate-700 mb-3">New shift</p>
        <form onSubmit={handleCreateShift} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div className="col-span-2">
 <label className="text-xs font-medium text-slate-500 mb-1 block">Name</label>
            <Input required value={name} onChange={function (e) { setName(e.target.value); }} placeholder="Morning Shift" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Type</label>
            <Select value={type} onChange={function (e) { setType(e.target.value); }}>
              <option value="MORNING">Morning</option>
              <option value="AFTERNOON">Afternoon</option>
              <option value="NIGHT">Night</option>
              <option value="FLEXIBLE">Flexible</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Start</label>
            <Input type="time" value={startTime} onChange={function (e) { setStartTime(e.target.value); }} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">End</label>
            <Input type="time" value={endTime} onChange={function (e) { setEndTime(e.target.value); }} />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Grace (min)</label>
            <Input type="number" min="0" max="120" value={gracePeriod} onChange={function (e) { setGracePeriod(e.target.value); }} />
          </div>
          <div className="col-span-2 md:col-span-5">
            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Create shift
            </Button>
          </div>
        </form>
        {createError && <p className="text-sm text-red-600 mt-2">{createError}</p>}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All shifts</CardTitle>
        </CardHeader>
        <div className="divide-y divide-slate-50">
          {loading && <p className="px-5 py-8 text-center text-slate-400 text-sm">Loading...</p>}
          {!loading && shifts.length === 0 && (
            <p className="px-5 py-8 text-center text-slate-400 text-sm">No shifts yet — create one above.</p>
          )}
          {shifts.map(function (s) {
            return (
              <Link key={s.id} href={"/shifts/" + s.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-navy/5 p-2">
                    <Clock size={15} className="text-navy" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{s.startTime} - {s.endTime} · {s.gracePeriodMinutes}m grace</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="neutral">{s.type.toLowerCase()}</Badge>
                  <span className="text-xs text-slate-400">{s._count.assignments} assigned</span>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-medium text-slate-700 mb-3">Assign employee to shift</p>
        <form onSubmit={handleAssign} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Employee</label>
            <Select required value={assignEmployeeId} onChange={function (e) { setAssignEmployeeId(e.target.value); }}>
              <option value="">Select employee</option>
              {employees.map(function (emp) {
                return <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.employeeCode})</option>;
 })}
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Shift</label>
            <Select required value={assignShiftId} onChange={function (e) { setAssignShiftId(e.target.value); }}>
              <option value="">Select shift</option>
              {shifts.map(function (s) {
                return <option key={s.id} value={s.id}>{s.name}</option>;
              })}
            </Select>
          </div>
          <div>
            <Button type="submit" disabled={assigning}>
              {assigning ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Assign
            </Button>
          </div>
        </form>
        {assignError && <p className="text-sm text-red-600 mt-2">{assignError}</p>}
        {assignSuccess && <p className="text-sm text-emerald-600 mt-2">{assignSuccess}</p>}
      </Card>
    </div>
  );
}