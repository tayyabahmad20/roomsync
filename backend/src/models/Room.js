import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    maxMembers: {
      type: Number,
      default: 6,
      min: 2,
      max: 10,
    },
  },
  { timestamps: true }
);

export const Room = mongoose.model('Room', roomSchema);
