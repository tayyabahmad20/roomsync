import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = express.Router();

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  password: z.string().min(6).max(200)
});

const loginSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(6).max(200)
});

function signToken(userId) {
  return jwt.sign({}, env.jwtSecret, {
    subject: String(userId),
    expiresIn: env.jwtExpiresIn
  });
}

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Invalid registration input", parsed.error.flatten());

    const { name, email, password } = parsed.data;

    const existing = await User.findOne({ email });
    if (existing) throw new ApiError(409, "Email already in use");

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: passwordHash,
      roomId: null
    });

    const token = signToken(user._id);

    res.status(201).json({
      ok: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, roomId: user.roomId }
    });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Invalid login input", parsed.error.flatten());

    const { email, password } = parsed.data;

    const user = await User.findOne({ email });
    if (!user) throw new ApiError(401, "Invalid email or password");

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new ApiError(401, "Invalid email or password");

    const token = signToken(user._id);

    res.json({
      ok: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, roomId: user.roomId }
    });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ ok: true, user: req.user });
  })
);
