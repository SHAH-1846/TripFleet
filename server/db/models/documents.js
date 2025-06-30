const mongoose = require("mongoose");

const documents = new mongoose.Schema({
  filename: String,
  path: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  type: {
    type: String, // e.g. "ID", "License", "Certificate"
  },
}, {
  timestamps: true,
  collection: "documents"
});

module.exports = mongoose.model("documents", documents);
