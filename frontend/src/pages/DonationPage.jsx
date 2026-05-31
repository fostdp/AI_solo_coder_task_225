import React, { useState, useEffect } from 'react';
import { donationAPI, userAPI } from '../services/api';
import { useApp } from '../context/AppContext';

const DonationPage = () => {
  const { currentUser, setCurrentUser, showNotification } = useApp();
  const [users, setUsers] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [myDonations, setMyDonations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bookTitle: '',
    bookAuthor: '',
    bookIsbn: '',
    bookCategory: '未分类',
    bookCondition: '九成新',
    description: ''
  });

  const CATEGORIES = [
    '未分类', '小说', '编程', '计算机', '数学', '物理', '化学', '生物',
    '历史', '哲学', '文学', '艺术', '经济', '管理', '心理学', '教育',
    '科技', '科幻', '悬疑', '言情', '其他'
  ];

  useEffect(() => {
    loadUsers();
    loadConditions();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadMyDonations();
      loadStats();
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

  const loadConditions = async () => {
    try {
      const response = await donationAPI.getConditions();
      setConditions(response.data.conditions || []);
    } catch (error) {
      console.error('加载条件失败:', error);
    }
  };

  const loadMyDonations = async () => {
    if (!currentUser) return;
    try {
      const response = await donationAPI.getAll({ userId: currentUser._id });
      setMyDonations(response.data);
    } catch (error) {
      console.error('加载捐赠记录失败:', error);
    }
  };

  const loadStats = async () => {
    if (!currentUser) return;
    try {
      const response = await donationAPI.getUserStats(currentUser._id);
      setStats(response.data);
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      showNotification('error', '请先选择用户');
      return;
    }

    if (!formData.bookTitle) {
      showNotification('error', '请输入书名');
      return;
    }

    setLoading(true);
    try {
      const data = {
        userId: currentUser._id,
        ...formData
      };

      const response = await donationAPI.create(data);
      showNotification('success', response.data.message);
      
      setFormData({
        bookTitle: '',
        bookAuthor: '',
        bookIsbn: '',
        bookCategory: '未分类',
        bookCondition: '九成新',
        description: ''
      });

      loadMyDonations();
      loadStats();
    } catch (error) {
      if (error.response && error.response.data) {
        showNotification('error', error.response.data.error);
      } else {
        showNotification('error', '提交失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      pending: 'status-reserved',
      approved: 'status-available',
      rejected: 'status-overdue'
    };
    return classMap[status] || '';
  };

  const getExpectedPoints = () => {
    const condition = conditions.find(c => c.condition === formData.bookCondition);
    return condition ? condition.points : 20;
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

  return (
    <div className="container">
      <div className="card">
        <h2>📚 捐书换积分</h2>
        
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
              💰 积分: {currentUser.points}
            </span>
          )}
        </div>

        {stats && (
          <div className="grid-2" style={{ margin: '20px 0' }}>
            <div className="card" style={{ margin: 0 }}>
              <h3>📊 我的捐赠统计</h3>
              <p><strong>总捐书:</strong> {stats.stats.totalDonations} 本</p>
              <p><strong>已通过:</strong> {stats.stats.approvedDonations} 本</p>
              <p><strong>累计积分:</strong> +{stats.stats.totalPointsEarned} 分</p>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <h3>💰 积分规则</h3>
              {conditions.map(c => (
                <p key={c.condition}>
                  <strong>{c.condition}:</strong> +{c.points} 分
                  <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>
                    ({c.description})
                  </span>
                </p>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <h3>📖 提交捐书申请</h3>
          
          <div className="grid-2">
            <div className="form-group">
              <label>书名 *</label>
              <input
                type="text"
                name="bookTitle"
                value={formData.bookTitle}
                onChange={handleInputChange}
                placeholder="请输入书名"
              />
            </div>
            <div className="form-group">
              <label>作者</label>
              <input
                type="text"
                name="bookAuthor"
                value={formData.bookAuthor}
                onChange={handleInputChange}
                placeholder="请输入作者"
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>ISBN</label>
              <input
                type="text"
                name="bookIsbn"
                value={formData.bookIsbn}
                onChange={handleInputChange}
                placeholder="请输入ISBN（可选）"
              />
            </div>
            <div className="form-group">
              <label>分类</label>
              <select
                name="bookCategory"
                value={formData.bookCategory}
                onChange={handleInputChange}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>图书成色</label>
              <select
                name="bookCondition"
                value={formData.bookCondition}
                onChange={handleInputChange}
              >
                {conditions.map(c => (
                  <option key={c.condition} value={c.condition}>
                    {c.condition} (+{c.points}分)
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>预计获得积分</label>
              <div style={{ 
                padding: '12px', 
                background: '#e7f3ff', 
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#667eea'
              }}>
                + {getExpectedPoints()} 积分
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>图书描述</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="请描述图书的外观、是否有标注等信息（可选）"
              style={{ width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', minHeight: '80px' }}
            />
          </div>

          <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
            <strong>温馨提示:</strong> 提交申请后，需要管理员审核。审核通过后，积分将自动发放到您的账户。
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? '提交中...' : '提交捐书申请'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>📋 我的捐书记录</h3>
        {myDonations.length === 0 ? (
          <div className="alert alert-warning">
            暂无捐书记录
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>书名</th>
                <th>分类</th>
                <th>成色</th>
                <th>预计积分</th>
                <th>提交时间</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {myDonations.map(donation => (
                <tr key={donation._id}>
                  <td>{donation.bookTitle}</td>
                  <td>{donation.bookCategory}</td>
                  <td>{donation.bookCondition}</td>
                  <td>+{donation.pointsEarned}</td>
                  <td>{formatDate(donation.createdAt)}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(donation.status)}`}>
                      {getStatusText(donation.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DonationPage;
