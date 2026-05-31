import React, { useState, useEffect } from 'react';
import { borrowAPI, userAPI } from '../services/api';
import { useApp } from '../context/AppContext';

const RenewPage = () => {
  const { currentUser, setCurrentUser, showNotification } = useApp();
  const [users, setUsers] = useState([]);
  const [borrowRecords, setBorrowRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadBorrowRecords();
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

  const loadBorrowRecords = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const response = await borrowAPI.getAll({ 
        userId: currentUser._id,
        status: 'active'
      });
      setBorrowRecords(response.data);
    } catch (error) {
      showNotification('error', '加载借阅记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (recordId) => {
    setProcessingId(recordId);
    try {
      const response = await borrowAPI.renew(recordId);
      showNotification('success', response.data.message);
      loadBorrowRecords();
    } catch (error) {
      if (error.response && error.response.data) {
        showNotification('error', error.response.data.error);
      } else {
        showNotification('error', '续借失败');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReturn = async (recordId) => {
    setProcessingId(recordId);
    try {
      const response = await borrowAPI.returnBook(recordId);
      showNotification('success', response.data.message);
      loadBorrowRecords();
    } catch (error) {
      if (error.response && error.response.data) {
        showNotification('error', error.response.data.error);
      } else {
        showNotification('error', '归还失败');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getDaysUntilDue = (dueDate) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = new Date(dueDate);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const diff = Math.ceil((dueDay - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const canRenewBook = (record) => {
    if (record.isRenewed) return false;
    const daysUntilDue = getDaysUntilDue(record.dueDate);
    return daysUntilDue >= 0;
  };

  return (
    <div className="container">
      <div className="card">
        <h2>续借与归还</h2>
        
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

        {loading ? (
          <p>加载中...</p>
        ) : borrowRecords.length === 0 ? (
          <div className="alert alert-warning">
            当前没有正在借阅的图书
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>书名</th>
                <th>借阅日期</th>
                <th>到期日期</th>
                <th>剩余天数</th>
                <th>是否已续借</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {borrowRecords.map(record => {
                const daysUntilDue = getDaysUntilDue(record.dueDate);
                const canRenew = canRenewBook(record);
                
                return (
                  <tr key={record._id}>
                    <td>{record.book.title}</td>
                    <td>{formatDate(record.borrowDate)}</td>
                    <td>{formatDate(record.dueDate)}</td>
                    <td>
                      {daysUntilDue > 0 ? (
                        <span style={{ color: daysUntilDue <= 3 ? '#dc3545' : '#28a745' }}>
                          {daysUntilDue} 天
                        </span>
                      ) : (
                        <span className="status-badge status-overdue">
                          已逾期 {Math.abs(daysUntilDue)} 天
                        </span>
                      )}
                    </td>
                    <td>
                      {record.isRenewed ? (
                        <span className="status-badge status-available">
                          已续借
                        </span>
                      ) : (
                        <span className="status-badge status-borrowed">
                          未续借
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {canRenew && (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleRenew(record._id)}
                            disabled={processingId === record._id}
                          >
                            {processingId === record._id ? '处理中...' : '续借'}
                          </button>
                        )}
                        <button
                          className="btn btn-success"
                          onClick={() => handleReturn(record._id)}
                          disabled={processingId === record._id}
                        >
                          {processingId === record._id ? '处理中...' : '归还'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>续借规则</h3>
        <ul style={{ color: '#666', lineHeight: '1.8' }}>
          <li>每本书只能续借一次</li>
          <li>续借将延长14天借期</li>
          <li>逾期图书不能续借</li>
          <li>有预约的图书不能续借</li>
        </ul>
      </div>
    </div>
  );
};

export default RenewPage;
