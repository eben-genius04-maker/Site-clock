"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, UserMinus, Plus, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import Link from "next/link";

type Shift = {
  id: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
};

type Assignment = {
  id: string;
  employee: { id: string; fullName: string; employeeCode: string; position: string | null };
};

type Employee = { id: string; fullName: string; employeeCode: string };

export default function ShiftDetailPage() {
  const params = useParams();
  const shiftId = params.id as string;

  const [shift, setShift] = useState<Shift | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [addEmployeeId, setAddEmployeeId] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(function () {
    setLoading(true);
    Promise.all([
      fetch("/api/shifts/" + shiftId).then(function (r) { return r.json(); }),
      fetch("/api/employees?pageSize=200").then(function (r) { return r.json(); }),
    ]).then(function (results) {
      setShift(results[0].shift ?? null);
      setAssignments(results[0].assignments ?? []);
      setAllEmployees(results[1].employees ?? []);
      setLoading(false);
    });
  }, [shiftId]);

  useEffect(function () { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addEmployeeId) return;
    setAdding(true);
    setError("");

    const res = await fetch("/api/shifts/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: addEmployeeId, shiftId: shiftId }),
    });

    setAdding(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to assign employee.");
      return;
    }

    setAddEmployeeId("");
    load();
  }

  async function handleRemove(employeeShiftId: string) {
    setRemovingId(employeeShiftId);
    setError("");

    const res = await fetch("/api/shifts/unassign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeShiftId: employeeShiftId }),
    });

    setRemovingId(null);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to remove employee.");
      return;
    }

    load();
  }

  const assignedIds = new Set(assignments.map(function (a) { return a.employee.id; }));
  const availableEmployees = allEmployees.filter(function (e) { return !assignedIds.has(e.id); });

  if (loading) {
    return <p className="text-center text-slate-400 text-sm py-12">Loading...</p>;
  }

  if (!shift) {
    return <p className="text-center text-slate-400 text-sm py-12">Shift not found.</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/shifts" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy">
        <ArrowLeft size={15} /> Back to shifts
      </Link>

      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-navy/5 p-2">
          <Clock size={18} className="text-navy" />
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold text-navy">{shift.name}</h1>
          <p className="text-sm text-slate-500 font-mono">
            {shift.startTime} - {shift.endTime} · {shift.gracePeriodMinutes}m grace · {shift.type.toLowerCase()}
          </p>
        </div>
      </div>
 <Card>
        <CardHeader>
          <CardTitle>Assigned staff ({assignments.length})</CardTitle>
        </CardHeader>
        <div className="divide-y divide-slate-50">
          {assignments.length === 0 && (
            <p className="px-5 py-8 text-center text-slate-400 text-sm">No one assigned to this shift yet.</p>
          )}
          {assignments.map(function (a) {
            return (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.employee.fullName}</p>
                  <p className="text-xs text-slate-400 font-mono">{a.employee.employeeCode}{a.employee.position ? " · " + a.employee.position : ""}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={function () { handleRemove(a.id); }}
                  disabled={removingId === a.id}
                >
                  {removingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-medium text-slate-700 mb-3">Add employee to this shift</p>
        <form onSubmit={handleAdd} className="flex gap-3 items-end">
          <div className="flex-1">
            <Select required value={addEmployeeId} onChange={function (e) { setAddEmployeeId(e.target.value); }}>
              <option value="">Select employee</option>
              {availableEmployees.map(function (emp) {
                return <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.employeeCode})</option>;
              })}
            </Select>
          </div>
          <Button type="submit" disabled={adding || !addEmployeeId}>
            {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Add
          </Button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </Card>
    </div>
  );
}