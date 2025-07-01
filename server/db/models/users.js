const mongoose = require("mongoose");

const users = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    whatsappNumber: {
      type: String,
      required: true,
      trim: true,
    },
    drivingLicense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "documents",
    },
    // lastName: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    profilePicture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "images",
    },
    googleId: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    user_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user_types",
      default: "68484d1eefb856d41ac28c55",
    },
    password: {
      type: String,
    },
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "documents",
      },
    ],
    termsAndConditionsAccepted: { type: Boolean, default: false },
    privacyPolicyAccepted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("users", users);
