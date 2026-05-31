const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const QRCode = require('qrcode');

router.post('/', async (req, res) => {
  try {
    const { title, author, isbn } = req.body;
    const qrCodeValue = `BOOK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const qrCode = await QRCode.toDataURL(qrCodeValue);
    
    const book = new Book({
      title,
      author,
      isbn,
      qrCode: qrCodeValue
    });
    await book.save();
    res.status(201).json({ book, qrCode });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const books = await Book.find(filter)
      .populate('currentBorrower', 'name')
      .sort({ createdAt: -1 });
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('currentBorrower', 'name');
    if (!book) {
      return res.status(404).json({ error: '图书不存在' });
    }
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/qrcode/:qrCode', async (req, res) => {
  try {
    const book = await Book.findOne({ qrCode: req.params.qrCode })
      .populate('currentBorrower', 'name');
    if (!book) {
      return res.status(404).json({ error: '图书不存在' });
    }
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, author, isbn, status } = req.body;
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { title, author, isbn, status },
      { new: true }
    ).populate('currentBorrower', 'name');
    
    if (!book) {
      return res.status(404).json({ error: '图书不存在' });
    }
    res.json(book);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).json({ error: '图书不存在' });
    }
    res.json({ message: '图书已删除' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
