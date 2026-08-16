 "use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, ArrowRight } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmployeeFaceCapture } from "@/components/employees/employee-face-capture";
import { EmployeeFingerprintSetup } from "@/components/employees/employee-fingerprint-setup";

type Department = { id: string; name: string };
type Step = "details" | "face" | "fingerprint";

export function AddEmployeeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("details");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const [newEmployeeId, setNewEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/departments")
      .then((res) => res.json())
      .then((data) => setDepartments(data.departments ?? []));
  }, [open]);

  function resetAll() {
    setStep("details");
    setFullName("");
    setEmail("");
    setPhone("");
    setPosition("");
    setDepartmentId("");
    setNewEmployeeId(null);
    setError(null);
  }

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        phone: phone || undefined,
        position: position || undefined,
        departmentId: departmentId || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Failed to add employee.");
      return;
    }

    const data = await res.json();
    setNewEmployeeId(data.employee.id);
    onCreated();
    setStep("face");
  }

  async function handleFaceCaptured(dataUrl: string) {
    if (!newEmployeeId) return;
    await fetch(`/api/employees/${newEmployeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: dataUrl }),
    });
    setStep("fingerprint");
  }

  function handleFinish() {
    setOpen(false);
    resetAll();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetAll(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus size={15} /> Add employee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === "details" && "Add employee"}
            {step === "face" && "Face capture"}
            {step === "fingerprint" && "Fingerprint setup"}
          </DialogTitle>
        </DialogHeader>

        {step === "details" && (
          <form onSubmit={handleCreateEmployee} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Full name</label>
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ama Boateng" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email</label>
 <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ama@company.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233..." />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Position</label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Sales Rep" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Department</label>
              <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
              Continue to face capture
            </Button>
          </form>
        )}

        {step === "face" && newEmployeeId && (
          <EmployeeFaceCapture
            onCaptured={handleFaceCaptured}
            onSkip={() => setStep("fingerprint")}
          />
        )}

        {step === "fingerprint" && newEmployeeId && (
          <EmployeeFingerprintSetup
            employeeId={newEmployeeId}
            employeeName={fullName}
            onDone={handleFinish}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}