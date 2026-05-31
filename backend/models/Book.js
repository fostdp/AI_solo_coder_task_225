const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    trim: true
  },
  isbn: {
    type: String,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    default: '未分类'
  },
  tags: [{
    type: String,
    trim: true
  }],
  qrCode: {
    type: String,
    unique: true
  },
  status: {
    type: String,
    enum: ['available', 'borrowed', 'reserved', 'donated'],
    default: 'available'
  },
  cover: {
    type: String
  },
  description: {
    type: String
  },
  borrowCount: {
    type: Number,
    default: 0
  },
  currentBorrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Book', bookSchema);
