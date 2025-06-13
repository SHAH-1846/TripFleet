const mongoose = require('mongoose');
const dotenv = require('dotenv');
const VehicleType = require('../models/vehicle_types');

dotenv.config();
const MONGO_URI = process.env.MONGODB_URI;

const vehicleTypes = [
  {
    _id: '684aa71cb88048daeaebff8a',
    name: 'Bike',
    description: 'Two-wheeler suitable for light parcel delivery',
    status: 'active',
  },
  {
    _id: '684aa728b88048daeaebff8b',
    name: 'Car',
    description: 'Four-wheeler for medium-sized deliveries or ride-sharing',
    status: 'active',
  },
  {
    _id: '684aa733b88048daeaebff8c',
    name: 'Truck',
    description: 'Heavy-duty transport vehicle for goods and cargo',
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
    await VehicleType.insertMany(vehicleTypes);
    console.log('✅ Vehicle types seeded successfully.');
  } catch (error) {
    console.error('❌ Error seeding vehicle types:', error);
  } finally {
    mongoose.connection.close();
  }
}

async function down() {
  try {
    await connectDB();
    const names = vehicleTypes.map((type) => type.name);
    await VehicleType.deleteMany({ name: { $in: names } });
    console.log('✅ Vehicle types rollback successful.');
  } catch (error) {
    console.error('❌ Error rolling back vehicle types:', error);
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
