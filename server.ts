import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { seedDatabase } from "./src/db/seed.ts";

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "transitops-super-secret-key-2026";

app.use(express.json());

// Initialize database (run seed on startup if database roles are unseeded)
async function initDb() {
  try {
    await seedDatabase(prisma);
  } catch (error) {
    console.error("Database seed failed:", error);
  }
}
initDb();

// Authentication Middleware
interface AuthenticatedRequest extends express.Request {
  user?: {
    user_id: number;
    email: string;
    role_id: number;
    role_name: string;
    name: string;
  };
}

const authenticateJWT = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }
      req.user = user as any;
      next();
    });
  } else {
    res.status(401).json({ error: "Authorization token required" });
  }
};

// --- AUTHENTICATION ENDPOINTS ---

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password, role_id } = req.body;

    if (!name || !email || !password || !role_id) {
      return res.status(400).json({ error: "Name, email, password, and role are required." });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered." });
    }

    const salt = bcryptjs.genSaltSync(10);
    const password_hash = bcryptjs.hashSync(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || "",
        password_hash,
        role_id: parseInt(role_id),
      },
      include: { role: true },
    });

    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role.role_name,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role.role_name,
      },
    });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error during registration." });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !bcryptjs.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role.role_name,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role.role_name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error during login." });
  }
});

// Me (Check current profile)
app.get("/api/auth/me", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// --- DASHBOARD ENDPOINTS ---

app.get("/api/dashboard/stats", authenticateJWT, async (req, res) => {
  try {
    const [allVehicles, activeTrips, draftTrips, allDrivers] = await Promise.all([
      prisma.vehicle.findMany(),
      prisma.trip.findMany({ where: { status: "Dispatched" } }),
      prisma.trip.findMany({ where: { status: "Draft" } }),
      prisma.driver.findMany(),
    ]);

    const activeVehiclesCount = allVehicles.filter((v) => v.status === "On Trip").length;
    const availableVehiclesCount = allVehicles.filter((v) => v.status === "Available").length;
    const maintenanceVehiclesCount = allVehicles.filter((v) => v.status === "In Shop").length;
    const retiredVehiclesCount = allVehicles.filter((v) => v.status === "Retired").length;

    const totalActiveNonRetired = allVehicles.filter((v) => v.status !== "Retired").length;
    const fleetUtilization = totalActiveNonRetired > 0 
      ? Math.round((activeVehiclesCount / totalActiveNonRetired) * 100) 
      : 0;

    const driversOnDutyCount = allDrivers.filter((d) => d.status === "Available" || d.status === "On Trip").length;

    res.json({
      activeVehicles: activeVehiclesCount,
      availableVehicles: availableVehiclesCount,
      vehiclesInMaintenance: maintenanceVehiclesCount,
      activeTrips: activeTrips.length,
      pendingTrips: draftTrips.length,
      driversOnDuty: driversOnDutyCount,
      fleetUtilization,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to load dashboard metrics." });
  }
});

// --- VEHICLE REGISTRY ---

// List Vehicles
app.get("/api/vehicles", authenticateJWT, async (req, res) => {
  try {
    const { type, status, region } = req.query;
    const filters: any = {};

    if (type) filters.vehicle_type = type as string;
    if (status) filters.status = status as string;
    if (region) filters.region = region as string;

    const vehicles = await prisma.vehicle.findMany({
      where: filters,
      include: {
        drivers: true,
        maintenance_logs: { orderBy: { start_date: "desc" }, take: 5 },
      },
      orderBy: { vehicle_id: "desc" },
    });
    res.json(vehicles);
  } catch (error) {
    console.error("List vehicles error:", error);
    res.status(500).json({ error: "Failed to list vehicles." });
  }
});

// Create Vehicle
app.post("/api/vehicles", authenticateJWT, async (req, res) => {
  try {
    const {
      registration_number,
      vehicle_name,
      vehicle_model,
      vehicle_type,
      manufacturer,
      manufacture_year,
      maximum_load_capacity_kg,
      fuel_type,
      current_odometer,
      acquisition_cost,
      purchase_date,
      status,
      region,
    } = req.body;

    if (!registration_number || !vehicle_name || !vehicle_type || !maximum_load_capacity_kg || !current_odometer) {
      return res.status(400).json({ error: "Missing required vehicle parameters." });
    }

    // Check unique registration_number
    const existing = await prisma.vehicle.findUnique({ where: { registration_number } });
    if (existing) {
      return res.status(400).json({ error: `Vehicle registration number ${registration_number} must be unique.` });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        registration_number,
        vehicle_name,
        vehicle_model,
        vehicle_type,
        manufacturer: manufacturer || "Unknown",
        manufacture_year: parseInt(manufacture_year) || new Date().getFullYear(),
        maximum_load_capacity_kg: parseFloat(maximum_load_capacity_kg),
        fuel_type: fuel_type || "Diesel",
        current_odometer: parseFloat(current_odometer),
        acquisition_cost: parseFloat(acquisition_cost) || 0.0,
        purchase_date: purchase_date || new Date().toISOString().split("T")[0],
        status: status || "Available",
        region: region || "Unassigned",
      },
    });

    res.status(201).json(vehicle);
  } catch (error) {
    console.error("Create vehicle error:", error);
    res.status(500).json({ error: "Failed to register vehicle." });
  }
});

// Update Vehicle
app.put("/api/vehicles/:id", authenticateJWT, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;

    if (data.registration_number) {
      const existing = await prisma.vehicle.findFirst({
        where: {
          registration_number: data.registration_number,
          NOT: { vehicle_id: id },
        },
      });
      if (existing) {
        return res.status(400).json({ error: `Registration number ${data.registration_number} is already in use.` });
      }
    }

    const updated = await prisma.vehicle.update({
      where: { vehicle_id: id },
      data: {
        ...data,
        manufacture_year: data.manufacture_year ? parseInt(data.manufacture_year) : undefined,
        maximum_load_capacity_kg: data.maximum_load_capacity_kg ? parseFloat(data.maximum_load_capacity_kg) : undefined,
        current_odometer: data.current_odometer ? parseFloat(data.current_odometer) : undefined,
        acquisition_cost: data.acquisition_cost ? parseFloat(data.acquisition_cost) : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Update vehicle error:", error);
    res.status(500).json({ error: "Failed to update vehicle." });
  }
});

// Delete Vehicle
app.delete("/api/vehicles/:id", authenticateJWT, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.vehicle.delete({ where: { vehicle_id: id } });
    res.json({ message: "Vehicle deleted successfully." });
  } catch (error) {
    console.error("Delete vehicle error:", error);
    res.status(500).json({ error: "Failed to delete vehicle. It may be referenced in trips or logs." });
  }
});

