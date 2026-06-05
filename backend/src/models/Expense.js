import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
      maxlength: 60,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    splitAmong: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const Expense = mongoose.model('Expense', expenseSchema);
