import React, { useState, useEffect } from 'react';
import { reservationAPI, bookAPI, userAPI } from '../services/api';
import { useApp } from '../context/AppContext';

const ReservationPage = () => {
  const { currentUser, setCurrentUser, showNotification } = useApp();
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [userReservations, setUserReservations] = useState([]);
  const [allReservations, setAllReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState('');

  useEffect(() => {
    loadUsers();
    loadBooks();
    loadAllReservations();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadUserReservations();
    }
  }, [currentUser]);

  const loadUsers = async () => {
    try {
      const response = await userAPI.getAll();
      setUsers(response.data);
      if (response.data.length > 0 && !currentUser) {
        setCurrentUser(response.data[0]);
      }
    } catch (error) {
      console.error('加载用户失败:', error);
    }
  };

  const loadBooks = async () => {
    try {
      const availableResponse = await bookAPI.getAll('borrowed');
      const reservedResponse = await bookAPI.getAll('reserved');
      setBooks([...availableResponse.data, ...reservedResponse.data]);
    } catch (error) {
      console.error('加载图书失败:', error);
    }
  };

  const loadUserReservations = async () => {
    if (!currentUser) return;
    
    try {
      const response = await reservationAPI.getAll({ userId: currentUser._id });
      setUserReservations(response.data);
    } catch (error) {
      console.error('加载预约记录失败:', error);
    }
  };

  const loadAllReservations = async () => {
    setLoading(true);
    try {
      const response = await reservationAPI.getAll({ status: 'pending' });
      setAllReservations(response.data);
    } catch (error) {
      showNotification('error', '加载预约记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async () => {
    if (!currentUser || !selectedBook) {
      showNotification('error', '请选择用户和图书');
      return;
    }

    setLoading(true);
    try {
      const response = await reservationAPI.create({
        userId: currentUser._id,
        bookId: selectedBook
      });
      showNotification('success', response.data.message);
      setSelectedBook('');
      loadUserReservations();
      loadAllReservations();
    } catch (error) {
      if (error.response && error.response.data) {
        showNotification('error', error.response.data.error);
      } else {
        showNotification('error', '预约失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (reservationId) => {
    setLoading(true);
    try {
      const response = await reservationAPI.cancel(reservationId);
      showNotification('success', response.data.message);
      loadUserReservations();
      loadAllReservations();
    } catch (error) {
      if (error.response && error.response.data) {
        showNotification('error', error.response.data.error);
      } else {
        showNotification('error', '取消预约失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: '等待中',
      fulfilled: '已兑现',
      cancelled: '已取消',
      expired: '已过期'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="container">
      <div className="card">
        <h2>预约管理</h2>
        
        <div className="user-selector">
          <label>选择用户:</label>
          <select
            value={currentUser?._id || ''}
            onChange={(e) => {
              const user = users.find(u => u._id === e.target.value);
              setCurrentUser(user);
            }}
          >
            {users.map(user => (
              <option key={user._id} value={user._id}>
                {user.name} (积分: {user.points})
              </option>
            ))}
          </select>
          {currentUser && (
            <span className="points-badge">
              积分: {currentUser.points}
            </span>
          )}
        </div>

        <div className="form-group">
          <label>选择要预约的图书:</label>
          <select
            value={selectedBook}
            onChange={(e) => setSelectedBook(e.target.value)}
          >
            <option value="">-- 选择图书 --</option>
            {books.map(book => (
              <option key={book._id} value={book._id}>
                {book.title} ({book.author || '未知作者'})
              </option>
            ))}
          </select>
        </div>

        <button 
          className="btn btn-primary"
          onClick={handleReserve}
          disabled={!selectedBook || loading}
        >
          {loading ? '处理中...' : '提交预约'}
        </button>
      </div>

      <div className="card">
        <h3>我的预约</h3>
        
        {userReservations.length === 0 ? (
          <div className="alert alert-warning">
            当前没有预约记录
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>书名</th>
                <th>预约时间</th>
                <th>预期到书时间</th>
                <th>队列位置</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {userReservations.map(reservation => (
                <tr key={reservation._id}>
                  <td>{reservation.book.title}</td>
                  <td>{formatDate(reservation.reservationDate)}</td>
                  <td>
                    {reservation.expectedAvailableDate 
                      ? formatDate(reservation.expectedAvailableDate)
                      : '待确定'
                    }
                  </td>
                  <td>第 {reservation.queuePosition} 位</td>
                  <td>
                    <span className={`status-badge ${
                      reservation.status === 'pending' ? 'status-borrowed' :
                      reservation.status === 'fulfilled' ? 'status-available' : 'status-overdue'
                    }`}>
                      {getStatusText(reservation.status)}
                    </span>
                  </td>
                  <td>
                    {reservation.status === 'pending' && (
                      <button
                        className="btn btn-danger"
                        onClick={() => handleCancel(reservation._id)}
                        disabled={loading}
                      >
                        取消预约
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>所有等待中的预约</h3>
        
        {loading ? (
          <p>加载中...</p>
        ) : allReservations.length === 0 ? (
          <div className="alert alert-success">
            当前没有等待中的预约
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>用户</th>
                <th>书名</th>
                <th>预约时间</th>
                <th>预期到书时间</th>
                <th>队列位置</th>
              </tr>
            </thead>
            <tbody>
              {allReservations.map(reservation => (
                <tr key={reservation._id}>
                  <td>{reservation.user.name}</td>
                  <td>{reservation.book.title}</td>
                  <td>{formatDate(reservation.reservationDate)}</td>
                  <td>
                    {reservation.expectedAvailableDate 
                      ? formatDate(reservation.expectedAvailableDate)
                      : '待确定'
                    }
                  </td>
                  <td>第 {reservation.queuePosition} 位</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>预约规则</h3>
        <ul style={{ color: '#666', lineHeight: '1.8' }}>
          <li>只能预约已借出的图书</li>
          <li>预约后按顺序排队等候</li>
          <li>当图书归还时，排在第一位的用户可以借阅</li>
          <li>有预约的图书不能续借</li>
          <li>可以随时取消自己的预约</li>
        </ul>
      </div>
    </div>
  );
};

export default ReservationPage;