// --- DRIVER MANAGEMENT ---

// List Drivers
app.get("/api/drivers", authenticateJWT, async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      include: { assigned_vehicle: true },
      orderBy: { driver_id: "desc" },
    });
    res.json(drivers);
  } catch (error) {
    console.error("List drivers error:", error);
    res.status(500).json({ error: "Failed to retrieve drivers list." });
  }
});

// Create Driver
app.post("/api/drivers", authenticateJWT, async (req, res) => {
  try {
    const {
      name,
      license_number,
      license_category,
      license_expiry_date,
      phone,
      email,
      joining_date,
      experience_years,
      safety_score,
      status,
      assigned_vehicle_id,
    } = req.body;

    if (!name || !license_number || !license_category || !license_expiry_date || !email) {
      return res.status(400).json({ error: "Missing required driver profile parameters." });
    }

    const existing = await prisma.driver.findUnique({ where: { license_number } });
    if (existing) {
      return res.status(400).json({ error: `Driver with license number ${license_number} already exists.` });
    }

    const driver = await prisma.driver.create({
      data: {
        name,
        license_number,
        license_category,
        license_expiry_date,
        phone: phone || "",
        email,
        joining_date: joining_date || new Date().toISOString().split("T")[0],
        experience_years: parseInt(experience_years) || 0,
        safety_score: parseFloat(safety_score) || 100.0,
        status: status || "Available",
        assigned_vehicle_id: assigned_vehicle_id ? parseInt(assigned_vehicle_id) : null,
      },
    });

    res.status(201).json(driver);
  } catch (error) {
    console.error("Create driver error:", error);
    res.status(500).json({ error: "Failed to register driver." });
  }
});

