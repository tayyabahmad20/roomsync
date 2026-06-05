import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';

import { User } from '../models/User.js';

function signToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is missing in environment');
  return jwt.sign({ id: userId }, secret, { expiresIn: '7d' });
}

export async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400);
      return res.json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409);
      return res.json({ message: 'Email already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashed });

    const token = signToken(user._id);

    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, roomId: user.roomId },
    });
  } catch (err) {
    return next(err);
  }
}

export async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400);
      return res.json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401);
      return res.json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      res.status(401);
      return res.json({ message: 'Invalid credentials' });
    }

    const token = signToken(user._id);

    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, roomId: user.roomId },
    });
  } catch (err) {
    return next(err);
  }
}
