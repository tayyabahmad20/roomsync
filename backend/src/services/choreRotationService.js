import { addDays, startOfDay } from '../utils/date.js';

import { Chore } from '../models/Chore.js';
import { Room } from '../models/Room.js';
import { ChoreRotationState } from '../models/ChoreRotationState.js';

/**
 * Rotate chores for all rooms that have chores due (or overdue).
 */
export async function rotateDueChores() {
  const today = startOfDay(new Date());

  // Find rooms that have chores due today or earlier.
  const roomIds = await Chore.distinct('roomId', { dueDate: { $lte: today } });

  let roomsProcessed = 0;
  let choresRotated = 0;

  for (const roomId of roomIds) {
    const result = await rotateRoomChores(roomId);
    roomsProcessed += 1;
    choresRotated += result.choresRotated;
  }

  return { roomsProcessed, choresRotated };
}

/**
 * Rotate ALL chores for a specific room if the room has any due today (or overdue).
 *
 * Policy:
 * - Only rotates once per day (guarded by ChoreRotationState.lastRotatedAt).
 * - Rotates each chore's assignedTo to the next member in a round-robin.
 * - Sets status back to Pending.
 * - Pushes dueDate forward 7 days (weekly schedule).
 */
export async function rotateRoomChores(roomId) {
  const today = startOfDay(new Date());

  const room = await Room.findById(roomId).lean();
  if (!room) return { roomId, choresRotated: 0, skipped: 'room_not_found' };

  const chores = await Chore.find({ roomId: room._id, dueDate: { $lte: today } });
  if (chores.length === 0) return { roomId, choresRotated: 0, skipped: 'no_due_chores' };

  const state =
    (await ChoreRotationState.findOne({ roomId: room._id })) ||
    (await ChoreRotationState.create({ roomId: room._id }));

  if (state.lastRotatedAt && startOfDay(state.lastRotatedAt).getTime() === today.getTime()) {
    return { roomId, choresRotated: 0, skipped: 'already_rotated_today' };
  }

  const members = (room.members || []).map((m) => String(m));
  if (members.length < 2) {
    return { roomId, choresRotated: 0, skipped: 'not_enough_members' };
  }

  let idx = state.nextAssigneeIndex % members.length;

  for (const chore of chores) {
    const nextAssignee = members[idx];
    idx = (idx + 1) % members.length;

    chore.assignedTo = nextAssignee;
    chore.status = 'Pending';
    chore.dueDate = addDays(today, 7);
    await chore.save();
  }

  state.nextAssigneeIndex = idx;
  state.lastRotatedAt = new Date();
  await state.save();

  return { roomId, choresRotated: chores.length };
}
