const mongoose = require('mongoose');
const BookingStatus = require('../models/booking_status');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

const bookingStatuses = [
  {
    _id: "685084f96bd3cba167bd01a1",
    name: "pending",
    description: "Awaiting confirmation",
    isActive: true,
  },
  {
    _id: "685084f96bd3cba167bd01a2",
    name: "active",
    description: "Booking is active and ongoing",
    isActive: true,
  },
  {
    _id: "685084f96bd3cba167bd01a3",
    name: "pickedUp",
    description: "Package has been picked up",
    isActive: true,
  },
  {
    _id: "685084f96bd3cba167bd01a4",
    name: "delivered",
    description: "Package delivered to destination",
    isActive: true,
  },
  {
    _id: "685084f96bd3cba167bd01a5",
    name: "confirmed",
    description: "Booking is confirmed",
    isActive: true,
  },
  {
    _id: "685084f96bd3cba167bd01a6",
    name: "cancelled",
    description: "Booking was cancelled",
    isActive: true,
  },
  {
    _id: "685084f96bd3cba167bd01a7",
    name: "completed",
    description: "Booking completed successfully",
    isActive: true,
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
    console.log('Connected to MongoDB for seeding');

    await BookingStatus.insertMany(bookingStatuses);
    console.log('✅ Booking statuses seeded successfully');
  } catch (err) {
    console.error('❌ Error seeding booking statuses:', err);
  } finally {
    mongoose.connection.close();
  }
}

async function down() {
  try {
    await connectDB();
    console.log('Connected to MongoDB for rollback');

    const names = bookingStatuses.map((status) => status.name);
    await BookingStatus.deleteMany({ name: { $in: names } });
    console.log('✅ Booking statuses rollback successful');
  } catch (err) {
    console.error('❌ Error rolling back booking statuses:', err);
  } finally {
    mongoose.connection.close();
  }
}

const action = process.argv[2]; // node bookingStatusSeeder.js up OR down

if (action === 'up') up();
else if (action === 'down') down();
else {
  console.log('❗ Please provide a valid action: up or down');
  process.exit(1);
}
