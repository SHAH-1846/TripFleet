const mongoose = require('mongoose');
const dotenv = require('dotenv');
const VehicleBodyType = require('../models/vehicle_body_types');

dotenv.config();
const MONGO_URI = process.env.MONGODB_URI;

const vehicleBodyTypes = [
  {
    _id: '685ea11cf883dfb6dcf0b900',
    name: 'Open Body',
    description: 'Suitable for transporting large or oversized items with no roof.',
    status: 'active',
  },
  {
    _id: '685ea13cf883dfb6dcf0b901',
    name: 'Closed Body',
    description: 'Enclosed body for weather-sensitive goods.',
    status: 'active',
  },
  {
    _id: '685ea14df883dfb6dcf0b902',
    name: 'Container',
    description: 'Used for long-distance transport of sealed containerized cargo.',
    status: 'active',
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
    await VehicleBodyType.insertMany(vehicleBodyTypes);
    console.log('✅ Vehicle body types seeded successfully.');
  } catch (error) {
    console.error('❌ Error seeding vehicle body types:', error);
  } finally {
    mongoose.connection.close();
  }
}

async function down() {
  try {
    await connectDB();
    const names = vehicleBodyTypes.map((type) => type.name);
    await VehicleBodyType.deleteMany({ name: { $in: names } });
    console.log('✅ Vehicle body types rollback successful.');
  } catch (error) {
    console.error('❌ Error rolling back vehicle body types:', error);
  } finally {
    mongoose.connection.close();
  }
}

const action = process.argv[2];

if (action === 'up') up();
else if (action === 'down') down();
else {
  console.log('❗ Please specify "up" or "down" as an argument.');
  process.exit(1);
}
