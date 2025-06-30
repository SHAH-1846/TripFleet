const mongoose = require("mongoose");
const { trim } = require("validator");

const otp = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, trim : true },
    otp: { type: String, required: true, trim : true },
    verified: { type: Boolean, default: false },
  },
  { collection: "otp", timestamps: true }
);

module.exports = mongoose.model("otp", otp);
