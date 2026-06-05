import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    password: { type: String, required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", default: null }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
