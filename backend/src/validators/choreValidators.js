import { body } from 'express-validator';

export const createChoreValidators = [
  body('taskName').isString().trim().notEmpty().withMessage('taskName is required'),
  body('dueDate').isISO8601().withMessage('dueDate must be an ISO date'),
  body('assignedTo').optional().isString().trim().notEmpty(),
];

export const updateChoreStatusValidators = [
  body('status')
    .isIn(['Pending', 'Completed'])
    .withMessage("status must be 'Pending' or 'Completed'"),
];

export const manualRotateValidators = [
  body('scope').optional().isIn(['room', 'all']).withMessage("scope must be 'room' or 'all'"),
];
