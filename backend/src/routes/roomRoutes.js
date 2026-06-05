import express from 'express';
import { body } from 'express-validator';

import { protect } from '../middleware/authMiddleware.js';
import { createRoom, joinRoom, getMyRoom } from '../controllers/roomController.js';

const router = express.Router();

router.get('/me', protect, getMyRoom);

router.post(
  '/create',
  protect,
  [body('name').isString().trim().notEmpty().withMessage('Room name is required')],
  createRoom
);

router.post(
  '/join',
  protect,
  [body('roomCode').isString().trim().notEmpty().withMessage('roomCode is required')],
  joinRoom
);

export default router;
