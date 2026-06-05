import { nanoid } from 'nanoid';
import { validationResult } from 'express-validator';

import { Room } from '../models/Room.js';
import { User } from '../models/User.js';

function generateRoomCode() {
  // Short, human-friendly room code (e.g., "AB12CD").
  return nanoid(8).toUpperCase();
}

export async function createRoom(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400);
      return res.json({ errors: errors.array() });
    }

    const { name, maxMembers } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      return res.json({ message: 'User not found' });
    }
    if (user.roomId) {
      res.status(400);
      return res.json({ message: 'You are already in a room. Leave it before creating a new one.' });
    }

    // Ensure uniqueness; retry a few times.
    let roomCode = generateRoomCode();
    for (let i = 0; i < 5; i += 1) {
      const exists = await Room.findOne({ roomCode });
      if (!exists) break;
      roomCode = generateRoomCode();
    }

    const room = await Room.create({
      name,
      roomCode,
      members: [user._id],
      maxMembers: maxMembers ?? 6,
    });

    user.roomId = room._id;
    await user.save();

    return res.status(201).json({ room });
  } catch (err) {
    return next(err);
  }
}

export async function joinRoom(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400);
      return res.json({ errors: errors.array() });
    }

    const { roomCode } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      return res.json({ message: 'User not found' });
    }
    if (user.roomId) {
      res.status(400);
      return res.json({ message: 'You are already in a room. Leave it before joining another.' });
    }

    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    if (!room) {
      res.status(404);
      return res.json({ message: 'Room not found for that code' });
    }

    if (room.members.length >= room.maxMembers) {
      res.status(400);
      return res.json({ message: 'Room is full' });
    }

    room.members.push(user._id);
    await room.save();

    user.roomId = room._id;
    await user.save();

    return res.json({ room });
  } catch (err) {
    return next(err);
  }
}

export async function getMyRoom(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      return res.json({ message: 'User not found' });
    }
    if (!user.roomId) {
      return res.json({ room: null });
    }

    const room = await Room.findById(user.roomId).populate('members', 'name email roomId');
    return res.json({ room });
  } catch (err) {
    return next(err);
  }
}
