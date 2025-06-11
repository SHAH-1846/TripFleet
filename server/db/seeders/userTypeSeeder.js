// seeders/userTypeSeeder.js
const mongoose = require('mongoose');
const UserType = require('../models/user_types');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI; // Replace with actual DB URI

const userTypes = [
  {
  "_id": "68484d1eefb856d41ac28c54",
  "name": "admin",
  "description": "admin role",
  "isActive": true,
},
  {
  "_id": "68484d1eefb856d41ac28c55",
  "name": "customer",
  "description": "customer role",
  "isActive": true,
},
  {
  "_id": "68484d1eefb856d41ac28c56",
  "name": "driver",
  "description": "driver role",
  "isActive": true,
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

    await UserType.insertMany(userTypes);
    console.log('✅ User types seeded successfully');
  } catch (err) {
    console.error('❌ Error seeding user types:', err);
  } finally {
    mongoose.connection.close();
  }
}

async function down() {
  try {
    await connectDB();
    console.log('Connected to MongoDB for rollback');

    const names = userTypes.map((type) => type.name);
    await UserType.deleteMany({ name: { $in: names } });
    console.log('✅ User types rollback successful');
  } catch (err) {
    console.error('❌ Error rolling back user types:', err);
  } finally {
    mongoose.connection.close();
  }
}

// CLI-based action
const action = process.argv[2]; // node userTypeSeeder.js up OR down

if (action === 'up') up();
else if (action === 'down') down();
else {
  console.log('❗ Please provide a valid action: up or down');
  process.exit(1);
}
