const mongoose = require("mongoose");

const images = new mongoose.Schema({
  filename: { type: String, required: true },
  path: { type: String, required: true },
  url: { type: String }, // optional public URL
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" }, // optional
},{
    timestamps : true,
});

module.exports = mongoose.model("images", images);
