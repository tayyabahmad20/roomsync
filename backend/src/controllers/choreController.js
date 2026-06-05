import { validationResult } from 'express-validator';

import { Chore } from '../models/Chore.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';

import {
  rotateRoomChores,
  rotateDueChores,
} from '../services/choreRotationService.js';

export async function listChores(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      return res.json({ message: 'User not found' });
    }
    if (!user.roomId) {
      return res.json({ chores: [] });
    }

    const chores = await Chore.find({ roomId: user.roomId })
      .sort({ dueDate: 1, createdAt: -1 })
      .populate('assignedTo', 'name email')
      .lean();

    return res.json({ chores });
  } catch (err) {
    return next(err);
  }
}

export async function createChore(req, res, next) {
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
      return res.json({ message: 'Join a room before adding chores' });
    }

    const room = await Room.findById(user.roomId);
    if (!room) {
      res.status(404);
      return res.json({ message: 'Room not found' });
    }

    const { taskName, assignedTo, dueDate } = req.body;

    const assigneeId = assignedTo || user._id;
    const assigneeIsMember = room.members.some((m) => String(m) === String(assigneeId));
    if (!assigneeIsMember) {
      res.status(400);
      return res.json({ message: 'assignedTo must be a member of your room' });
    }

    const chore = await Chore.create({
      roomId: room._id,
      taskName,
      assignedTo: assigneeId,
      dueDate,
      status: 'Pending',
    });

    return res.status(201).json({ chore });
  } catch (err) {
    return next(err);
  }
}

export async function updateChoreStatus(req, res, next) {
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
      return res.json({ message: 'You are not in a room' });
    }

    const chore = await Chore.findById(req.params.id);
    if (!chore) {
      res.status(404);
      return res.json({ message: 'Chore not found' });
    }

    if (String(chore.roomId) !== String(user.roomId)) {
      res.status(403);
      return res.json({ message: 'Forbidden' });
    }

    chore.status = req.body.status;
    await chore.save();

    return res.json({ chore });
  } catch (err) {
    return next(err);
  }
}

export async function rotateChoresNow(req, res, next) {
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
      return res.json({ message: 'You are not in a room' });
    }

    const { scope } = req.body;
    if (scope === 'room') {
      const result = await rotateRoomChores(user.roomId);
      return res.json({ ok: true, result });
    }

    // Default: rotate any due chores globally (admin-ish). Still safe for prototype.
    const result = await rotateDueChores();
    return res.json({ ok: true, result });
  } catch (err) {
    return next(err);
  }
}
