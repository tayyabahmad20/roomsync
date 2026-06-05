import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { connectDB } from './src/config/db.js';
import { notFound, errorHandler } from './src/middleware/errorMiddleware.js';

import authRoutes from './src/routes/authRoutes.js';
import roomRoutes from './src/routes/roomRoutes.js';

dotenv.config();

const app = express();

// --- DB ---
await connectDB();

// --- Middleware ---
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// --- Routes ---
app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'roomsync-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// --- Error handling ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`RoomSync API running on port ${PORT}`);
});