// Update Driver
app.put("/api/drivers/:id", authenticateJWT, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;

    if (data.license_number) {
      const existing = await prisma.driver.findFirst({
        where: {
          license_number: data.license_number,
          NOT: { driver_id: id },
        },
      });
      if (existing) {
        return res.status(400).json({ error: `License number ${data.license_number} is already registered.` });
      }
    }

    const updated = await prisma.driver.update({
      where: { driver_id: id },
      data: {
        ...data,
        experience_years: data.experience_years ? parseInt(data.experience_years) : undefined,
        safety_score: data.safety_score ? parseFloat(data.safety_score) : undefined,
        assigned_vehicle_id: data.assigned_vehicle_id === "" ? null : data.assigned_vehicle_id ? parseInt(data.assigned_vehicle_id) : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Update driver error:", error);
    res.status(500).json({ error: "Failed to update driver profile." });
  }
});

// Delete Driver
app.delete("/api/drivers/:id", authenticateJWT, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.driver.delete({ where: { driver_id: id } });
    res.json({ message: "Driver deleted successfully." });
  } catch (error) {
    console.error("Delete driver error:", error);
    res.status(500).json({ error: "Failed to delete driver. They may be referenced in trips." });
  }
});

// --- TRIP MANAGEMENT ---

// List Trips
app.get("/api/trips", authenticateJWT, async (req, res) => {
  try {
    const trips = await prisma.trip.findMany({
      include: {
        vehicle: true,
        driver: true,
      },
      orderBy: { trip_id: "desc" },
    });
    res.json(trips);
  } catch (error) {
    console.error("List trips error:", error);
    res.status(500).json({ error: "Failed to retrieve trips list." });
  }
});

// Create Trip (With strict business validations!)
app.post("/api/trips", authenticateJWT, async (req, res) => {
  try {
    const {
      vehicle_id,
      driver_id,
      source_city,
      destination_city,
      start_date,
      cargo_weight,
      planned_distance,
      revenue,
      status, // Can be "Draft" or "Dispatched"
    } = req.body;

    if (!vehicle_id || !driver_id || !source_city || !destination_city || !start_date || !cargo_weight || !planned_distance) {
      return res.status(400).json({ error: "Missing required trip parameters." });
    }

    const vehicleIdParsed = parseInt(vehicle_id);
    const driverIdParsed = parseInt(driver_id);
    const cargoWeightParsed = parseFloat(cargo_weight);

    // 1. Fetch vehicle and driver
    const [vehicle, driver] = await Promise.all([
      prisma.vehicle.findUnique({ where: { vehicle_id: vehicleIdParsed } }),
      prisma.driver.findUnique({ where: { driver_id: driverIdParsed } }),
    ]);

    if (!vehicle) {
      return res.status(404).json({ error: "Selected vehicle does not exist." });
    }
    if (!driver) {
      return res.status(404).json({ error: "Selected driver does not exist." });
    }

    // 2. Validate Vehicle Status: Retired or In Shop vehicles must never appear in dispatch selection or be dispatched.
    if (vehicle.status === "Retired" || vehicle.status === "In Shop") {
      return res.status(400).json({ error: `Vehicle is currently in '${vehicle.status}' status and cannot be dispatched.` });
    }

    // 3. Validate Driver Status: Expired licenses or Suspended drivers cannot be assigned
    if (driver.status === "Suspended") {
      return res.status(400).json({ error: "Driver is currently Suspended and cannot be assigned to trips." });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (driver.license_expiry_date < todayStr) {
      return res.status(400).json({ error: `Driver license has expired on ${driver.license_expiry_date} and is invalid.` });
    }

    // 4. Validate double-booking: A driver or vehicle already marked On Trip cannot be assigned.
    if (vehicle.status === "On Trip") {
      return res.status(400).json({ error: "Selected vehicle is already On Trip." });
    }
    if (driver.status === "On Trip") {
      return res.status(400).json({ error: "Selected driver is already On Trip." });
    }

    // 5. Cargo weight validation: Weight must not exceed maximum load capacity
    if (cargoWeightParsed > vehicle.maximum_load_capacity_kg) {
      return res.status(400).json({
        error: `Cargo weight (${cargoWeightParsed} kg) exceeds vehicle's maximum load capacity (${vehicle.maximum_load_capacity_kg} kg).`,
      });
    }

    // If starting status is "Dispatched", we apply On Trip status changes automatically
    const targetStatus = status || "Draft";
    
    // Create transaction to create trip and conditionally update statuses
    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          vehicle_id: vehicleIdParsed,
          driver_id: driverIdParsed,
          source_city,
          destination_city,
          start_date,
          cargo_weight: cargoWeightParsed,
          planned_distance: parseFloat(planned_distance),
          revenue: parseFloat(revenue) || 0.0,
          status: targetStatus,
        },
      });

      if (targetStatus === "Dispatched") {
        await tx.vehicle.update({
          where: { vehicle_id: vehicleIdParsed },
          data: { status: "On Trip" },
        });
        await tx.driver.update({
          where: { driver_id: driverIdParsed },
          data: { status: "On Trip" },
        });
      }

      return trip;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Create trip error:", error);
    res.status(500).json({ error: "Failed to dispatch/create trip." });
  }
});

