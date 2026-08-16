"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Department = { id: string; name: string; _count: { employees: number } };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/departments");
    const data = await res.json();
    setDepartments(data.departments ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);

    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setCreating(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Failed to add department.");
      return;
    }
    setName("");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-navy">Departments</h2>
        <p className="text-sm text-slate-500 mt-1">Organize employees into departments.</p>
      </div>

      <Card className="p-5">
        <form onSubmit={handleAdd} className="flex gap-3 items-end">
          <div className="flex-1 max-w-xs">
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">New department</label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Customer Support" />
          </div>
          <Button type="submit" disabled={creating}>
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Add
          </Button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </Card>

      <Card>
        <div className="divide-y divide-slate-50">
          {loading && <p className="px-5 py-8 text-center text-slate-400 text-sm">Loading…</p>}
          {!loading && departments.length === 0 && (
            <p className="px-5 py-8 text-center text-slate-400 text-sm">No departments yet.</p>
          )}
          {departments.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-medium text-slate-800">{d.name}</span>
              <span className="text-xs text-slate-400">{d._count.employees} employee{d._count.employees === 1 ? "" : "s"}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}