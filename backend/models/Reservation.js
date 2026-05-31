const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  reservationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'fulfilled', 'cancelled', 'expired'],
    default: 'pending'
  },
  queuePosition: {
    type: Number,
    required: true
  },
  expectedAvailableDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  fulfilledDate: {
    type: Date
  }
});

module.exports = mongoose.model('Reservation', reservationSchema);
