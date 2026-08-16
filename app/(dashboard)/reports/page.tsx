 "use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Loader2, FileBarChart } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Department = { id: string; name: string };
type Employee = { id: string; fullName: string };
type AttendanceRow = {
  id: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  status: string;
  method: string;
  employee: { fullName: string; employeeCode: string; department: { name: string } | null };
};
type TrendPoint = { date: string; present: number; late: number };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ON_TIME: "success",
  LATE: "warning",
  FLAGGED: "danger",
  ABSENT: "danger",
  EARLY_DEPARTURE: "warning",
};

export default function ReportsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [startDate, setStartDate] = useState(daysAgoIso(30));
  const [endDate, setEndDate] = useState(todayIso());

  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(function () {
    fetch("/api/departments").then(function (r) { return r.json(); }).then(function (d) { setDepartments(d.departments || []); });
    fetch("/api/employees?pageSize=200").then(function (r) { return r.json(); }).then(function (d) { setEmployees(d.employees || []); });
  }, []);

  const buildQuery = useCallback(function () {
    const params = new URLSearchParams({ startDate: startDate, endDate: endDate });
    if (departmentId) params.set("departmentId", departmentId);
    if (employeeId) params.set("employeeId", employeeId);
    return params;
  }, [departmentId, employeeId, startDate, endDate]);

  const load = useCallback(async function () {
    setLoading(true);
    const url = "/api/reports/attendance?" + buildQuery().toString();
    const res = await fetch(url);
    const data = await res.json();
    setRecords(data.records || []);
    setTrend(data.dailyTrend || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [buildQuery]);

  useEffect(function () { load(); }, [load]);

  function handleExport() {
    const params = buildQuery();
    params.set("format", "csv");
    const url = "/api/reports/attendance?" + params.toString();
    window.location.href = url;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-navy">Reports</h2>
          <p className="text-sm text-slate-500 mt-1">Filter attendance by employee, department, and date range.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={loading || records.length === 0}>
          <Download size={15} /> Export CSV
        </Button>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Start date</label>
 <Input type="date" value={startDate} onChange={function (e) { setStartDate(e.target.value); }} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">End date</label>
            <Input type="date" value={endDate} onChange={function (e) { setEndDate(e.target.value); }} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Department</label>
            <Select value={departmentId} onChange={function (e) { setDepartmentId(e.target.value); }}>
              <option value="">All departments</option>
              {departments.map(function (d) {
                return <option key={d.id} value={d.id}>{d.name}</option>;
              })}
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Employee</label>
            <Select value={employeeId} onChange={function (e) { setEmployeeId(e.target.value); }}>
              <option value="">All employees</option>
              {employees.map(function (e) {
                return <option key={e.id} value={e.id}>{e.fullName}</option>;
              })}
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No data in this range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={function (v) {
                    return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  labelFormatter={function (v) {
                    return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                  }}
                  contentStyle={{ borderRadius: 10, border: "1px solid #EEF2F7", fontSize: 12 }}
                />
                <Line type="monotone" dataKey="present" name="Clock-ins" stroke="#2563EB" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="late" name="Late" stroke="#D4AF37" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Records</CardTitle>
          <span className="text-xs text-slate-400">{total} record{total === 1 ? "" : "s"}</span>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-5 py-3 font-medium">Department</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Clock in / out</th>
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
 <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400"><Loader2 size={16} className="animate-spin inline" /></td></tr>
              )}
              {!loading && records.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                  <FileBarChart size={20} className="mx-auto mb-2 text-slate-300" />
                  No records match these filters.
                </td></tr>
              )}
              {records.map(function (r) {
                return (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">{r.employee.fullName}</p>
                      <p className="text-xs text-slate-400 font-mono">{r.employee.employeeCode}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{r.employee.department ? r.employee.department.name : "—"}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {r.clockInAt ? new Date(r.clockInAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {r.clockInAt ? new Date(r.clockInAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      {" – "}
                      {r.clockOutAt ? new Date(r.clockOutAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 capitalize">{r.method.replace("_", " ").toLowerCase()}</td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONE[r.status] || "neutral"}>{r.status.replace("_", " ").toLowerCase()}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}