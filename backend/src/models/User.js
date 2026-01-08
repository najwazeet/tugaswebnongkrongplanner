const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, lowercase: true },

    // untuk user login biasa (email+password)
    passwordHash: { type: String },

    // untuk user login Google
    googleId: { type: String, index: true },
    name: String,
    photo: String,

    // Notification preferences
    emailNotifications: {
      enabled: { type: Boolean, default: true },
      reminderH3: { type: Boolean, default: true }, // H-3 event
      reminderH1: { type: Boolean, default: true }, // H-1 event
      eventUpdates: { type: Boolean, default: true }, // perubahan event
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
