const express = require('express');
const router = express.Router();
const BorrowRecord = require('../models/BorrowRecord');
const Book = require('../models/Book');
const User = require('../models/User');
const Reservation = require('../models/Reservation');

const BORROW_DAYS = 14;

router.post('/scan', async (req, res) => {
  try {
    const { qrCode, userId } = req.body;

    if (!qrCode || !userId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const book = await Book.findOne({ qrCode });
    if (!book) {
      return res.status(404).json({ error: '图书不存在' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (book.status === 'borrowed') {
      if (book.currentBorrower.toString() === userId) {
        return res.status(400).json({ error: '您已借阅此书' });
      }
      
      const pendingReservations = await Reservation.find({
        book: book._id,
        status: 'pending'
      }).sort({ queuePosition: 1 });
      
      if (pendingReservations.length > 0) {
        const firstReservation = pendingReservations[0];
        if (firstReservation.user.toString() !== userId) {
          return res.status(400).json({ 
            error: '此书已被借阅且有其他用户预约中',
            canReserve: true,
            queuePosition: pendingReservations.length + 1
          });
        }
      } else {
        return res.status(400).json({ 
          error: '此书已被借阅，可以预约',
          canReserve: true
        });
      }
    }

    if (book.status === 'reserved') {
      const pendingReservations = await Reservation.find({
        book: book._id,
        status: 'pending'
      }).sort({ queuePosition: 1 });
      
      if (pendingReservations.length > 0) {
        const firstReservation = pendingReservations[0];
        if (firstReservation.user.toString() === userId) {
          await firstReservation.updateOne({ 
            status: 'fulfilled',
            fulfilledDate: new Date()
          });
        } else {
          return res.status(400).json({ 
            error: `此书有其他用户预约，您排在第${pendingReservations.length + 1}位`,
            canReserve: true,
            queuePosition: pendingReservations.length + 1
          });
        }
      }
    }

    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + BORROW_DAYS);

    const record = new BorrowRecord({
      user: userId,
      book: book._id,
      borrowDate,
      dueDate,
      status: 'active'
    });

    await record.save();

    book.status = 'borrowed';
    book.currentBorrower = userId;
    book.borrowCount = (book.borrowCount || 0) + 1;
    await book.save();

    await record.populate('user', 'name');
    await record.populate('book', 'title qrCode category');

    res.status(201).json({
      message: '借阅成功',
      record
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/return', async (req, res) => {
  try {
    const record = await BorrowRecord.findById(req.params.id)
      .populate('user', 'name')
      .populate('book');
    
    if (!record) {
      return res.status(404).json({ error: '借阅记录不存在' });
    }

    if (record.status === 'returned') {
      return res.status(400).json({ error: '此书已归还' });
    }

    const now = new Date();
    record.returnDate = now;
    record.status = 'returned';

    if (now > record.dueDate) {
      const overdueDays = Math.ceil((now - record.dueDate) / (1000 * 60 * 60 * 24));
      record.overdueDays = overdueDays;
      
      const pointsToDeduct = overdueDays * 10;
      record.pointsDeducted = pointsToDeduct;
      
      const user = await User.findById(record.user._id);
      if (user) {
        user.points = Math.max(0, user.points - pointsToDeduct);
        await user.save();
      }
    }

    await record.save();

    const book = await Book.findById(record.book._id);
    if (book) {
      const pendingReservations = await Reservation.find({
        book: book._id,
        status: 'pending'
      }).sort({ queuePosition: 1 });

      if (pendingReservations.length > 0) {
        book.status = 'reserved';
        const firstReservation = pendingReservations[0];
        firstReservation.expiryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await firstReservation.save();
      } else {
        book.status = 'available';
        book.currentBorrower = null;
      }
      await book.save();
    }

    res.json({
      message: '归还成功',
      record
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/renew', async (req, res) => {
  try {
    const record = await BorrowRecord.findById(req.params.id)
      .populate('user', 'name')
      .populate('book');
    
    if (!record) {
      return res.status(404).json({ error: '借阅记录不存在' });
    }

    if (record.isRenewed) {
      return res.status(400).json({ error: '您已续借过一次，不能再次续借' });
    }

    if (record.status !== 'active') {
      return res.status(400).json({ error: '此借阅记录不是有效状态' });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(record.dueDate.getFullYear(), record.dueDate.getMonth(), record.dueDate.getDate());
    
    if (today > dueDateOnly) {
      return res.status(400).json({ error: '已逾期，不能续借' });
    }

    const pendingReservations = await Reservation.find({
      book: record.book._id,
      status: 'pending'
    });

    if (pendingReservations.length > 0) {
      return res.status(400).json({ error: '此书有预约，不能续借' });
    }

    const newDueDate = new Date(record.dueDate);
    newDueDate.setDate(newDueDate.getDate() + BORROW_DAYS);

    record.isRenewed = true;
    record.renewalDate = now;
    record.dueDate = newDueDate;
    await record.save();

    await Reservation.updateMany(
      {
        book: record.book._id,
        status: 'pending'
      },
      {
        expectedAvailableDate: newDueDate
      }
    );

    res.json({
      message: '续借成功',
      record
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { userId, status } = req.query;
    const filter = {};
    
    if (userId) filter.user = userId;
    if (status) filter.status = status;

    const records = await BorrowRecord.find(filter)
      .populate('user', 'name')
      .populate('book', 'title qrCode')
      .sort({ borrowDate: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const record = await BorrowRecord.findById(req.params.id)
      .populate('user', 'name')
      .populate('book', 'title qrCode');
    
    if (!record) {
      return res.status(404).json({ error: '借阅记录不存在' });
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
