import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

export async function seedDatabase(prisma: PrismaClient) {
  // 1. Seed Roles
  const roleCount = await prisma.role.count();
  if (roleCount === 0) {
    console.log("Seeding roles...");
    await prisma.role.createMany({
      data: [
        { role_id: 1, role_name: "Fleet Manager" },
        { role_id: 2, role_name: "Driver" },
        { role_id: 3, role_name: "Safety Officer" },
        { role_id: 4, role_name: "Financial Analyst" },
      ],
    });
  }

  // 2. Seed Users
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.log("Seeding default users...");
    const salt = bcryptjs.genSaltSync(10);
    const passwordHash = bcryptjs.hashSync("password123", salt);

    await prisma.user.createMany({
      data: [
        {
          name: "Marc Manager",
          email: "manager@transitops.com",
          phone: "+1555100200",
          password_hash: passwordHash,
          role_id: 1, // Fleet Manager
          status: "Active",
        },
        {
          name: "David Driver",
          email: "driver@transitops.com",
          phone: "+1555300400",
          password_hash: passwordHash,
          role_id: 2, // Driver
          status: "Active",
        },
        {
          name: "Sofia Safety",
          email: "safety@transitops.com",
          phone: "+1555500600",
          password_hash: passwordHash,
          role_id: 3, // Safety Officer
          status: "Active",
        },
        {
          name: "Fiona Finance",
          email: "finance@transitops.com",
          phone: "+1555700800",
          password_hash: passwordHash,
          role_id: 4, // Financial Analyst
          status: "Active",
        },
      ],
    });
  }

  // 3. Seed Vehicles
  const vehicleCount = await prisma.vehicle.count();
  if (vehicleCount === 0) {
    console.log("Seeding default vehicles...");
    await prisma.vehicle.createMany({
      data: [
        {
          registration_number: "TX-VAN-01",
          vehicle_name: "City Delivery Van 01",
          vehicle_model: "Ford Transit",
          vehicle_type: "Van",
          manufacturer: "Ford",
          manufacture_year: 2021,
          maximum_load_capacity_kg: 1200,
          fuel_type: "Petrol",
          current_odometer: 45200.5,
          acquisition_cost: 32000.0,
          purchase_date: "2021-04-12",
          status: "Available",
          region: "West",
        },
        {
          registration_number: "TX-VAN-02",
          vehicle_name: "Cargo Van 02",
          vehicle_model: "Mercedes Sprinter",
          vehicle_type: "Van",
          manufacturer: "Mercedes-Benz",
          manufacture_year: 2020,
          maximum_load_capacity_kg: 1500,
          fuel_type: "Diesel",
          current_odometer: 62410.0,
          acquisition_cost: 45000.0,
          purchase_date: "2020-09-18",
          status: "In Shop",
          region: "West",
        },
        {
          registration_number: "TX-TRK-03",
          vehicle_name: "Heavy Duty Hauler 03",
          vehicle_model: "Volvo FH16",
          vehicle_type: "Truck",
          manufacturer: "Volvo",
          manufacture_year: 2019,
          maximum_load_capacity_kg: 18000,
          fuel_type: "Diesel",
          current_odometer: 185300.0,
          acquisition_cost: 110000.0,
          purchase_date: "2019-02-25",
          status: "Available",
          region: "East",
        },
        {
          registration_number: "TX-TRK-04",
          vehicle_name: "Regional Cargo Truck 04",
          vehicle_model: "Freightliner Cascadia",
          vehicle_type: "Truck",
          manufacturer: "Freightliner",
          manufacture_year: 2022,
          maximum_load_capacity_kg: 15000,
          fuel_type: "Diesel",
          current_odometer: 89450.2,
          acquisition_cost: 125000.0,
          purchase_date: "2022-06-15",
          status: "On Trip",
          region: "North",
        },
        {
          registration_number: "TX-VAN-05",
          vehicle_name: "Courier Sprinter 05",
          vehicle_model: "Ford Transit Connect",
          vehicle_type: "Van",
          manufacturer: "Ford",
          manufacture_year: 2023,
          maximum_load_capacity_kg: 800,
          fuel_type: "Electric",
          current_odometer: 12100.8,
          acquisition_cost: 38000.0,
          purchase_date: "2023-01-10",
          status: "Available",
          region: "South",
        },
        {
          registration_number: "TX-TRK-06",
          vehicle_name: "Retired Logistics Truck",
          vehicle_model: "Kenworth T680",
          vehicle_type: "Truck",
          manufacturer: "Kenworth",
          manufacture_year: 2012,
          maximum_load_capacity_kg: 20000,
          fuel_type: "Diesel",
          current_odometer: 540200.0,
          acquisition_cost: 95000.0,
          purchase_date: "2012-05-01",
          status: "Retired",
          region: "South",
        },
      ],
    });
  }

  // 4. Seed Drivers
  const driverCount = await prisma.driver.count();
  if (driverCount === 0) {
    console.log("Seeding default drivers...");
    const activeVehicles = await prisma.vehicle.findMany({
      where: { status: { in: ["Available", "On Trip", "In Shop"] } },
    });

    await prisma.driver.createMany({
      data: [
        {
          name: "Alex Johnson",
          license_number: "DL-993821",
          license_category: "Class A",
          license_expiry_date: "2028-10-15",
          phone: "+1555019283",
          email: "alex@transitops.com",
          joining_date: "2021-06-01",
          experience_years: 6,
          safety_score: 96.5,
          status: "Available",
          assigned_vehicle_id: activeVehicles[0]?.vehicle_id || null, // Van-01
        },
        {
          name: "Sarah Miller",
          license_number: "DL-827391",
          license_category: "Class A",
          license_expiry_date: "2027-04-18",
          phone: "+1555018273",
          email: "sarah@transitops.com",
          joining_date: "2020-03-12",
          experience_years: 8,
          safety_score: 92.0,
          status: "On Trip",
          assigned_vehicle_id: activeVehicles[3]?.vehicle_id || null, // Truck-04
        },
        {
          name: "John Davis",
          license_number: "DL-482930",
          license_category: "Class B",
          license_expiry_date: "2029-01-20",
          phone: "+1555014829",
          email: "john@transitops.com",
          joining_date: "2022-11-15",
          experience_years: 4,
          safety_score: 88.0,
          status: "Available",
          assigned_vehicle_id: activeVehicles[4]?.vehicle_id || null, // Van-05
        },
        {
          name: "Robert Smith",
          license_number: "DL-102938",
          license_category: "Class A",
          license_expiry_date: "2027-08-30",
          phone: "+1555011029",
          email: "robert@transitops.com",
          joining_date: "2018-01-10",
          experience_years: 12,
          safety_score: 62.0, // Low score, high risk
          status: "Suspended",
          assigned_vehicle_id: null,
        },
        {
          name: "Emma Wilson",
          license_number: "DL-552431",
          license_category: "Class B",
          license_expiry_date: "2024-02-14", // Expired license!
          phone: "+1555015524",
          email: "emma@transitops.com",
          joining_date: "2023-05-18",
          experience_years: 2,
          safety_score: 95.0,
          status: "Off Duty",
          assigned_vehicle_id: null,
        },
      ],
    });
  }

  // 5. Seed historical Trips, Maintenance logs, Fuel logs, and Expenses
  const tripCount = await prisma.trip.count();
  if (tripCount === 0) {
    console.log("Seeding sample operations data (trips, logs, expenses)...");
    const vehicles = await prisma.vehicle.findMany();
    const drivers = await prisma.driver.findMany();

    const van01 = vehicles.find((v) => v.registration_number === "TX-VAN-01")!;
    const truck03 = vehicles.find((v) => v.registration_number === "TX-TRK-03")!;
    const truck04 = vehicles.find((v) => v.registration_number === "TX-TRK-04")!;

    const alex = drivers.find((d) => d.email === "alex@transitops.com")!;
    const sarah = drivers.find((d) => d.email === "sarah@transitops.com")!;
    const john = drivers.find((d) => d.email === "john@transitops.com")!;

    // Historical Completed Trip 1 (Van-01)
    const trip1 = await prisma.trip.create({
      data: {
        vehicle_id: van01.vehicle_id,
        driver_id: alex.driver_id,
        source_city: "Seattle",
        destination_city: "Portland",
        start_date: "2026-06-20",
        end_date: "2026-06-21",
        cargo_weight: 450.0,
        planned_distance: 180.0,
        actual_distance: 185.5,
        fuel_consumed: 18.5,
        revenue: 1200.0,
        status: "Completed",
      },
    });

    // Historical Completed Trip 2 (Truck-03)
    const trip2 = await prisma.trip.create({
      data: {
        vehicle_id: truck03.vehicle_id,
        driver_id: john.driver_id,
        source_city: "Chicago",
        destination_city: "New York",
        start_date: "2026-06-25",
        end_date: "2026-06-28",
        cargo_weight: 12000.0,
        planned_distance: 800.0,
        actual_distance: 812.0,
        fuel_consumed: 245.0,
        revenue: 8500.0,
        status: "Completed",
      },
    });

    // Active Trip 3 (Truck-04)
    await prisma.trip.create({
      data: {
        vehicle_id: truck04.vehicle_id,
        driver_id: sarah.driver_id,
        source_city: "Denver",
        destination_city: "Salt Lake City",
        start_date: "2026-07-10",
        cargo_weight: 9500.0,
        planned_distance: 520.0,
        revenue: 4500.0,
        status: "Dispatched",
      },
    });

    // Seed Fuel Logs
    await prisma.fuelLog.createMany({
      data: [
        {
          vehicle_id: van01.vehicle_id,
          trip_id: trip1.trip_id,
          date: "2026-06-20",
          fuel_station: "Chevron Seattle",
          fuel_type: "Petrol",
          liters: 18.5,
          price_per_liter: 1.35,
          total_cost: 24.98,
          odometer: 45010.0,
        },
        {
          vehicle_id: truck03.vehicle_id,
          trip_id: trip2.trip_id,
          date: "2026-06-26",
          fuel_station: "Pilot Travel Center #12",
          fuel_type: "Diesel",
          liters: 120.0,
          price_per_liter: 1.45,
          total_cost: 174.0,
          odometer: 184600.0,
        },
        {
          vehicle_id: truck03.vehicle_id,
          trip_id: trip2.trip_id,
          date: "2026-06-28",
          fuel_station: "Loves Travel Stop NY",
          fuel_type: "Diesel",
          liters: 125.0,
          price_per_liter: 1.48,
          total_cost: 185.0,
          odometer: 185200.0,
        },
      ],
    });

    // Seed Maintenance Logs
    await prisma.maintenanceLog.createMany({
      data: [
        {
          vehicle_id: van01.vehicle_id,
          maintenance_type: "Oil Change",
          description: "Routine 10,000 mile synthetic oil change & filter replacement.",
          start_date: "2026-05-14",
          completion_date: "2026-05-14",
          cost: 85.0,
          status: "Completed",
          service_center: "Quick Lube Express",
        },
        {
          vehicle_id: truck03.vehicle_id,
          maintenance_type: "Brake Repair",
          description: "Replaced front brake pads and resurfaced rotors.",
          start_date: "2026-06-02",
          completion_date: "2026-06-03",
          cost: 450.0,
          status: "Completed",
          service_center: "Volvo Heavy Service",
        },
        {
          vehicle_id: vehicles.find((v) => v.registration_number === "TX-VAN-02")!.vehicle_id,
          maintenance_type: "Engine Overhaul",
          description: "Investigating cylinder compression loss and fuel injector issues.",
          start_date: "2026-07-08",
          cost: 1200.0,
          status: "In Progress",
          service_center: "Master Mechanic Shop",
        },
      ],
    });

    // Seed Expenses
    await prisma.expense.createMany({
      data: [
        {
          trip_id: trip1.trip_id,
          vehicle_id: van01.vehicle_id,
          expense_type: "Tolls",
          amount: 15.5,
          expense_date: "2026-06-20",
          description: "Seattle-Tacoma Express Toll",
        },
        {
          trip_id: trip2.trip_id,
          vehicle_id: truck03.vehicle_id,
          expense_type: "Tolls",
          amount: 85.0,
          expense_date: "2026-06-26",
          description: "I-90 Interstate Tollway Tolls",
        },
        {
          trip_id: trip2.trip_id,
          vehicle_id: truck03.vehicle_id,
          expense_type: "Driver Allowance",
          amount: 150.0,
          expense_date: "2026-06-27",
          description: "Meal and lodging stipend",
        },
      ],
    });
  }

  console.log("Database successfully seeded!");
}
