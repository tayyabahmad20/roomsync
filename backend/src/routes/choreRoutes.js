import express from 'express';

import { protect } from '../middleware/authMiddleware.js';
import {
  createChoreValidators,
  updateChoreStatusValidators,
  manualRotateValidators,
} from '../validators/choreValidators.js';

import {
  listChores,
  createChore,
  updateChoreStatus,
  rotateChoresNow,
} from '../controllers/choreController.js';

const router = express.Router();

router.get('/', protect, listChores);
router.post('/', protect, createChoreValidators, createChore);
router.patch('/:id/status', protect, updateChoreStatusValidators, updateChoreStatus);

// Manual trigger (useful even with automatic rotation)
router.post('/rotate', protect, manualRotateValidators, rotateChoresNow);

export default router;
