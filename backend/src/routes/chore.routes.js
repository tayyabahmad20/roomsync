import express from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { Chore } from "../models/Chore.js";
import { Room } from "../models/Room.js";

export const choreRouter = express.Router();

const createChoreSchema = z.object({
  taskName: z.string().min(2).max(120),
  dueDate: z.string().datetime().optional() // ISO string
});

const updateStatusSchema = z.object({
  status: z.enum(["Pending", "Completed"])
});

async function getUserRoomOrThrow(user) {
  if (!user.roomId) throw new ApiError(400, "You are not in a room");
  const room = await Room.findById(user.roomId).populate("members", "name email");
  if (!room) throw new ApiError(404, "Room not found");
  return room;
}

// POST /api/chores
// Create a chore. By default assign to the first member (or requester if present in list).
choreRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = createChoreSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Invalid chore input", parsed.error.flatten());

    const room = await getUserRoomOrThrow(req.user);
    if (!room.members?.length) throw new ApiError(409, "Room has no members");

    const requesterInMembers = room.members.find((m) => String(m._id) === String(req.user._id));
    const assignedTo = (requesterInMembers ?? room.members[0])._id;

    const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const chore = await Chore.create({
      roomId: room._id,
      taskName: parsed.data.taskName,
      assignedTo,
      dueDate,
      status: "Pending"
    });

    res.status(201).json({ ok: true, chore });
  })
);

// GET /api/chores
choreRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const room = await getUserRoomOrThrow(req.user);

    const chores = await Chore.find({ roomId: room._id })
      .sort({ dueDate: 1 })
      .populate("assignedTo", "name email");

    res.json({ ok: true, chores });
  })
);

// PATCH /api/chores/:id/status
choreRouter.patch(
  "/:id/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Invalid status input", parsed.error.flatten());

    const room = await getUserRoomOrThrow(req.user);

    const chore = await Chore.findOne({ _id: req.params.id, roomId: room._id });
    if (!chore) throw new ApiError(404, "Chore not found");

    chore.status = parsed.data.status;
    await chore.save();

    res.json({ ok: true, chore });
  })
);

// POST /api/chores/rotate
// Manual rotation: reassign each chore to the next member in the room member list.
choreRouter.post(
  "/rotate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const room = await getUserRoomOrThrow(req.user);
    if (room.members.length < 2) throw new ApiError(409, "Need at least 2 members to rotate chores");

    const memberIds = room.members.map((m) => String(m._id));
    const chores = await Chore.find({ roomId: room._id });

    const updates = [];

    for (const chore of chores) {
      const idx = memberIds.indexOf(String(chore.assignedTo));
      const nextIdx = idx === -1 ? 0 : (idx + 1) % memberIds.length;
      chore.assignedTo = memberIds[nextIdx];
      chore.status = "Pending";
      chore.dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      updates.push(chore.save());
    }

    await Promise.all(updates);

    const refreshed = await Chore.find({ roomId: room._id }).populate("assignedTo", "name email");

    res.json({ ok: true, chores: refreshed });
  })
);
