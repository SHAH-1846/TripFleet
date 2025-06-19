const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
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
