const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const BorrowRecord = require('../models/BorrowRecord');

router.get('/hot', async (req, res) => {
  try {
    const { limit = 10, days = 30 } = req.query;
    
    const limitNum = parseInt(limit) || 10;
    const daysNum = parseInt(days) || 30;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);
    
    const hotBooks = await Book.aggregate([
      {
        $match: {
          borrowCount: { $gt: 0 }
        }
      },
      {
        $lookup: {
          from: 'borrowrecords',
          let: { bookId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$book', '$$bookId'] },
                borrowDate: { $gte: cutoffDate }
              }
            },
            { $count: 'count' }
          ],
          as: 'recentBorrows'
        }
      },
      {
        $addFields: {
          recentBorrowCount: {
            $ifNull: [{ $arrayElemAt: ['$recentBorrows.count', 0] }, 0]
          }
        }
      },
      {
        $project: {
          recentBorrows: 0
        }
      },
      {
        $sort: {
          recentBorrowCount: -1,
          borrowCount: -1
        }
      },
      {
        $limit: limitNum
      }
    ]);

    await Book.populate(hotBooks, {
      path: 'currentBorrower',
      select: 'name'
    });

    res.json({
      period: `${daysNum}天内`,
      count: hotBooks.length,
      books: hotBooks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await Book.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalBorrows: { $sum: '$borrowCount' },
          books: { $push: '$$ROOT' }
        }
      },
      {
        $sort: {
          totalBorrows: -1
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          totalBorrows: 1,
          topBooks: { $slice: ['$books', 5] },
          _id: 0
        }
      }
    ]);

    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const limitNum = parseInt(limit) || 5;

    const now = new Date();
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(now);
    lastMonth.setDate(lastMonth.getDate() - 30);

    const weeklyBorrows = await BorrowRecord.aggregate([
      {
        $match: {
          borrowDate: { $gte: lastWeek }
        }
      },
      {
        $group: {
          _id: '$book',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: limitNum
      }
    ]);

    const monthlyBorrows = await BorrowRecord.aggregate([
      {
        $match: {
          borrowDate: { $gte: lastMonth }
        }
      },
      {
        $group: {
          _id: '$book',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: limitNum
      }
    ]);

    const weeklyBookIds = weeklyBorrows.map(b => b._id);
    const monthlyBookIds = monthlyBorrows.map(b => b._id);

    const weeklyBooks = await Book.find({ _id: { $in: weeklyBookIds } });
    const monthlyBooks = await Book.find({ _id: { $in: monthlyBookIds } });

    const weeklyBooksWithCount = weeklyBooks.map(book => {
      const borrow = weeklyBorrows.find(b => b._id.toString() === book._id.toString());
      return {
        ...book.toObject(),
        weeklyCount: borrow ? borrow.count : 0
      };
    }).sort((a, b) => b.weeklyCount - a.weeklyCount);

    const monthlyBooksWithCount = monthlyBooks.map(book => {
      const borrow = monthlyBorrows.find(b => b._id.toString() === book._id.toString());
      return {
        ...book.toObject(),
        monthlyCount: borrow ? borrow.count : 0
      };
    }).sort((a, b) => b.monthlyCount - a.monthlyCount);

    res.json({
      weekly: weeklyBooksWithCount,
      monthly: monthlyBooksWithCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/new-arrivals', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit) || 10;

    const newBooks = await Book.find()
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .populate('currentBorrower', 'name');

    res.json({
      count: newBooks.length,
      books: newBooks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
