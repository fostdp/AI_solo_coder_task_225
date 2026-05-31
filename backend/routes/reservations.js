const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Book = require('../models/Book');
const User = require('../models/User');
const BorrowRecord = require('../models/BorrowRecord');

router.post('/', async (req, res) => {
  try {
    const { userId, bookId } = req.body;

    if (!userId || !bookId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: '图书不存在' });
    }

    if (book.status === 'available') {
      return res.status(400).json({ error: '此书可借，无需预约' });
    }

    const existingReservation = await Reservation.findOne({
      user: userId,
      book: bookId,
      status: { $in: ['pending', 'fulfilled'] }
    });

    if (existingReservation) {
      return res.status(400).json({ error: '您已预约过此书' });
    }

    const pendingCount = await Reservation.countDocuments({
      book: bookId,
      status: 'pending'
    });

    const activeBorrow = await BorrowRecord.findOne({
      book: bookId,
      status: { $in: ['active', 'overdue'] }
    });

    const reservation = new Reservation({
      user: userId,
      book: bookId,
      status: 'pending',
      queuePosition: pendingCount + 1,
      expectedAvailableDate: activeBorrow ? activeBorrow.dueDate : null
    });

    await reservation.save();
    await reservation.populate('user', 'name');
    await reservation.populate('book', 'title');

    res.status(201).json({
      message: '预约成功',
      reservation
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { userId, bookId, status } = req.query;
    const filter = {};
    
    if (userId) filter.user = userId;
    if (bookId) filter.book = bookId;
    if (status) filter.status = status;

    const reservations = await Reservation.find(filter)
      .populate('user', 'name')
      .populate('book', 'title qrCode')
      .sort({ queuePosition: 1 });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('user', 'name')
      .populate('book', 'title qrCode');
    
    if (!reservation) {
      return res.status(404).json({ error: '预约记录不存在' });
    }
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/cancel', async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('book');
    
    if (!reservation) {
      return res.status(404).json({ error: '预约记录不存在' });
    }

    if (reservation.status !== 'pending') {
      return res.status(400).json({ error: '只有待处理的预约才能取消' });
    }

    reservation.status = 'cancelled';
    await reservation.save();

    const pendingReservations = await Reservation.find({
      book: reservation.book._id,
      status: 'pending'
    }).sort({ queuePosition: 1 });

    for (let i = 0; i < pendingReservations.length; i++) {
      pendingReservations[i].queuePosition = i + 1;
      await pendingReservations[i].save();
    }

    await reservation.populate('user', 'name');
    res.json({
      message: '预约已取消',
      reservation
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
