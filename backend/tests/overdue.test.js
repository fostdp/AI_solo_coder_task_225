const request = require('supertest');
const mongoose = require('mongoose');
const {
  createTestApp,
  createTestUser,
  createTestBook,
  createBorrowRecord,
  setDateTo,
  getDayStart
} = require('./helpers');

const app = createTestApp();

describe('逾期扣分测试', () => {
  describe('边界时间戳校验', () => {
    test('到期日当天不应扣分', async () => {
      const user = await createTestUser({ points: 100 });
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = new Date(today);
      const borrowDate = setDateTo(today, -14);
      
      await createBorrowRecord(user, book, {
        borrowDate,
        dueDate
      });
      
      const response = await request(app)
        .post('/api/overdue/check');
      
      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(0);
      
      const User = mongoose.model('User');
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.points).toBe(100);
    });

    test('逾期1天应扣10分', async () => {
      const user = await createTestUser({ points: 100 });
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, -1);
      const borrowDate = setDateTo(today, -15);
      
      await createBorrowRecord(user, book, {
        borrowDate,
        dueDate
      });
      
      const response = await request(app)
        .post('/api/overdue/check');
      
      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(1);
      expect(response.body.results[0].overdueDays).toBe(1);
      expect(response.body.results[0].pointsDeducted).toBe(10);
      
      const User = mongoose.model('User');
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.points).toBe(90);
    });

    test('逾期5天应扣50分', async () => {
      const user = await createTestUser({ points: 100 });
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, -5);
      const borrowDate = setDateTo(today, -19);
      
      await createBorrowRecord(user, book, {
        borrowDate,
        dueDate
      });
      
      const response = await request(app)
        .post('/api/overdue/check');
      
      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(1);
      expect(response.body.results[0].overdueDays).toBe(5);
      expect(response.body.results[0].pointsDeducted).toBe(50);
      
      const User = mongoose.model('User');
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.points).toBe(50);
    });

    test('到期日当天00:00:01不应算作逾期', async () => {
      const user = await createTestUser({ points: 100 });
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setHours(0, 0, 0, 1);
      const borrowDate = setDateTo(today, -14);
      
      await createBorrowRecord(user, book, {
        borrowDate,
        dueDate
      });
      
      const response = await request(app)
        .post('/api/overdue/check');
      
      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(0);
      
      const User = mongoose.model('User');
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.points).toBe(100);
    });

    test('到期日前一天23:59:59不应算作逾期', async () => {
      const user = await createTestUser({ points: 100 });
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, 1);
      dueDate.setHours(23, 59, 59, 999);
      const borrowDate = setDateTo(today, -13);
      
      await createBorrowRecord(user, book, {
        borrowDate,
        dueDate
      });
      
      const response = await request(app)
        .post('/api/overdue/check');
      
      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(0);
    });

    test('到期日后一天00:00:00应算作逾期1天', async () => {
      const user = await createTestUser({ points: 100 });
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, -1);
      dueDate.setHours(23, 59, 59, 999);
      const borrowDate = setDateTo(today, -15);
      
      await createBorrowRecord(user, book, {
        borrowDate,
        dueDate
      });
      
      const response = await request(app)
        .post('/api/overdue/check');
      
      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(1);
      expect(response.body.results[0].overdueDays).toBe(1);
    });
  });

  describe('归还后扣分停止', () => {
    test('已归还的图书不应被扣分', async () => {
      const user = await createTestUser({ points: 100 });
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, -5);
      const borrowDate = setDateTo(today, -19);
      
      await createBorrowRecord(user, book, {
        borrowDate,
        dueDate,
        status: 'returned',
        returnDate: setDateTo(today, -1)
      });
      
      const response = await request(app)
        .post('/api/overdue/check');
      
      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(0);
      
      const User = mongoose.model('User');
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.points).toBe(100);
    });

    test('归还时已扣的分不会重复扣除', async () => {
      const user = await createTestUser({ points: 100 });
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, -5);
      const borrowDate = setDateTo(today, -19);
      
      const borrowRecord = await createBorrowRecord(user, book, {
        borrowDate,
        dueDate
      });
      
      await request(app)
        .post('/api/overdue/check');
      
      const User = mongoose.model('User');
      let updatedUser = await User.findById(user._id);
      expect(updatedUser.points).toBe(50);
      
      await request(app)
        .post(`/api/borrows/${borrowRecord._id}/return`);
      
      const secondCheck = await request(app)
        .post('/api/overdue/check');
      
      expect(secondCheck.status).toBe(200);
      expect(secondCheck.body.results.length).toBe(0);
      
      updatedUser = await User.findById(user._id);
      expect(updatedUser.points).toBe(50);
    });

    test('逾期后归还应在归还时一次性扣清', async () => {
      const user = await createTestUser({ points: 100 });
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, -3);
      const borrowDate = setDateTo(today, -17);
      
      const borrowRecord = await createBorrowRecord(user, book, {
        borrowDate,
        dueDate
      });
      
      const response = await request(app)
        .post(`/api/borrows/${borrowRecord._id}/return`);
      
      expect(response.status).toBe(200);
      
      const User = mongoose.model('User');
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.points).toBe(70);
      
      const BorrowRecord = mongoose.model('BorrowRecord');
      const returnedRecord = await BorrowRecord.findById(borrowRecord._id);
      expect(returnedRecord.status).toBe('returned');
      expect(returnedRecord.overdueDays).toBe(3);
      expect(returnedRecord.pointsDeducted).toBe(30);
    });

    test('多次运行逾期检测不会重复扣分', async () => {
      const user = await createTestUser({ points: 100 });
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, -3);
      const borrowDate = setDateTo(today, -17);
      
      await createBorrowRecord(user, book, {
        borrowDate,
        dueDate
      });
      
      await request(app).post('/api/overdue/check');
      await request(app).post('/api/overdue/check');
      await request(app).post('/api/overdue/check');
      
      const User = mongoose.model('User');
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.points).toBe(70);
    });
  });

  describe('边界情况', () => {
    test('积分不应低于0', async () => {
      const user = await createTestUser({ points: 25 });
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, -5);
      const borrowDate = setDateTo(today, -19);
      
      await createBorrowRecord(user, book, {
        borrowDate,
        dueDate
      });
      
      const response = await request(app)
        .post('/api/overdue/check');
      
      expect(response.status).toBe(200);
      
      const User = mongoose.model('User');
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.points).toBe(0);
    });

    test('逾期状态应正确设置', async () => {
      const user = await createTestUser();
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, -2);
      const borrowDate = setDateTo(today, -16);
      
      const borrowRecord = await createBorrowRecord(user, book, {
        borrowDate,
        dueDate,
        status: 'active'
      });
      
      await request(app)
        .post('/api/overdue/check');
      
      const BorrowRecord = mongoose.model('BorrowRecord');
      const updatedRecord = await BorrowRecord.findById(borrowRecord._id);
      
      expect(updatedRecord.status).toBe('overdue');
      expect(updatedRecord.overdueDays).toBe(2);
    });

    test('获取用户逾期信息应正确统计', async () => {
      const user = await createTestUser({ points: 100 });
      const book1 = await createTestBook({ title: '图书1' });
      const book2 = await createTestBook({ title: '图书2' });
      
      const today = new Date();
      const dueDate1 = setDateTo(today, -3);
      const dueDate2 = setDateTo(today, -5);
      
      await createBorrowRecord(user, book1, {
        dueDate: dueDate1
      });
      await createBorrowRecord(user, book2, {
        dueDate: dueDate2
      });
      
      await request(app).post('/api/overdue/check');
      
      const response = await request(app)
        .get(`/api/overdue/users/${user._id}/overdue-info`);
      
      expect(response.status).toBe(200);
      expect(response.body.overdueCount).toBe(2);
      expect(response.body.totalOverdueDays).toBe(8);
      expect(response.body.totalPointsDeducted).toBe(80);
      expect(response.body.user.currentPoints).toBe(20);
    });

    test('多用户逾期应分别处理', async () => {
      const user1 = await createTestUser({ name: '用户1', points: 100 });
      const user2 = await createTestUser({ name: '用户2', points: 100 });
      const book1 = await createTestBook({ title: '图书1' });
      const book2 = await createTestBook({ title: '图书2' });
      
      const today = new Date();
      const dueDate1 = setDateTo(today, -2);
      const dueDate2 = setDateTo(today, -4);
      
      await createBorrowRecord(user1, book1, { dueDate: dueDate1 });
      await createBorrowRecord(user2, book2, { dueDate: dueDate2 });
      
      const response = await request(app)
        .post('/api/overdue/check');
      
      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(2);
      
      const User = mongoose.model('User');
      const updatedUser1 = await User.findById(user1._id);
      const updatedUser2 = await User.findById(user2._id);
      
      expect(updatedUser1.points).toBe(80);
      expect(updatedUser2.points).toBe(60);
    });
  });
});
