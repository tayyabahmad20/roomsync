import mongoose from 'mongoose';

const choreRotationStateSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      unique: true,
      index: true,
    },
    // Used to rotate member assignments in a stable way.
    nextAssigneeIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Prevents rotating multiple times within the same period.
    lastRotatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const ChoreRotationState = mongoose.model('ChoreRotationState', choreRotationStateSchema);
