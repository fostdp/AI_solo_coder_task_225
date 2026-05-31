const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Book = require('../models/Book');
const BorrowRecord = require('../models/BorrowRecord');
const Reservation = require('../models/Reservation');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  const userRoutes = require('../routes/users');
  const bookRoutes = require('../routes/books');
  const borrowRoutes = require('../routes/borrows');
  const reservationRoutes = require('../routes/reservations');
  const overdueRoutes = require('../routes/overdue');

  app.use('/api/users', userRoutes);
  app.use('/api/books', bookRoutes);
  app.use('/api/borrows', borrowRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/overdue', overdueRoutes);
  
  return app;
};

const createTestUser = async (data = {}) => {
  return await User.create({
    name: data.name || '测试用户',
    email: data.email || `test${Date.now()}@example.com`,
    phone: data.phone || `13800${Math.floor(Math.random() * 100000)}`,
    points: data.points ?? 100
  });
};

const createTestBook = async (data = {}) => {
  return await Book.create({
    title: data.title || '测试图书',
    author: data.author || '测试作者',
    isbn: data.isbn || `ISBN-${Date.now()}`,
    qrCode: data.qrCode || `QR-${Date.now()}`,
    status: data.status || 'available'
  });
};

const createBorrowRecord = async (user, book, options = {}) => {
  const borrowDate = options.borrowDate || new Date();
  const dueDate = options.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  
  const record = await BorrowRecord.create({
    user: user._id,
    book: book._id,
    borrowDate,
    dueDate,
    isRenewed: options.isRenewed || false,
    status: options.status || 'active',
    returnDate: options.returnDate || null,
    overdueDays: options.overdueDays || 0,
    pointsDeducted: options.pointsDeducted || 0
  });
  
  if (options.status !== 'returned') {
    book.status = 'borrowed';
    book.currentBorrower = user._id;
    await book.save();
  }
  
  return record;
};

const createReservation = async (user, book, options = {}) => {
  const pendingCount = await Reservation.countDocuments({
    book: book._id,
    status: 'pending'
  });
  
  return await Reservation.create({
    user: user._id,
    book: book._id,
    status: options.status || 'pending',
    queuePosition: options.queuePosition ?? (pendingCount + 1),
    expectedAvailableDate: options.expectedAvailableDate || null
  });
};

const setDateTo = (date, daysOffset) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + daysOffset);
  return newDate;
};

const getDayStart = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

module.exports = {
  createTestApp,
  createTestUser,
  createTestBook,
  createBorrowRecord,
  createReservation,
  setDateTo,
  getDayStart
};
