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
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
