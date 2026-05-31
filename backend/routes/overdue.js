const express = require('express');
const router = express.Router();
const BorrowRecord = require('../models/BorrowRecord');
const User = require('../models/User');

const POINTS_PER_OVERDUE_DAY = 10;

router.post('/check', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const activeRecords = await BorrowRecord.find({
      status: { $in: ['active', 'overdue'] },
      returnDate: null
    }).populate('user');

    const results = [];

    for (const record of activeRecords) {
      if (record.status === 'returned' || record.returnDate) {
        continue;
      }

      const dueDateOnly = new Date(record.dueDate.getFullYear(), record.dueDate.getMonth(), record.dueDate.getDate());
      
      if (today <= dueDateOnly) {
        continue;
      }

      const overdueDays = Math.floor((today - dueDateOnly) / (1000 * 60 * 60 * 24));
      const newPointsDeducted = overdueDays * POINTS_PER_OVERDUE_DAY;
      const additionalDeduction = newPointsDeducted - record.pointsDeducted;

      if (additionalDeduction > 0) {
        record.status = 'overdue';
        record.overdueDays = overdueDays;
        record.pointsDeducted = newPointsDeducted;
        await record.save();

        if (record.user) {
          const user = await User.findById(record.user._id);
          if (user) {
            user.points = Math.max(0, user.points - additionalDeduction);
            await user.save();
          }
        }

        results.push({
          recordId: record._id,
          userId: record.user ? record.user._id : null,
          userName: record.user ? record.user.name : '未知用户',
          overdueDays,
          pointsDeducted: additionalDeduction
        });
      }
    }

    res.json({
      message: `检测完成，共处理 ${results.length} 条逾期记录`,
      results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/records', async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = { status: 'overdue' };
    if (userId) filter.user = userId;

    const overdueRecords = await BorrowRecord.find(filter)
      .populate('user', 'name')
      .populate('book', 'title qrCode')
      .sort({ dueDate: 1 });

    res.json(overdueRecords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:userId/overdue-info', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const overdueRecords = await BorrowRecord.find({
      user: userId,
      status: 'overdue'
    }).populate('book', 'title');

    const totalOverdueDays = overdueRecords.reduce((sum, record) => sum + record.overdueDays, 0);
    const totalPointsDeducted = overdueRecords.reduce((sum, record) => sum + record.pointsDeducted, 0);

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        currentPoints: user.points
      },
      overdueCount: overdueRecords.length,
      totalOverdueDays,
      totalPointsDeducted,
      overdueRecords
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/simulate-overdue', async (req, res) => {
  try {
    const { recordId } = req.body;

    if (!recordId) {
      return res.status(400).json({ error: '缺少借阅记录ID' });
    }

    const record = await BorrowRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({ error: '借阅记录不存在' });
    }

    if (record.status !== 'active') {
      return res.status(400).json({ error: '只有活跃的借阅记录才能模拟逾期' });
    }

    const pastDueDate = new Date();
    pastDueDate.setDate(pastDueDate.getDate() - 5);
    record.dueDate = pastDueDate;
    await record.save();

    res.json({
      message: '已模拟逾期（将到期日期设为5天前），请调用 /api/overdue/check 进行检测',
      record
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
