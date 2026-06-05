import express from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { Expense } from "../models/Expense.js";
import { Room } from "../models/Room.js";
import { computeSettlement } from "../utils/settlement.js";

export const expenseRouter = express.Router();

const createExpenseSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  category: z.string().max(60).optional()
});

/**
 * Helper: fetch the current room (with members) for the authenticated user.
 */
async function getUserRoomOrThrow(user) {
  if (!user.roomId) throw new ApiError(400, "You are not in a room");
  const room = await Room.findById(user.roomId).populate("members", "name email");
  if (!room) throw new ApiError(404, "Room not found");
  return room;
}

// POST /api/expenses
// Adds an expense paid by the authenticated user, split equally among all current room members.
expenseRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Invalid expense input", parsed.error.flatten());

    const room = await getUserRoomOrThrow(req.user);
    if (!room.members?.length) throw new ApiError(409, "Room has no members");

    const splitAmong = room.members.map((m) => m._id);

    const expense = await Expense.create({
      roomId: room._id,
      description: parsed.data.description,
      amount: parsed.data.amount,
      category: parsed.data.category ?? "General",
      paidBy: req.user._id,
      splitAmong,
      date: new Date()
    });

    res.status(201).json({ ok: true, expense });
  })
);

// GET /api/expenses
// List expenses for the authenticated user's room.
expenseRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const room = await getUserRoomOrThrow(req.user);

    const expenses = await Expense.find({ roomId: room._id })
      .sort({ date: -1 })
      .populate("paidBy", "name email")
      .populate("splitAmong", "name email");

    res.json({ ok: true, expenses });
  })
);

// DELETE /api/expenses/:id
// Simple authorization: allow delete if requester is the payer.
expenseRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const room = await getUserRoomOrThrow(req.user);

    const expense = await Expense.findOne({ _id: req.params.id, roomId: room._id });
    if (!expense) throw new ApiError(404, "Expense not found");

    if (String(expense.paidBy) !== String(req.user._id)) {
      throw new ApiError(403, "Only the payer can delete this expense");
    }

    await Expense.deleteOne({ _id: expense._id });

    res.json({ ok: true });
  })
);

// GET /api/expenses/settlement
// Returns net balances and simplified transfers (who owes whom).
expenseRouter.get(
  "/settlement",
  requireAuth,
  asyncHandler(async (req, res) => {
    const room = await getUserRoomOrThrow(req.user);

    const expenses = await Expense.find({ roomId: room._id }).sort({ date: 1 });

    const settlement = computeSettlement({
      members: room.members.map((m) => ({ id: String(m._id), name: m.name })),
      expenses: expenses.map((e) => ({
        amount: e.amount,
        paidBy: String(e.paidBy),
        splitAmong: e.splitAmong.map((u) => String(u))
      }))
    });

    res.json({ ok: true, settlement });
  })
);
