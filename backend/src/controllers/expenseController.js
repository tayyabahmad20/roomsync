import { validationResult } from 'express-validator';

import { Expense } from '../models/Expense.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';

import {
  computeNetBalances,
  computeSettlementTransfers,
} from '../services/settlementService.js';

export async function createExpense(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400);
      return res.json({ errors: errors.array() });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      return res.json({ message: 'User not found' });
    }
    if (!user.roomId) {
      res.status(400);
      return res.json({ message: 'Join a room before adding expenses' });
    }

    const room = await Room.findById(user.roomId);
    if (!room) {
      res.status(404);
      return res.json({ message: 'Room not found' });
    }

    const { description, amount, category, paidBy } = req.body;

    // Only allow paidBy to be a member of this room.
    const payerId = paidBy || user._id;
    const payerIsMember = room.members.some((m) => String(m) === String(payerId));
    if (!payerIsMember) {
      res.status(400);
      return res.json({ message: 'paidBy must be a member of your room' });
    }

    // Equal split among current members.
    const splitAmong = room.members;

    const expense = await Expense.create({
      roomId: room._id,
      description,
      amount,
      category,
      paidBy: payerId,
      splitAmong,
    });

    return res.status(201).json({ expense });
  } catch (err) {
    return next(err);
  }
}

export async function listExpenses(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      return res.json({ message: 'User not found' });
    }
    if (!user.roomId) {
      return res.json({ expenses: [] });
    }

    const expenses = await Expense.find({ roomId: user.roomId })
      .sort({ createdAt: -1 })
      .populate('paidBy', 'name email')
      .lean();

    return res.json({ expenses });
  } catch (err) {
    return next(err);
  }
}

export async function deleteExpense(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      return res.json({ message: 'User not found' });
    }
    if (!user.roomId) {
      res.status(400);
      return res.json({ message: 'You are not in a room' });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      res.status(404);
      return res.json({ message: 'Expense not found' });
    }

    if (String(expense.roomId) !== String(user.roomId)) {
      res.status(403);
      return res.json({ message: 'Forbidden' });
    }

    await expense.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function getSettlement(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      return res.json({ message: 'User not found' });
    }
    if (!user.roomId) {
      return res.json({ room: null, balances: [], transfers: [] });
    }

    const room = await Room.findById(user.roomId).populate('members', 'name email');
    if (!room) {
      res.status(404);
      return res.json({ message: 'Room not found' });
    }

    const expenses = await Expense.find({ roomId: room._id }).lean();

    const balances = computeNetBalances({ roomMembers: room.members, expenses });
    const transfers = computeSettlementTransfers(balances);

    return res.json({
      room: { id: room._id, name: room.name, roomCode: room.roomCode },
      balances,
      transfers,
    });
  } catch (err) {
    return next(err);
  }
}
