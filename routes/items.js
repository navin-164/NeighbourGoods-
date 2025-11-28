import express from 'express';
import multer from 'multer';
import path from 'path';
import Item from '../models/item.js';
import User from '../models/user.js';
import authMiddleware from './authMiddleware.js'; // Our token verifier

const router = express.Router();

// --- Multer Setup for Image Uploads ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure 'uploads/' folder exists
  },
  filename: function (req, file, cb) {
    // Create a unique filename
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: storage });

// --- Item Routes ---

// GET /api/items (Get all available items)
router.get('/', async (req, res) => {
  try {
    const items = await Item.find({ status: 'Available' }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/items (List a new item)
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  const { name, description, category, listingType, pricePerDay, salePrice } = req.body;
  const imageUrl = req.file ? `/${req.file.path.replace(/\\/g, "/")}` : null; // Get file path

  try {
    const newItem = new Item({
      name,
      description,
      category,
      listingType,
      pricePerDay: listingType === 'borrow' ? Number(pricePerDay) : 0,
      salePrice: listingType === 'sale' ? Number(salePrice) : 0,
      imageUrl,
      owner: req.user.id,
      ownerName: req.user.name,
    });
    const item = await newItem.save();
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/items/:id/borrow (Borrow an item)
router.put('/:id/borrow', authMiddleware, async (req, res) => {
  try {
    let item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.listingType !== 'borrow') return res.status(400).json({ error: 'This item is not for borrow' });
    if (item.status !== 'Available') return res.status(400).json({ error: 'Item is not available' });
    if (item.owner.toString() === req.user.id) return res.status(400).json({ error: 'You cannot borrow your own item' });

    item.status = 'Borrowed';
    item.borrower = req.user.id;
    await item.save();

    // Add to user's history
    await User.findByIdAndUpdate(req.user.id, { $push: { borrowedHistory: item._id } });

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/items/:id/buy (Buy an item)
router.post('/:id/buy', authMiddleware, async (req, res) => {
    try {
        let item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        if (item.listingType !== 'sale') return res.status(400).json({ error: 'This item is not for sale' });
        if (item.status !== 'Available') return res.status(400).json({ error: 'Item is no longer available' });
        if (item.owner.toString() === req.user.id) return res.status(400).json({ error: 'You cannot buy your own item' });
    
        item.status = 'Sold';
        item.borrower = null; // No longer borrowed
        await item.save();
    
        // Add to user's purchase history
        await User.findByIdAndUpdate(req.user.id, { $push: { purchasedItems: item._id } });
    
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/items/:id/rate (Rate an item)
router.post('/:id/rate', authMiddleware, async (req, res) => {
    const { stars, comment } = req.body;
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        
        // Check if user has borrowed or purchased this item
        const user = await User.findById(req.user.id);
        const hasBorrowed = user.borrowedHistory.includes(item._id);
        const hasPurchased = user.purchasedItems.includes(item._id);

        if (!hasBorrowed && !hasPurchased) {
            return res.status(403).json({ error: 'You must borrow or buy an item to rate it.' });
        }
        
        // Check if user already rated
        const existingRating = item.ratings.find(r => r.user.toString() === req.user.id);
        if (existingRating) {
             return res.status(400).json({ error: 'You have already rated this item.' });
        }

        // Add new rating
        item.ratings.push({
            user: req.user.id,
            name: req.user.name,
            stars: Number(stars),
            comment
        });
        
        await item.save();
        res.status(201).json(item.ratings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;