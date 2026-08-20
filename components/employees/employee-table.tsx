 "use client";
import { EmployeeBiometricsDialog } from "@/components/employees/employee-biometrics-dialog";
import { useState, useEffect, useCallback } from "react";
import { Search, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog";
import Link from "next/link";

type Employee = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  position: string | null;
  status: "ACTIVE" | "SUSPENDED" | "TERMINATED";
  department: { name: string } | null;
};

const STATUS_TONE = { ACTIVE: "success", SUSPENDED: "warning", TERMINATED: "danger" } as const;

export function EmployeeTable() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    const res = await fetch(`/api/employees?search=${encodeURIComponent(q)}&pageSize=50`);
    const data = await res.json();
    setEmployees(data.employees ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <Card>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or ID..."
            className="pl-9"
          />
        </div>
        <AddEmployeeDialog onCreated={() => load(search)} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-5 py-3 font-medium">Employee</th>
              <th className="px-5 py-3 font-medium">ID</th>
              <th className="px-5 py-3 font-medium">Department</th>
              <th className="px-5 py-3 font-medium">Position</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>
            )}
            {!loading && employees.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No employees found.</td></tr>
            )}
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => window.location.assign("/employees/" + emp.id)}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-navy/10 text-navy flex items-center justify-center text-xs font-semibold shrink-0">
                      {emp.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">{emp.fullName}</p>
                      <p className="text-xs text-slate-400 truncate">{emp.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-slate-500">{emp.employeeCode}</td>
                <td className="px-5 py-3 text-slate-600">{emp.department?.name ?? "—"}</td>
                <td className="px-5 py-3 text-slate-600">{emp.position ?? "—"}</td>
                <td className="px-5 py-3">
                  <Badge tone={STATUS_TONE[emp.status]}>{emp.status.toLowerCase()}</Badge>
                </td>
                <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
  <EmployeeBiometricsDialog employeeId={emp.id} employeeName={emp.fullName} />
</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && (
        <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
          {total} employee{total === 1 ? "" : "s"}
        </div>
      )}
    </Card>
  );
}