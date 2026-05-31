const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Book = require('../models/Book');
const BorrowRecord = require('../models/BorrowRecord');

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit) || 10;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const userBorrows = await BorrowRecord.find({ user: userId })
      .populate('book', 'category tags')
      .sort({ borrowDate: -1 });

    if (userBorrows.length === 0) {
      const hotBooks = await Book.find({ borrowCount: { $gt: 0 } })
        .sort({ borrowCount: -1 })
        .limit(limitNum)
        .populate('currentBorrower', 'name');

      return res.json({
        type: 'hot_books',
        message: '根据热门图书为您推荐',
        recommendations: hotBooks
      });
    }

    const categoryCount = {};
    const tagCount = {};

    for (const borrow of userBorrows) {
      if (borrow.book && borrow.book.category) {
        categoryCount[borrow.book.category] = (categoryCount[borrow.book.category] || 0) + 1;
      }
      if (borrow.book && borrow.book.tags) {
        for (const tag of borrow.book.tags) {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        }
      }
    }

    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);

    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    const borrowedBookIds = userBorrows.map(b => b.book._id.toString());

    const recommendations = await Book.aggregate([
      {
        $match: {
          _id: { $nin: borrowedBookIds.map(id => require('mongoose').Types.ObjectId(id)) },
          $or: [
            { category: { $in: topCategories } },
            { tags: { $in: topTags } }
          ]
        }
      },
      {
        $addFields: {
          categoryScore: {
            $cond: {
              if: { $in: ['$category', topCategories] },
              then: {
                $arrayElemAt: [
                  topCategories.map((cat, i) => ({ k: cat, v: topCategories.length - i })),
                  { $indexOfArray: [topCategories, '$category'] }
                ]
              },
              else: 0
            }
          },
          tagMatchCount: {
            $size: {
              $setIntersection: ['$tags', topTags]
            }
          }
        }
      },
      {
        $addFields: {
          score: {
            $add: [
              { $multiply: ['$categoryScore', 5] },
              { $multiply: ['$tagMatchCount', 2] },
              { $divide: ['$borrowCount', 100] }
            ]
          }
        }
      },
      {
        $sort: { score: -1, borrowCount: -1 }
      },
      {
        $limit: limitNum
      }
    ]);

    await Book.populate(recommendations, {
      path: 'currentBorrower',
      select: 'name'
    });

    res.json({
      type: 'personalized',
      userPreferences: {
        topCategories,
        topTags,
        borrowHistoryCount: userBorrows.length
      },
      recommendations
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:userId/similar', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit) || 10;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const userBorrows = await BorrowRecord.find({ user: userId })
      .populate('book', 'category')
      .sort({ borrowDate: -1 });

    if (userBorrows.length === 0) {
      return res.json({
        message: '暂无借阅历史',
        similarUsers: [],
        recommendations: []
      });
    }

    const userCategories = [...new Set(userBorrows.map(b => b.book?.category).filter(Boolean))];
    const borrowedBookIds = userBorrows.map(b => b.book._id.toString());

    const similarBorrowers = await BorrowRecord.aggregate([
      {
        $match: {
          user: { $ne: require('mongoose').Types.ObjectId(userId) }
        }
      },
      {
        $group: {
          _id: '$user',
          books: { $push: '$book' }
        }
      },
      {
        $lookup: {
          from: 'books',
          localField: 'books',
          foreignField: '_id',
          as: 'bookDetails'
        }
      },
      {
        $addFields: {
          matchedCategories: {
            $size: {
              $setIntersection: [
                { $setUnion: ['$bookDetails.category'] },
                userCategories
              ]
            }
          }
        }
      },
      {
        $sort: { matchedCategories: -1 }
      },
      {
        $limit: 5
      }
    ]);

    const similarUserIds = similarBorrowers.map(s => s._id);

    const recommendedBooks = await BorrowRecord.aggregate([
      {
        $match: {
          user: { $in: similarUserIds },
          book: { $nin: borrowedBookIds.map(id => require('mongoose').Types.ObjectId(id)) }
        }
      },
      {
        $group: {
          _id: '$book',
          borrowCount: { $sum: 1 }
        }
      },
      {
        $sort: { borrowCount: -1 }
      },
      {
        $limit: limitNum
      }
    ]);

    const recommendedBookIds = recommendedBooks.map(r => r._id);
    const books = await Book.find({ _id: { $in: recommendedBookIds } })
      .populate('currentBorrower', 'name');

    const booksWithCount = books.map(book => {
      const rec = recommendedBooks.find(r => r._id.toString() === book._id.toString());
      return {
        ...book.toObject(),
        recommendationScore: rec ? rec.borrowCount : 0
      };
    }).sort((a, b) => b.recommendationScore - a.recommendationScore);

    res.json({
      similarUsersCount: similarUserIds.length,
      recommendations: booksWithCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const borrowRecords = await BorrowRecord.find({ user: userId })
      .populate('book', 'title category tags author')
      .sort({ borrowDate: -1 });

    const categoryStats = {};
    const allTags = {};

    for (const record of borrowRecords) {
      if (record.book?.category) {
        categoryStats[record.book.category] = (categoryStats[record.book.category] || 0) + 1;
      }
      if (record.book?.tags) {
        for (const tag of record.book.tags) {
          allTags[tag] = (allTags[tag] || 0) + 1;
        }
      }
    }

    const sortedCategories = Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    const sortedTags = Object.entries(allTags)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        points: user.points
      },
      totalBorrows: borrowRecords.length,
      categoryPreferences: sortedCategories,
      tagPreferences: sortedTags,
      recentBorrows: borrowRecords.slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