// Update Trip Status (With workflow status changes!)
app.put("/api/trips/:id/status", authenticateJWT, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, actual_distance, fuel_consumed, final_odometer } = req.body;

    const trip = await prisma.trip.findUnique({
      where: { trip_id: id },
      include: { vehicle: true, driver: true },
    });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found." });
    }

    const prevStatus = trip.status;
    if (prevStatus === status) {
      return res.json(trip);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Dispatch Trip: Draft -> Dispatched
      if (status === "Dispatched") {
        if (trip.vehicle.status === "On Trip" || trip.driver.status === "On Trip") {
          throw new Error("Vehicle or Driver is already busy on another trip.");
        }
        if (trip.vehicle.status === "In Shop" || trip.vehicle.status === "Retired") {
          throw new Error("Vehicle is currently unavailable (In Shop/Retired).");
        }

        await tx.vehicle.update({
          where: { vehicle_id: trip.vehicle_id },
          data: { status: "On Trip" },
        });
        await tx.driver.update({
          where: { driver_id: trip.driver_id },
          data: { status: "On Trip" },
        });
      }

      // Complete Trip: Dispatched -> Completed
      if (status === "Completed") {
        if (!final_odometer) {
          throw new Error("Final odometer reading is required to complete trip.");
        }
        const odoParsed = parseFloat(final_odometer);
        if (odoParsed < trip.vehicle.current_odometer) {
          throw new Error(`Final odometer (${odoParsed}) cannot be less than previous odometer (${trip.vehicle.current_odometer}).`);
        }

        await tx.vehicle.update({
          where: { vehicle_id: trip.vehicle_id },
          data: {
            status: "Available",
            current_odometer: odoParsed,
          },
        });
        await tx.driver.update({
          where: { driver_id: trip.driver_id },
          data: { status: "Available" },
        });

        // Add standard Fuel Log automatically if fuel parameters are specified
        const fuelLiters = fuel_consumed ? parseFloat(fuel_consumed) : 0;
        if (fuelLiters > 0) {
          const totalCost = fuelLiters * 1.45; // Simulated price per liter
          await tx.fuelLog.create({
            data: {
              vehicle_id: trip.vehicle_id,
              trip_id: trip.trip_id,
              date: new Date().toISOString().split("T")[0],
              fuel_station: "TransitOps Hub Station",
              fuel_type: trip.vehicle.fuel_type,
              liters: fuelLiters,
              price_per_liter: 1.45,
              total_cost: totalCost,
              odometer: odoParsed,
            },
          });
        }
      }

      // Cancel Trip: Dispatched -> Cancelled (restores availability)
      if (status === "Cancelled" && prevStatus === "Dispatched") {
        await tx.vehicle.update({
          where: { vehicle_id: trip.vehicle_id },
          data: { status: "Available" },
        });
        await tx.driver.update({
          where: { driver_id: trip.driver_id },
          data: { status: "Available" },
        });
      }

      // Update the Trip itself
      const updatedTrip = await tx.trip.update({
        where: { trip_id: id },
        data: {
          status,
          actual_distance: actual_distance ? parseFloat(actual_distance) : undefined,
          fuel_consumed: fuel_consumed ? parseFloat(fuel_consumed) : undefined,
          end_date: status === "Completed" ? new Date().toISOString().split("T")[0] : undefined,
        },
      });

      return updatedTrip;
    });

    res.json(result);
  } catch (error: any) {
    console.error("Update trip status error:", error);
    res.status(400).json({ error: error.message || "Failed to update trip status." });
  }
});

