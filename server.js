// server.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import itemRoutes from './routes/items.js';

// Load .env config
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public'))); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -----------------------------------------------------------------
// ▼▼▼ THIS IS THE MOST IMPORTANT PART ▼▼▼
// -----------------------------------------------------------------
// This line tries to connect to the MONGO_URI from your .env file.
// If this fails, your server will crash with a 500 error.
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully.'))
  .catch((err) => console.error('❌ MongoDB connection error:', err)); // <-- CHECK YOUR TERMINAL FOR THIS ERROR
// -----------------------------------------------------------------

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);

// Fallback: Serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});