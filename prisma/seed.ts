/**
 * Seeds a demo company so the dashboard has real data on first run.
 * Run with: npm run prisma:seed
 *
 * Note: this creates Prisma rows only. To actually log in as the seeded
 * admin you also need a matching Supabase auth user — easiest path is to
 * sign up normally through /register, then update that user's companyId
 * in Prisma Studio to point at this seeded company if you want the demo data.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.create({
    data: {
      name: "Keeptalking Logistics",
      timezone: "Africa/Accra",
      settings: { create: {} },
    },
  });

  const office = await prisma.officeLocation.create({
    data: {
      name: "Tema Head Office",
      latitude: 5.6698,
      longitude: -0.0166,
      radiusMeters: 150,
      companyId: company.id,
    },
  });

  const departments = await Promise.all(
    ["Sales", "Warehouse", "Finance", "Logistics", "HR"].map((name) =>
      prisma.department.create({ data: { name, companyId: company.id } })
    )
  );

  const morningShift = await prisma.shift.create({
    data: {
      name: "Morning Shift",
      type: "MORNING",
      startTime: "08:00",
      endTime: "17:00",
      gracePeriodMinutes: 10,
      companyId: company.id,
    },
  });

  const names = [
    "Ama Boateng", "Kwesi Amponsah", "Efua Asante", "Yaw Owusu",
    "Abena Mensah", "Kojo Darko", "Adjoa Frimpong", "Kwabena Sarpong",
  ];

  const employees = await Promise.all(
    names.map((fullName, i) =>
      prisma.employee.create({
        data: {
          fullName,
          email: `${fullName.toLowerCase().replace(" ", ".")}@keeptalking.gh`,
          employeeCode: `SC-2026-${String(i + 1).padStart(4, "0")}`,
          departmentId: departments[i % departments.length].id,
          position: ["Sales Rep", "Warehouse Assistant", "Accountant", "Driver", "HR Officer"][i % 5],
          companyId: company.id,
          dateEmployed: new Date(2024, i % 12, 1),
        },
      })
    )
  );

  await Promise.all(
    employees.map((emp) =>
      prisma.employeeShift.create({ data: { employeeId: emp.id, shiftId: morningShift.id } })
    )
  );

  // Today's attendance for the first 6 employees — mix of on-time / late / flagged.
  const today = new Date();
  today.setHours(7, 50, 0, 0);

  await prisma.attendance.create({
    data: {
      employeeId: employees[0].id,
      clockInAt: today,
      method: "GPS",
      status: "ON_TIME",
      clockInLat: office.latitude,
      clockInLng: office.longitude,
      distanceFromOfficeM: 12,
    },
  });

  const lateTime = new Date(today);
  lateTime.setHours(8, 24, 0, 0);
  await prisma.attendance.create({
    data: {
      employeeId: employees[1].id,
      clockInAt: lateTime,
      method: "FACE",
      status: "LATE",
      lateMinutes: 14,
      faceMatchConfidence: 0.93,
    },
  });

  const flaggedTime = new Date(today);
  flaggedTime.setHours(8, 5, 0, 0);
  await prisma.attendance.create({
    data: {
      employeeId: employees[3].id,
      clockInAt: flaggedTime,
      method: "GPS",
      status: "FLAGGED",
      needsReview: true,
      clockInLat: office.latitude + 0.01,
      clockInLng: office.longitude + 0.01,
      distanceFromOfficeM: 340,
    },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: employees[2].id,
      companyId: company.id,
      type: "ANNUAL",
      startDate: new Date(2026, 7, 10),
      endDate: new Date(2026, 7, 14),
      reason: "Family trip to Kumasi",
      status: "PENDING",
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      action: "employee.created",
      entity: "Employee",
      entityId: employees[7].id,
      metadata: { note: "Seeded demo data" },
    },
  });

  console.log(`Seeded company "${company.name}" with ${employees.length} employees.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