// --- MAINTENANCE WORKFLOW ---

// List Logs
app.get("/api/maintenance", authenticateJWT, async (req, res) => {
  try {
    const logs = await prisma.maintenanceLog.findMany({
      include: { vehicle: true },
      orderBy: { maintenance_id: "desc" },
    });
    res.json(logs);
  } catch (error) {
    console.error("List maintenance logs error:", error);
    res.status(500).json({ error: "Failed to list maintenance records." });
  }
});

// Create Maintenance Log -> Forces vehicle to "In Shop"
app.post("/api/maintenance", authenticateJWT, async (req, res) => {
  try {
    const { vehicle_id, maintenance_type, description, start_date, cost, service_center } = req.body;

    if (!vehicle_id || !maintenance_type || !start_date || !service_center) {
      return res.status(400).json({ error: "Missing required maintenance parameters." });
    }

    const vId = parseInt(vehicle_id);

    const vehicle = await prisma.vehicle.findUnique({ where: { vehicle_id: vId } });
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found." });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Maintenance Log
      const log = await tx.maintenanceLog.create({
        data: {
          vehicle_id: vId,
          maintenance_type,
          description: description || "",
          start_date,
          cost: parseFloat(cost) || 0.0,
          status: "In Progress",
          service_center,
        },
      });

      // 2. Set vehicle status to "In Shop"
      await tx.vehicle.update({
        where: { vehicle_id: vId },
        data: { status: "In Shop" },
      });

      return log;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Create maintenance error:", error);
    res.status(500).json({ error: "Failed to register maintenance log." });
  }
});

// Close Maintenance Log -> Forces vehicle to "Available" (unless retired)
app.put("/api/maintenance/:id/complete", authenticateJWT, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { completion_date, final_cost } = req.body;

    const log = await prisma.maintenanceLog.findUnique({
      where: { maintenance_id: id },
      include: { vehicle: true },
    });

    if (!log) {
      return res.status(404).json({ error: "Maintenance log not found." });
    }

    const actualCost = final_cost ? parseFloat(final_cost) : log.cost;
    const finalDate = completion_date || new Date().toISOString().split("T")[0];

    const result = await prisma.$transaction(async (tx) => {
      // 1. Complete Maintenance Log
      const updatedLog = await tx.maintenanceLog.update({
        where: { maintenance_id: id },
        data: {
          status: "Completed",
          completion_date: finalDate,
          cost: actualCost,
        },
      });

      // 2. Change vehicle status back to Available (unless currently marked Retired)
      if (log.vehicle.status !== "Retired") {
        await tx.vehicle.update({
          where: { vehicle_id: log.vehicle_id },
          data: { status: "Available" },
        });
      }

      // 3. Log cost automatically under Expenses list as "Maintenance" type
      await tx.expense.create({
        data: {
          vehicle_id: log.vehicle_id,
          expense_type: "Maintenance",
          amount: actualCost,
          expense_date: finalDate,
          description: `Auto-recorded from completed maintenance: ${log.maintenance_type} (${log.service_center})`,
        },
      });

      return updatedLog;
    });

    res.json(result);
  } catch (error) {
    console.error("Close maintenance error:", error);
    res.status(500).json({ error: "Failed to complete maintenance log." });
  }
});

// --- FUEL & EXPENSE MANAGEMENT ---

// List Fuel Logs
app.get("/api/fuel-logs", authenticateJWT, async (req, res) => {
  try {
    const logs = await prisma.fuelLog.findMany({
      include: { vehicle: true, trip: true },
      orderBy: { fuel_log_id: "desc" },
    });
    res.json(logs);
  } catch (error) {
    console.error("List fuel logs error:", error);
    res.status(500).json({ error: "Failed to retrieve fuel logbook." });
  }
});

