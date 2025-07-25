const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cron = require("node-cron");
const dotenv = require("dotenv");
const db = require("./db/config");
const users = require("./db/models/users");
const fetchDisposableEmailDomains = require("./validations/email-validations/fetchDisposableDomains");
const cleanupUploads = require("./utils/cleanupOrphanedFiles");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const tripRoutes = require("./routes/tripRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const customerRequestRoutes = require("./routes/customerRequestRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const imageRoutes = require("./routes/imageRoutes");
const documentRoutes = require("./routes/documentRoutes");
const passport = require("passport");
const session = require("express-session");
const path = require("path");
require("./utils/config/passport");

/* CONFIGURATIONS */
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "100mb" }));

//DB Connection
db.connect();

//Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

/* Initialize Passport */
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await users.findById(id);
  done(null, user);
});

/* ROUTES */
app.get("/", (req, res) => {
  res.send("This is Home Route");
});

app.use("/uploads", express.static("uploads"));
app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/trips", tripRoutes);
app.use("/vehicles", vehicleRoutes);
app.use("/customer-requests", customerRequestRoutes);
app.use("/bookings", bookingRoutes);
app.use("/images", imageRoutes);
app.use("/documents", documentRoutes);

//Running cron at startup
fetchDisposableEmailDomains();

// 🕛 Schedule: Every day at midnight
cron.schedule("0 0 * * *", () => {
  console.log("[CRON] Updating disposable email domains...");
  fetchDisposableEmailDomains();
});

// 🕛 Schedule: Every day at midnight
// cleanupUploads();
cron.schedule("0 0 * * *", () => {
  console.log("[CRON] Starting cleanup task...");
  cleanupUploads();
});

const PORT = Number(process.env.PORT) || 3002;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
