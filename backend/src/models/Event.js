const mongoose = require("mongoose");

const DateOptionSchema = new mongoose.Schema(
  { iso: { type: String, required: true }, createdBy: String },
  { _id: true }
);

const LocationOptionSchema = new mongoose.Schema(
  { label: { type: String, required: true }, createdBy: String },
  { _id: true }
);

const MemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true }, // bisa username/email prefix
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const MessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    memberId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    text: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const BillItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    cost: { type: Number, required: true },
    assigneeMemberId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { _id: true }
);

const BillSchema = new mongoose.Schema(
  {
    total: { type: Number, default: 0 },
    splitMode: { type: String, enum: ["EVEN", "ITEM"], default: "EVEN" },
    items: { type: [BillItemSchema], default: [] },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true, index: true },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: { type: String, required: true },
    description: { type: String, default: "" },

    deadline: { type: String, default: null }, // simpan "YYYY-MM-DD" biar simple
    status: {
      type: String,
      enum: ["POLLING", "FINAL", "ENDED"],
      default: "POLLING",
    },

    finalDateTime: { type: String, default: null }, // iso string
    finalLocation: { type: String, default: null },

    members: { type: [MemberSchema], default: [] },

    dateOptions: { type: [DateOptionSchema], default: [] },
    locationOptions: { type: [LocationOptionSchema], default: [] },

    // votes: mapping memberId -> optionId
    votes: {
      date: { type: Map, of: String, default: {} },
      location: { type: Map, of: String, default: {} },
    },

    messages: { type: [MessageSchema], default: [] },
    bill: { type: BillSchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
