const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/users');
const dotenv = require('dotenv');
dotenv.config();
const MONGO_URI = process.env.MONGODB_URI;

const adminUsers = [
{
  "_id": "684abe80b88048daeaebffa0",
  "firstName": "Robert",
  "lastName": "Doe",
  "email": "robert@gmail.com",
  "user_type": "68484d1eefb856d41ac28c54",
  "password": "Robert#123",
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

    // Hash passwords before seeding
    for (let admin of adminUsers) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(admin.password, salt);
    }

    await User.insertMany(adminUsers);
    console.log('✅ Admin user(s) seeded successfully.');
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
  } finally {
    mongoose.connection.close();
  }
}

async function down() {
  try {
    await connectDB();
    const emails = adminUsers.map((admin) => admin.email);
    await User.deleteMany({ email: { $in: emails } });
    console.log('✅ Admin user rollback successful.');
  } catch (error) {
    console.error('❌ Error rolling back admin user:', error);
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
