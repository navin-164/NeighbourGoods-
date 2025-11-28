import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import Item from '../models/item.js';
import authMiddleware from './authMiddleware.js';

const router = express.Router();

// POST /api/auth/register (No change)
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }
    user = new User({ name, email, password });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login (No change)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    // Create JWT
    const payload = {
      id: user.id,
      name: user.name,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '3h',
    });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- NEW DASHBOARD ENDPOINTS ---

// GET /api/auth/dashboard/lender
router.get('/dashboard/lender', authMiddleware, async (req, res) => {
    try {
        const myItems = await Item.find({ owner: req.user.id }).sort('-createdAt');
        
        const borrowed = myItems.filter(i => i.status === 'Borrowed');
        const sold = myItems.filter(i => i.status === 'Sold');
        const available = myItems.filter(i => i.status === 'Available');

        res.json({ borrowed, sold, available });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/auth/dashboard/customer
router.get('/dashboard/customer', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('borrowedHistory')
            .populate('purchasedItems');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ 
            borrowed: user.borrowedHistory, 
            purchased: user.purchasedItems 
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/auth/dashboard/recommendations
router.get('/dashboard/recommendations', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('borrowedHistory', 'category')
            .populate('purchasedItems', 'category');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Find all unique categories from user's history
        const categories = new Set([
            ...user.borrowedHistory.map(i => i.category),
            ...user.purchasedItems.map(i => i.category)
        ]);
        
        // Find items in those categories that are available and not owned by the user
        const recommendations = await Item.find({ 
            category: { $in: [...categories] }, 
            status: 'Available', 
            owner: { $ne: req.user.id } // $ne = Not Equal
        }).limit(5).sort('-createdAt');
        
        res.json(recommendations);

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


export default router;