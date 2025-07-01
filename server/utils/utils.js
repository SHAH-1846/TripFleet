const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const fs = require("fs");
const path = require("path");
dotenv.config();

// Middleware to extract user_id from token
exports.extractUserIdFromToken = (req) => {
  const authHeader = req.headers["authorization"] || null;
  const token = authHeader ? authHeader.split(" ")[1] : null;
  if (!token || token === "null" || token === "undefined") return null;

  try {
    const decoded = jwt.verify(token, process.env.PRIVATE_KEY);
    return decoded.user_id;
  } catch (err) {
    return null;
  }
};

exports.extractIdFromToken = (req) => {
  const authHeader = req.headers["authorization"] || null;
  const token = authHeader ? authHeader.split(" ")[1] : null;
  if (!token || token === "null" || token === "undefined") return null;

  try {
    const decoded = jwt.verify(token, process.env.PRIVATE_KEY);
    return decoded.id;
  } catch (err) {
    return null;
  }
};


exports.deleteFile = function (relativePath) {
  try {
    const fullPath = path.join(__dirname, "..", relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlink(fullPath, (err) => {
        if (err) console.error("❌ Failed to delete file:", fullPath, err);
      });
    }
  } catch (error) {
    console.error("❌ Error deleting file:", error);
  }
}


