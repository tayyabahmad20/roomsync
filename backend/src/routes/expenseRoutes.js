import express from 'express';

import { protect } from '../middleware/authMiddleware.js';
import { createExpenseValidators } from '../validators/expenseValidators.js';
import {
  createExpense,
  listExpenses,
  deleteExpense,
  getSettlement,
} from '../controllers/expenseController.js';

const router = express.Router();

router.get('/', protect, listExpenses);
router.post('/', protect, createExpenseValidators, createExpense);
router.delete('/:id', protect, deleteExpense);

// "Who owes whom" computation
router.get('/settlement', protect, getSettlement);

export default router;
