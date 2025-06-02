const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function connect() {
    await mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log("Database connection established");
        })
        .catch((error) => {
            console.log("Database connection failed");
            console.log("Err : ", error);
        })
}

function close() {
    mongoose.disconnect();
}

module.exports = {
    connect,
    close
}