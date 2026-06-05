import { body } from 'express-validator';

export const createExpenseValidators = [
  body('description').isString().trim().notEmpty().withMessage('description is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be > 0'),
  body('category').optional().isString().trim().isLength({ max: 60 }),
  body('paidBy').optional().isString().trim().notEmpty(),
];
