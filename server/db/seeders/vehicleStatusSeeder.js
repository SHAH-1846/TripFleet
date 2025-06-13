const mongoose = require("mongoose");
const dotenv = require("dotenv");
const VehicleStatus = require("../models/vehicle_status");

dotenv.config();
const MONGO_URI = process.env.MONGODB_URI;

const vehicleStatuses = [
  {
    _id: "684bbcb5a9dcd0556d12b2a5",
    name: "Available",
    description: "Ready and available for use",
  },
  {
    _id: "684bbcc2a9dcd0556d12b2a6",
    name: "In Use",
    description: "Currently assigned to a trip",
  },
  {
    _id: "684bbcd2a9dcd0556d12b2a7",
    name: "Under Maintenance",
    description: "Temporarily out of service for repairs",
  },
  {
    _id: "684bbce0a9dcd0556d12b2a8",
    name: "Unavailable",
    description: "Not available for use at this time",
  },
];

async function connectDB() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

async function up() {
  try {
    await connectDB();
    await VehicleStatus.insertMany(vehicleStatuses);
    console.log("✅ Vehicle statuses seeded successfully.");
  } catch (error) {
    console.error("❌ Error seeding vehicle statuses:", error);
  } finally {
    mongoose.connection.close();
  }
}

async function down() {
  try {
    await connectDB();
    const names = vehicleStatuses.map((status) => status.name);
    await VehicleStatus.deleteMany({ name: { $in: names } });
    console.log("✅ Vehicle statuses rollback successful.");
  } catch (error) {
    console.error("❌ Error rolling back vehicle statuses:", error);
  } finally {
    mongoose.connection.close();
  }
}

// CLI entry
const action = process.argv[2];

if (action === "up") up();
else if (action === "down") down();
else {
  console.log('❗ Please specify "up" or "down" as an argument.');
  process.exit(1);
}
