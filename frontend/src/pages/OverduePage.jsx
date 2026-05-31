import React, { useState, useEffect } from 'react';
import { overdueAPI, userAPI } from '../services/api';
import { useApp } from '../context/AppContext';

const OverduePage = () => {
  const { currentUser, setCurrentUser, showNotification } = useApp();
  const [users, setUsers] = useState([]);
  const [overdueInfo, setOverdueInfo] = useState(null);
  const [allOverdueRecords, setAllOverdueRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadUsers();
    loadAllOverdueRecords();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadUserOverdueInfo();
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

  const loadUserOverdueInfo = async () => {
    if (!currentUser) return;
    
    try {
      const response = await overdueAPI.getUserInfo(currentUser._id);
      setOverdueInfo(response.data);
    } catch (error) {
      console.error('加载逾期信息失败:', error);
    }
  };

  const loadAllOverdueRecords = async () => {
    setLoading(true);
    try {
      const response = await overdueAPI.getRecords();
      setAllOverdueRecords(response.data);
    } catch (error) {
      showNotification('error', '加载逾期记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOverdue = async () => {
    setChecking(true);
    try {
      const response = await overdueAPI.check();
      showNotification('success', response.data.message);
      await loadAllOverdueRecords();
      if (currentUser) {
        await loadUserOverdueInfo();
        const userResponse = await userAPI.getById(currentUser._id);
        setCurrentUser(userResponse.data);
      }
    } catch (error) {
      showNotification('error', '逾期检测失败');
    } finally {
      setChecking(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="container">
      <div className="card">
        <h2>逾期管理</h2>
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <button 
            className="btn btn-warning"
            onClick={handleCheckOverdue}
            disabled={checking}
          >
            {checking ? '检测中...' : '执行逾期检测'}
          </button>
          <button 
            className="btn btn-success"
            onClick={loadAllOverdueRecords}
          >
            刷新列表
          </button>
        </div>

        <div className="user-selector">
          <label>查看用户逾期信息:</label>
          <select
            value={currentUser?._id || ''}
            onChange={(e) => {
              const user = users.find(u => u._id === e.target.value);
              setCurrentUser(user);
            }}
          >
            {users.map(user => (
              <option key={user._id} value={user._id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        {overdueInfo && (
          <div className="grid-2">
            <div className="card" style={{ margin: 0 }}>
              <h3>用户信息</h3>
              <p><strong>姓名:</strong> {overdueInfo.user.name}</p>
              <p>
                <strong>当前积分:</strong> 
                <span className="points-badge" style={{ marginLeft: '8px' }}>
                  {overdueInfo.user.currentPoints}
                </span>
              </p>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <h3>逾期统计</h3>
              <p><strong>逾期图书数:</strong> {overdueInfo.overdueCount} 本</p>
              <p><strong>总逾期天数:</strong> {overdueInfo.totalOverdueDays} 天</p>
              <p><strong>已扣积分:</strong> {overdueInfo.totalPointsDeducted} 分</p>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>所有逾期记录</h3>
        
        {loading ? (
          <p>加载中...</p>
        ) : allOverdueRecords.length === 0 ? (
          <div className="alert alert-success">
            当前没有逾期记录
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>用户</th>
                <th>书名</th>
                <th>借阅日期</th>
                <th>到期日期</th>
                <th>逾期天数</th>
                <th>已扣积分</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {allOverdueRecords.map(record => (
                <tr key={record._id}>
                  <td>{record.user.name}</td>
                  <td>{record.book.title}</td>
                  <td>{formatDate(record.borrowDate)}</td>
                  <td>{formatDate(record.dueDate)}</td>
                  <td>
                    <span className="status-badge status-overdue">
                      {record.overdueDays} 天
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#dc3545', fontWeight: '600' }}>
                      -{record.pointsDeducted}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${record.status === 'returned' ? 'available' : 'overdue'}`}>
                      {record.status === 'returned' ? '已归还' : '未归还'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>逾期规则</h3>
        <ul style={{ color: '#666', lineHeight: '1.8' }}>
          <li>图书借阅期限为14天</li>
          <li>逾期后每天扣减10积分</li>
          <li>逾期后不能续借</li>
          <li>积分最低为0分</li>
        </ul>
      </div>
    </div>
  );
};

export default OverduePage;
