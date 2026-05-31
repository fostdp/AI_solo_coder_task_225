const request = require('supertest');
const mongoose = require('mongoose');
const {
  createTestApp,
  createTestUser,
  createTestBook,
  createBorrowRecord,
  createReservation,
  setDateTo,
  getDayStart
} = require('./helpers');

const app = createTestApp();

describe('续借逻辑测试', () => {
  describe('到期日边界时间戳校验', () => {
    test('到期日当天应该允许续借', async () => {
      const user = await createTestUser();
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = new Date(today);
      const borrowDate = setDateTo(today, -14);
      
      const borrowRecord = await createBorrowRecord(user, book, {
        borrowDate,
        dueDate
      });
      
      const response = await request(app)
        .post(`/api/borrows/${borrowRecord._id}/renew`);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('续借成功');
      expect(response.body.record.isRenewed).toBe(true);
    });

    test('到期日前一天应该允许续借', async () => {
      const user = await createTestUser();
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, 1);
      const borrowDate = setDateTo(today, -13);
      
      const borrowRecord = await createBorrowRecord(user, book, {
        borrowDate,
        dueDate
      });
      
      const response = await request(app)
        .post(`/api/borrows/${borrowRecord._id}/renew`);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('续借成功');
    });

    test('到期日后一天应该不允许续借', async () => {
      const user = await createTestUser();
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, -1);
      const borrowDate = setDateTo(today, -15);
      
      const borrowRecord = await createBorrowRecord(user, book, {
        borrowDate,
        dueDate
      });
      
      const response = await request(app)
        .post(`/api/borrows/${borrowRecord._id}/renew`);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('已逾期，不能续借');
    });

    test('到期日当天晚些时候（如23:59）应该仍允许续借', async () => {
      const user = await createTestUser();
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setHours(23, 59, 59, 999);
      const borrowDate = setDateTo(today, -14);
      
      const borrowRecord = await createBorrowRecord(user, book, {
        borrowDate,
        dueDate
      });
      
      const response = await request(app)
        .post(`/api/borrows/${borrowRecord._id}/renew`);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('续借成功');
    });

    test('已续借过一次的图书不允许再次续借', async () => {
      const user = await createTestUser();
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, 7);
      
      const borrowRecord = await createBorrowRecord(user, book, {
        dueDate,
        isRenewed: true
      });
      
      const response = await request(app)
        .post(`/api/borrows/${borrowRecord._id}/renew`);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('您已续借过一次，不能再次续借');
    });

    test('已归还的图书不允许续借', async () => {
      const user = await createTestUser();
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, 7);
      
      const borrowRecord = await createBorrowRecord(user, book, {
        dueDate,
        status: 'returned',
        returnDate: new Date()
      });
      
      const response = await request(app)
        .post(`/api/borrows/${borrowRecord._id}/renew`);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('此借阅记录不是有效状态');
    });
  });

  describe('续借引发的预约时间更新', () => {
    test('续借成功后应更新所有待处理预约的预期到书时间', async () => {
      const borrower = await createTestUser({ name: '借阅者' });
      const reserver1 = await createTestUser({ name: '预约者1' });
      const reserver2 = await createTestUser({ name: '预约者2' });
      const book = await createTestBook();
      
      const today = new Date();
      const originalDueDate = setDateTo(today, 7);
      const expectedNewDueDate = setDateTo(originalDueDate, 14);
      
      const borrowRecord = await createBorrowRecord(borrower, book, {
        dueDate: originalDueDate
      });
      
      const reservation1 = await createReservation(reserver1, book, {
        expectedAvailableDate: originalDueDate
      });
      const reservation2 = await createReservation(reserver2, book, {
        expectedAvailableDate: originalDueDate
      });
      
      await request(app)
        .post(`/api/borrows/${borrowRecord._id}/renew`);
      
      const Reservation = mongoose.model('Reservation');
      const updatedReservation1 = await Reservation.findById(reservation1._id);
      const updatedReservation2 = await Reservation.findById(reservation2._id);
      
      expect(getDayStart(updatedReservation1.expectedAvailableDate).getTime())
        .toBe(getDayStart(expectedNewDueDate).getTime());
      expect(getDayStart(updatedReservation2.expectedAvailableDate).getTime())
        .toBe(getDayStart(expectedNewDueDate).getTime());
    });

    test('有预约的图书不允许续借', async () => {
      const borrower = await createTestUser({ name: '借阅者' });
      const reserver = await createTestUser({ name: '预约者' });
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, 7);
      
      await createBorrowRecord(borrower, book, {
        dueDate
      });
      
      const response = await request(app)
        .post('/api/reservations')
        .send({
          userId: reserver._id.toString(),
          bookId: book._id.toString()
        });
      
      expect(response.status).toBe(201);
      
      const BorrowRecord = mongoose.model('BorrowRecord');
      const borrowRecord = await BorrowRecord.findOne({
        user: borrower._id,
        book: book._id
      });
      
      const renewResponse = await request(app)
        .post(`/api/borrows/${borrowRecord._id}/renew`);
      
      expect(renewResponse.status).toBe(400);
      expect(renewResponse.body.error).toBe('此书有预约，不能续借');
    });

    test('已兑现的预约不影响续借', async () => {
      const borrower = await createTestUser({ name: '借阅者' });
      const reserver = await createTestUser({ name: '预约者' });
      const book = await createTestBook();
      
      const today = new Date();
      const dueDate = setDateTo(today, 7);
      
      const borrowRecord = await createBorrowRecord(borrower, book, {
        dueDate
      });
      
      await createReservation(reserver, book, {
        status: 'fulfilled',
        expectedAvailableDate: dueDate
      });
      
      const response = await request(app)
        .post(`/api/borrows/${borrowRecord._id}/renew`);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('续借成功');
    });

    test('续借后续借日期应正确延长14天', async () => {
      const user = await createTestUser();
      const book = await createTestBook();
      
      const today = new Date();
      const originalDueDate = setDateTo(today, 7);
      const expectedNewDueDate = setDateTo(originalDueDate, 14);
      
      const borrowRecord = await createBorrowRecord(user, book, {
        dueDate: originalDueDate
      });
      
      const response = await request(app)
        .post(`/api/borrows/${borrowRecord._id}/renew`);
      
      expect(response.status).toBe(200);
      
      const returnedDueDate = new Date(response.body.record.dueDate);
      expect(getDayStart(returnedDueDate).getTime())
        .toBe(getDayStart(expectedNewDueDate).getTime());
    });
  });
});
