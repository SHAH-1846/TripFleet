const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
const TripStatus = require('../models/trip_status');

// Sample trip statuses
const tripStatuses = [
{
  "_id": "684942f5ff32840ef8e726f0",
  "name": "scheduled",
  "description": "scheduled status",
  "isActive": true,
},
{
  "_id": "684942f5ff32840ef8e726f1",
  "name": "started",
  "description": "started status",
  "isActive": true,
},
{
  "_id": "684942f5ff32840ef8e726ef",
  "name": "completed",
  "description": "completed status",
  "isActive": true,
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
    await TripStatus.insertMany(tripStatuses);
    console.log('✅ Trip statuses seeded successfully.');
  } catch (error) {
    console.error('❌ Error seeding trip statuses:', error);
  } finally {
    mongoose.connection.close();
  }
}

async function down() {
  try {
    await connectDB();
    const ids = tripStatuses.map((status) => status._id);
    await TripStatus.deleteMany({ _id: { $in: ids } });
    console.log('✅ Trip statuses rollback successful.');
  } catch (error) {
    console.error('❌ Error rolling back trip statuses:', error);
  } finally {
    mongoose.connection.close();
  }
}

// CLI entry
const action = process.argv[2];

if (action === 'up') up();
else if (action === 'down') down();
else {
  console.log('❗ Please specify "up" or "down" as an argument.');
  process.exit(1);
}
