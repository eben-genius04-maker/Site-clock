 "use client";

import { useState, useEffect } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Department = { id: string; name: string };

export function EditEmployeeDialog({
  employeeId,
  initial,
  onUpdated,
}: {
  employeeId: string;
  initial: {
    fullName: string;
    phone: string | null;
    position: string | null;
    salary: string | null;
    departmentId: string | null;
    status: "ACTIVE" | "SUSPENDED" | "TERMINATED";
    emergencyContact: string | null;
    address: string | null;
  };
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [fullName, setFullName] = useState(initial.fullName);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [position, setPosition] = useState(initial.position ?? "");
  const [salary, setSalary] = useState(initial.salary ?? "");
  const [departmentId, setDepartmentId] = useState(initial.departmentId ?? "");
  const [status, setStatus] = useState(initial.status);
  const [emergencyContact, setEmergencyContact] = useState(initial.emergencyContact ?? "");
  const [address, setAddress] = useState(initial.address ?? "");

  useEffect(() => {
    if (!open) return;
    fetch("/api/departments")
      .then((res) => res.json())
      .then((data) => setDepartments(data.departments ?? []))
      .catch(() => {});
  }, [open]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/employees/" + employeeId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone: phone || undefined,
          position: position || undefined,
          salary: salary ? Number(salary) : undefined,
          departmentId: departmentId || null,
          status,
          emergencyContact: emergencyContact || undefined,
          address: address || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed.");

      setOpen(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil size={14} /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit employee</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Full name</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Position</label>
            <Input value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Monthly salary</label>
            <Input type="number" min="0" step="0.01" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. 3000" />
 </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Department</label>
            <select
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">No department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
            <select
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Emergency contact</label>
            <Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <Button className="w-full mt-4" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          Save changes
        </Button>
      </DialogContent>
    </Dialog>
  );
}