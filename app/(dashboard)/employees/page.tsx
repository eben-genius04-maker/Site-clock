import { EmployeeTable } from "@/components/employees/employee-table";

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-navy">Employees</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your team, departments, and access.</p>
      </div>
      <EmployeeTable />
    </div>
  );
}
