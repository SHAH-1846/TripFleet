const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cron = require("node-cron");
const dotenv = require("dotenv");
const db = require("./db/config");
const fetchDisposableEmailDomains = require("./validations/email-validation/fetchDisposableDomains");
const userRoutes = require("./routes/userRoutes");

/* CONFIGURATIONS */
dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ extended: false, limit: "100mb" }));
app.use(cors());

//DB Connection
db.connect();

/* ROUTES */
app.get("/", (req, res) => {
  res.send("This is Home Route");
});

app.use("/users", userRoutes);

//Running cron at startup
fetchDisposableEmailDomains();

// Schedule: Every day at midnight
cron.schedule("0 0 * * *", () => {
  console.log("[CRON] Updating disposable email domains...");
  fetchDisposableEmailDomains();
});

const PORT = Number(process.env.PORT) || 3002;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
