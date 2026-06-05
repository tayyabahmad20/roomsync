import express from "express";
import { z } from "zod";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { requireAuth } from "../middleware/auth.js";
import { Room } from "../models/Room.js";
import { User } from "../models/User.js";
import { generateRoomCode } from "../utils/roomCode.js";

export const roomRouter = express.Router();

const createRoomSchema = z.object({
  name: z.string().min(2).max(80),
  maxMembers: z.number().int().min(2).max(6).optional()
});

const joinRoomSchema = z.object({
  roomCode: z.string().min(3).max(20)
});

roomRouter.post(
  "/create",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = createRoomSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Invalid room input", parsed.error.flatten());

    if (req.user.roomId) throw new ApiError(409, "You are already in a room");

    let roomCode = generateRoomCode();
    for (let i = 0; i < 5; i++) {
      const exists = await Room.findOne({ roomCode });
      if (!exists) break;
      roomCode = generateRoomCode();
    }

    const room = await Room.create({
      name: parsed.data.name,
      roomCode,
      members: [req.user._id]
    });

    await User.findByIdAndUpdate(req.user._id, { roomId: room._id });

    res.status(201).json({
      ok: true,
      room: {
        id: room._id,
        name: room.name,
        roomCode: room.roomCode,
        membersCount: room.members.length
      }
    });
  })
);

roomRouter.post(
  "/join",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = joinRoomSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Invalid join input", parsed.error.flatten());

    if (req.user.roomId) throw new ApiError(409, "You are already in a room");

    const room = await Room.findOne({ roomCode: parsed.data.roomCode });
    if (!room) throw new ApiError(404, "Room not found");

    const maxMembers = 6;
    if (room.members.length >= maxMembers) throw new ApiError(409, "Room is full");

    const already = room.members.some((m) => String(m) === String(req.user._id));
    if (!already) {
      room.members.push(req.user._id);
      await room.save();
    }

    await User.findByIdAndUpdate(req.user._id, { roomId: room._id });

    res.json({
      ok: true,
      room: {
        id: room._id,
        name: room.name,
        roomCode: room.roomCode,
        membersCount: room.members.length
      }
    });
  })
);

roomRouter.get(
  "/current",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user.roomId) throw new ApiError(404, "You are not in a room");

    const room = await Room.findById(req.user.roomId).populate("members", "name email roomId");
    if (!room) throw new ApiError(404, "Room not found");

    res.json({
      ok: true,
      room: {
        id: room._id,
        name: room.name,
        roomCode: room.roomCode,
        members: room.members
      }
    });
  })
);
