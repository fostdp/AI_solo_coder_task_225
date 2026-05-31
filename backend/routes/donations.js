const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Donation = require('../models/Donation');
const Book = require('../models/Book');
const User = require('../models/User');

const POINTS_PER_DONATION = {
  '全新': 50,
  '九成新': 30,
  '八成新': 20,
  '七成新及以下': 10
};

router.post('/', async (req, res) => {
  try {
    const { 
      userId, 
      bookTitle, 
      bookAuthor, 
      bookIsbn, 
      bookCategory,
      bookCondition, 
      description 
    } = req.body;

    if (!userId || !bookTitle) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const condition = bookCondition || '九成新';
    const pointsToAdd = POINTS_PER_DONATION[condition] || 20;

    const donation = new Donation({
      user: userId,
      bookTitle,
      bookAuthor,
      bookIsbn,
      bookCategory: bookCategory || '未分类',
      bookCondition: condition,
      description,
      pointsEarned: pointsToAdd,
      status: 'pending'
    });

    await donation.save();
    await donation.populate('user', 'name');

    res.status(201).json({
      message: '捐书申请已提交，等待审核',
      expectedPoints: pointsToAdd,
      donation
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

    const donations = await Donation.find(filter)
      .populate('user', 'name')
      .populate('book', 'title qrCode')
      .sort({ createdAt: -1 });

    res.json(donations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('user', 'name')
      .populate('book', 'title qrCode');

    if (!donation) {
      return res.status(404).json({ error: '捐书记录不存在' });
    }

    res.json(donation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/approve', async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('user');

    if (!donation) {
      return res.status(404).json({ error: '捐书记录不存在' });
    }

    if (donation.status !== 'pending') {
      return res.status(400).json({ error: '该捐书申请已处理' });
    }

    const qrCodeValue = `DONATION-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const book = new Book({
      title: donation.bookTitle,
      author: donation.bookAuthor,
      isbn: donation.bookIsbn,
      category: donation.bookCategory || '未分类',
      qrCode: qrCodeValue,
      status: 'available',
      donor: donation.user._id,
      description: donation.description
    });

    await book.save();

    donation.status = 'approved';
    donation.book = book._id;
    donation.updatedAt = new Date();
    await donation.save();

    if (donation.user) {
      const user = await User.findById(donation.user._id);
      if (user) {
        user.points += donation.pointsEarned;
        await user.save();
      }
    }

    const qrCode = await QRCode.toDataURL(qrCodeValue);

    res.json({
      message: '捐书审核通过，积分已发放',
      pointsEarned: donation.pointsEarned,
      donation,
      book,
      qrCode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;

    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ error: '捐书记录不存在' });
    }

    if (donation.status !== 'pending') {
      return res.status(400).json({ error: '该捐书申请已处理' });
    }

    donation.status = 'rejected';
    donation.updatedAt = new Date();
    await donation.save();

    res.json({
      message: '捐书申请已拒绝',
      rejectionReason: reason,
      donation
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/conditions/points', async (req, res) => {
  try {
    res.json({
      conditions: [
        { condition: '全新', points: 50, description: '未拆封或几乎全新' },
        { condition: '九成新', points: 30, description: '轻微使用痕迹' },
        { condition: '八成新', points: 20, description: '有使用痕迹但不影响阅读' },
        { condition: '七成新及以下', points: 10, description: '有明显磨损或标注' }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const donations = await Donation.find({ user: userId });

    const totalDonations = donations.length;
    const approvedDonations = donations.filter(d => d.status === 'approved').length;
    const totalPointsEarned = donations
      .filter(d => d.status === 'approved')
      .reduce((sum, d) => sum + d.pointsEarned, 0);

    const donatedBooks = await Book.find({ donor: userId })
      .sort({ createdAt: -1 });

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        currentPoints: user.points
      },
      stats: {
        totalDonations,
        approvedDonations,
        pendingDonations: donations.filter(d => d.status === 'pending').length,
        rejectedDonations: donations.filter(d => d.status === 'rejected').length,
        totalPointsEarned
      },
      donatedBooks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
