const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
const CustomerRequestStatus = require("../models/customer_request_status");

// Sample customer request statuses
const customerRequestStatuses = [
  {
    _id: "684da101412825ef8b404711",
    name: "open",
    description: "Request created, waiting for processing"
  },
  {
    _id: "684da120412825ef8b404712",
    name: "pending",
    description: "Pending matching with a trip"
  },
  {
    _id: "684da129412825ef8b404713",
    name: "active",
    description: "Currently active and visible for matching"
  },
  {
    _id: "684da132412825ef8b404714",
    name: "matched",
    description: "Matched with a trip"
  },
  {
    _id: "684da13e412825ef8b404715",
    name: "picked_up",
    description: "Package picked up by driver"
  },
  {
    _id: "684da149412825ef8b404716",
    name: "delivered",
    description: "Package successfully delivered"
  },
  {
    _id: "684da154412825ef8b404717",
    name: "cancelled",
    description: "Request was cancelled by customer or system"
  }
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
    await CustomerRequestStatus.insertMany(customerRequestStatuses);
    console.log("✅ Customer request statuses seeded successfully.");
  } catch (error) {
    console.error("❌ Error seeding customer request statuses:", error);
  } finally {
    mongoose.connection.close();
  }
}

async function down() {
  try {
    await connectDB();
    const ids = customerRequestStatuses.map((status) => status._id);
    await CustomerRequestStatus.deleteMany({ _id: { $in: ids } });
    console.log("✅ Customer request statuses rollback successful.");
  } catch (error) {
    console.error("❌ Error rolling back customer request statuses:", error);
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