// Create Fuel Log
app.post("/api/fuel-logs", authenticateJWT, async (req, res) => {
  try {
    const { vehicle_id, trip_id, date, fuel_station, fuel_type, liters, price_per_liter, odometer } = req.body;

    if (!vehicle_id || !date || !liters || !price_per_liter) {
      return res.status(400).json({ error: "Missing required parameters for fuel log." });
    }

    const vId = parseInt(vehicle_id);
    const lParsed = parseFloat(liters);
    const pParsed = parseFloat(price_per_liter);
    const totalCost = lParsed * pParsed;

    const vehicle = await prisma.vehicle.findUnique({ where: { vehicle_id: vId } });
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found." });
    }

    const fuelLog = await prisma.$transaction(async (tx) => {
      const log = await tx.fuelLog.create({
        data: {
          vehicle_id: vId,
          trip_id: trip_id ? parseInt(trip_id) : null,
          date,
          fuel_station: fuel_station || "Generic Station",
          fuel_type: fuel_type || vehicle.fuel_type,
          liters: lParsed,
          price_per_liter: pParsed,
          total_cost: totalCost,
          odometer: odometer ? parseFloat(odometer) : vehicle.current_odometer,
        },
      });

      // Update vehicle's odometer if larger than current
      if (odometer && parseFloat(odometer) > vehicle.current_odometer) {
        await tx.vehicle.update({
          where: { vehicle_id: vId },
          data: { current_odometer: parseFloat(odometer) },
        });
      }

      return log;
    });

    res.status(201).json(fuelLog);
  } catch (error) {
    console.error("Create fuel log error:", error);
    res.status(500).json({ error: "Failed to record fuel logging." });
  }
});

// List Expenses
app.get("/api/expenses", authenticateJWT, async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      include: { vehicle: true, trip: true },
      orderBy: { expense_id: "desc" },
    });
    res.json(expenses);
  } catch (error) {
    console.error("List expenses error:", error);
    res.status(500).json({ error: "Failed to load expenses report." });
  }
});

