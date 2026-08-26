 "use client";

import { useState, useCallback } from "react";
import { Calculator, Download, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PayrollEntry = {
  id: string;
  employee: { fullName: string; employeeCode: string };
  regularMinutes: number;
  overtimeMinutes: number;
  lateDeduction: string;
  absenceDeduction: string;
  grossPay: string;
  netPay: string;
};

function firstOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function lastOfMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
}

export default function PayrollPage() {
  const [periodStart, setPeriodStart] = useState(firstOfMonth());
  const [periodEnd, setPeriodEnd] = useState(lastOfMonth());
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      "/api/payroll?periodStart=" + periodStart + "&periodEnd=" + periodEnd
    );
    const data = await res.json();
    setEntries(data.entries ?? []);
    setLoading(false);
    setLoaded(true);
  }, [periodStart, periodEnd]);

  const [genError, setGenError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart, periodEnd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? JSON.stringify(data.error) : "Generation failed.");
      await loadEntries();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }
  function handleExportCsv() {
    const header = "Employee,ID,Regular Hours,Overtime Hours,Late Deduction,Absence Deduction,Gross Pay,Net Pay\n";
    const rows = entries.map((e) => {
      return [
        e.employee.fullName,
        e.employee.employeeCode,
        (e.regularMinutes / 60).toFixed(2),
        (e.overtimeMinutes / 60).toFixed(2),
        Number(e.lateDeduction).toFixed(2),
        Number(e.absenceDeduction).toFixed(2),
        Number(e.grossPay).toFixed(2),
        Number(e.netPay).toFixed(2),
      ].join(",");
    }).join("\n");

    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payroll-" + periodStart + "-to-" + periodEnd + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalNet = entries.reduce((sum, e) => sum + Number(e.netPay), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-navy">Payroll</h2>
        <p className="text-sm text-slate-500 mt-1">
          Generate pay for a period based on attendance, overtime, and deductions.
        </p>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Period start</label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Period end</label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
          <Button onClick={loadEntries} variant="outline" disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
 Load
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 size={15} className="animate-spin" /> : <Calculator size={15} />}
            Generate payroll
          </Button>
          {entries.length > 0 && (
            <Button onClick={handleExportCsv} variant="outline">
              <Download size={15} /> Export CSV
            </Button>
          )}
        </div>
        {genError && <p className="text-sm text-red-600 mt-2">{genError}</p>}
        <p className="text-xs text-slate-400 mt-3">
          Generating replaces any existing entries for this exact period. Pay is calculated from real
          clock-in/out records — regular hours, 1.5x overtime, late-minute deductions, and absence
          deductions against expected working days.
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {loaded ? entries.length + " employee" + (entries.length === 1 ? "" : "s") : "Payroll entries"}
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-5 py-3 font-medium">Regular hrs</th>
                <th className="px-5 py-3 font-medium">Overtime hrs</th>
                <th className="px-5 py-3 font-medium">Late deduction</th>
                <th className="px-5 py-3 font-medium">Absence deduction</th>
                <th className="px-5 py-3 font-medium">Gross pay</th>
                <th className="px-5 py-3 font-medium">Net pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {!loaded && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">Pick a period and load or generate payroll.</td></tr>
              )}
              {loaded && entries.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">No payroll entries for this period yet.</td></tr>
              )}
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{e.employee.fullName}</p>
                    <p className="text-xs text-slate-400 font-mono">{e.employee.employeeCode}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{(e.regularMinutes / 60).toFixed(1)}</td>
                  <td className="px-5 py-3 text-slate-600">{(e.overtimeMinutes / 60).toFixed(1)}</td>
                  <td className="px-5 py-3 text-red-600">-{Number(e.lateDeduction).toFixed(2)}</td>
                  <td className="px-5 py-3 text-red-600">-{Number(e.absenceDeduction).toFixed(2)}</td>
                  <td className="px-5 py-3 text-slate-600">{Number(e.grossPay).toFixed(2)}</td>
                  <td className="px-5 py-3 font-semibold text-navy">{Number(e.netPay).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            {entries.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-100">
                  <td colSpan={6} className="px-5 py-3 text-right text-sm font-medium text-slate-500">Total net pay</td>
                  <td className="px-5 py-3 font-semibold text-navy">{totalNet.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}