import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: { // Store user's name for easy display
        type: String,
        required: true
    },
    stars: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true
    }
}, { timestamps: true });

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Tools', 'Camping', 'Kitchen', 'Electronics', 'Other'],
  },
  imageUrl: {
    type: String,
    default: null // Path to the uploaded image
  },
  // --- New Fields ---
  listingType: {
    type: String,
    required: true,
    enum: ['borrow', 'sale']
  },
  pricePerDay: { // For 'borrow'
    type: Number,
    default: 0
  },
  salePrice: { // For 'sale'
    type: Number,
    default: 0
  },
  ratings: [ratingSchema], // Array of ratings
  // --- Updated Fields ---
  status: {
    type: String,
    required: true,
    enum: ['Available', 'Borrowed', 'Sold'],
    default: 'Available',
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ownerName: {
    type: String,
    required: true
  },
  borrower: { // Who currently has it
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Item = mongoose.model('Item', itemSchema);
export default Item;