// Create Expense
app.post("/api/expenses", authenticateJWT, async (req, res) => {
  try {
    const { trip_id, vehicle_id, expense_type, amount, expense_date, description } = req.body;

    if (!vehicle_id || !expense_type || !amount || !expense_date) {
      return res.status(400).json({ error: "Missing required parameters for expense logging." });
    }

    const expense = await prisma.expense.create({
      data: {
        trip_id: trip_id ? parseInt(trip_id) : null,
        vehicle_id: parseInt(vehicle_id),
        expense_type,
        amount: parseFloat(amount),
        expense_date,
        description: description || "",
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error("Create expense error:", error);
    res.status(500).json({ error: "Failed to log expense." });
  }
});

// --- REPORTS & ANALYTICS ---

app.get("/api/reports/analytics", authenticateJWT, async (req, res) => {
  try {
    const [vehicles, trips, fuelLogs, maintenanceLogs, expenses] = await Promise.all([
      prisma.vehicle.findMany(),
      prisma.trip.findMany(),
      prisma.fuelLog.findMany(),
      prisma.maintenanceLog.findMany(),
      prisma.expense.findMany(),
    ]);

    // 1. Compute total operational cost per vehicle (Fuel + Maintenance + Tolls/Allowance/etc)
    const vehicleMetrics = vehicles.map((v) => {
      const vFuelCost = fuelLogs
        .filter((l) => l.vehicle_id === v.vehicle_id)
        .reduce((sum, l) => sum + l.total_cost, 0);

      const vMaintCost = maintenanceLogs
        .filter((l) => l.vehicle_id === v.vehicle_id && l.status === "Completed")
        .reduce((sum, l) => sum + l.cost, 0);

      const vOtherExpenses = expenses
        .filter((e) => e.vehicle_id === v.vehicle_id && e.expense_type !== "Maintenance")
        .reduce((sum, e) => sum + e.amount, 0);

      const totalOpCost = vFuelCost + vMaintCost + vOtherExpenses;

      // Distance traveled
      const completedTrips = trips.filter((t) => t.vehicle_id === v.vehicle_id && t.status === "Completed");
      const totalDistance = completedTrips.reduce((sum, t) => sum + (t.actual_distance || 0), 0);
      const totalFuelLiters = completedTrips.reduce((sum, t) => sum + (t.fuel_consumed || 0), 0);

      const fuelEfficiency = totalFuelLiters > 0 ? parseFloat((totalDistance / totalFuelLiters).toFixed(2)) : 0;

      // Revenue
      const totalRevenue = trips
        .filter((t) => t.vehicle_id === v.vehicle_id && t.status === "Completed")
        .reduce((sum, t) => sum + t.revenue, 0);

      // ROI = [Revenue - (Maintenance + Fuel)] / Acquisition Cost
      const acqCost = v.acquisition_cost || 1.0; // avoid div by 0
      const roi = parseFloat((((totalRevenue - (vMaintCost + vFuelCost)) / acqCost) * 100).toFixed(2));

      return {
        vehicle_id: v.vehicle_id,
        name: v.vehicle_name,
        reg: v.registration_number,
        type: v.vehicle_type,
        distance: totalDistance,
        fuelEfficiency,
        fuelCost: vFuelCost,
        maintenanceCost: vMaintCost,
        otherCost: vOtherExpenses,
        totalOpCost,
        revenue: totalRevenue,
        roi,
      };
    });

    // 2. Average fuel efficiency per type
    const vehicleTypes = Array.from(new Set(vehicles.map((v) => v.vehicle_type)));
    const typeMetrics = vehicleTypes.map((type) => {
      const typeVehicles = vehicleMetrics.filter((m) => m.type === type);
      const totalDistance = typeVehicles.reduce((sum, m) => sum + m.distance, 0);
      const typeLogs = fuelLogs.filter((l) => {
        const vehicle = vehicles.find((v) => v.vehicle_id === l.vehicle_id);
        return vehicle && vehicle.vehicle_type === type;
      });
      const totalLiters = typeLogs.reduce((sum, l) => sum + l.liters, 0);
      const efficiency = totalLiters > 0 ? parseFloat((totalDistance / totalLiters).toFixed(2)) : 0;

      const totalCost = typeVehicles.reduce((sum, m) => sum + m.totalOpCost, 0);
      const revenue = typeVehicles.reduce((sum, m) => sum + m.revenue, 0);

      return {
        type,
        efficiency,
        operationalCost: totalCost,
        revenue,
      };
    });

    // 3. Monthly expenses and trips chart data
    const monthlyData: { [key: string]: { month: string; cost: number; revenue: number; trips: number } } = {};
    
    // Aggregate completed trip revenues
    trips.forEach((t) => {
      if (t.status === "Completed" && t.end_date) {
        const month = t.end_date.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { month, cost: 0, revenue: 0, trips: 0 };
        }
        monthlyData[month].revenue += t.revenue;
        monthlyData[month].trips += 1;
      }
    });

    // Aggregate fuel costs
    fuelLogs.forEach((l) => {
      const month = l.date.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { month, cost: 0, revenue: 0, trips: 0 };
      }
      monthlyData[month].cost += l.total_cost;
    });

    // Aggregate other expenses
    expenses.forEach((e) => {
      const month = e.expense_date.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { month, cost: 0, revenue: 0, trips: 0 };
      }
      monthlyData[month].cost += e.amount;
    });

    const monthlyChart = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    // Global totals
    const totalRevenue = vehicleMetrics.reduce((sum, m) => sum + m.revenue, 0);
    const totalFuelCost = fuelLogs.reduce((sum, l) => sum + l.total_cost, 0);
    const totalMaintenanceCost = maintenanceLogs.reduce((sum, l) => sum + l.cost, 0);
    const totalOtherExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalOperationalCost = totalFuelCost + totalMaintenanceCost + totalOtherExpenses;

    res.json({
      global: {
        revenue: totalRevenue,
        operationalCost: totalOperationalCost,
        fuelCost: totalFuelCost,
        maintenanceCost: totalMaintenanceCost,
        otherCost: totalOtherExpenses,
        profit: totalRevenue - totalOperationalCost,
      },
      vehicles: vehicleMetrics,
      types: typeMetrics,
      monthlyChart,
    });
  } catch (error) {
    console.error("Analytics calculations error:", error);
    res.status(500).json({ error: "Failed to generate business reports." });
  }
});

// --- FRONTEND INTEGRATION & VITE HANDLERS ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
