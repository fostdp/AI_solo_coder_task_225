import React, { useState, useEffect } from 'react';
import { recommendationAPI, userAPI, bookAPI, borrowAPI } from '../services/api';
import { useApp } from '../context/AppContext';

const RecommendationPage = () => {
  const { currentUser, setCurrentUser, showNotification } = useApp();
  const [users, setUsers] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [similarRecommendations, setSimilarRecommendations] = useState([]);
  const [userHistory, setUserHistory] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadRecommendations();
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

  const loadRecommendations = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const [recRes, simRes, histRes] = await Promise.all([
        recommendationAPI.getPersonalized(currentUser._id, { limit: 10 }),
        recommendationAPI.getSimilar(currentUser._id, { limit: 10 }),
        recommendationAPI.getUserHistory(currentUser._id)
      ]);
      
      setRecommendations(recRes.data.recommendations || []);
      setSimilarRecommendations(simRes.data.recommendations || []);
      setUserHistory(histRes.data);
    } catch (error) {
      showNotification('error', '加载推荐失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      available: '可借',
      borrowed: '已借',
      reserved: '预约中'
    };
    return statusMap[status] || status;
  };

  const handleBorrow = async (book) => {
    if (!currentUser) {
      showNotification('error', '请先选择用户');
      return;
    }

    if (book.status !== 'available') {
      showNotification('error', '此书不可借');
      return;
    }

    try {
      await borrowAPI.scan({
        qrCode: book.qrCode,
        userId: currentUser._id
      });
      showNotification('success', '借阅成功');
      loadRecommendations();
    } catch (error) {
      if (error.response && error.response.data) {
        showNotification('error', error.response.data.error);
      } else {
        showNotification('error', '借阅失败');
      }
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>🎯 个性化推荐</h2>
        
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
          <button 
            className="btn btn-primary" 
            onClick={loadRecommendations}
            disabled={loading}
          >
            刷新推荐
          </button>
        </div>

        {userHistory && (
          <div className="grid-2" style={{ marginBottom: '24px' }}>
            <div className="card" style={{ margin: 0 }}>
              <h3>📊 阅读偏好分析</h3>
              <p><strong>总借阅次数:</strong> {userHistory.totalBorrows} 次</p>
              {userHistory.categoryPreferences && userHistory.categoryPreferences.length > 0 && (
                <div>
                  <p><strong>喜爱分类:</strong></p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {userHistory.categoryPreferences.slice(0, 5).map(cp => (
                      <span key={cp.category} style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '16px',
                        fontSize: '12px'
                      }}>
                        {cp.category} ({cp.count}次)
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {userHistory.tagPreferences && userHistory.tagPreferences.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <p><strong>兴趣标签:</strong></p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {userHistory.tagPreferences.slice(0, 8).map(tp => (
                      <span key={tp.tag} style={{
                        background: '#e7f3ff',
                        color: '#667eea',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px'
                      }}>
                        {tp.tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {userHistory.recentBorrows && userHistory.recentBorrows.length > 0 && (
              <div className="card" style={{ margin: 0 }}>
                <h3>📚 最近借阅</h3>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {userHistory.recentBorrows.map(record => (
                    <div key={record._id} style={{
                      padding: '8px',
                      borderBottom: '1px solid #eee',
                      fontSize: '14px'
                    }}>
                      <p><strong>{record.book.title}</strong></p>
                      <p style={{ color: '#666', fontSize: '12px' }}>
                        {record.book.category} | {record.book.tags?.slice(0, 2).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <p>加载中...</p>
        ) : (
          <>
            <div className="card" style={{ margin: '0 0 20px 0' }}>
              <h3>💡 为您推荐</h3>
              {recommendations.length === 0 ? (
                <div className="alert alert-warning">
                  暂无推荐，请先借阅一些图书
                </div>
              ) : (
                <div className="book-list">
                  {recommendations.map(book => (
                    <div key={book._id} className="book-item">
                      <h3>{book.title}</h3>
                      <p><strong>作者:</strong> {book.author || '未知'}</p>
                      <p><strong>分类:</strong> {book.category || '未分类'}</p>
                      {book.tags && book.tags.length > 0 && (
                        <p>
                          {book.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} style={{
                              background: '#e7f3ff',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              margin: '0 4px',
                              fontSize: '11px'
                            }}>
                              {tag}
                            </span>
                          ))}
                        </p>
                      )}
                      <p>
                        <strong>状态:</strong> 
                        <span className={`status-badge status-${book.status}`} style={{ marginLeft: '8px' }}>
                          {getStatusText(book.status)}
                        </span>
                      </p>
                      {book.status === 'available' && (
                        <button 
                          className="btn btn-primary"
                          onClick={() => handleBorrow(book)}
                          style={{ marginTop: '8px' }}
                        >
                          立即借阅
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {similarRecommendations.length > 0 && (
              <div className="card" style={{ margin: '0 0 20px 0' }}>
                <h3>👥 相似用户喜欢</h3>
                <div className="book-list">
                  {similarRecommendations.slice(0, 6).map(book => (
                    <div key={book._id} className="book-item">
                      <h3>{book.title}</h3>
                      <p><strong>作者:</strong> {book.author || '未知'}</p>
                      <p><strong>分类:</strong> {book.category || '未分类'}</p>
                      <p>
                        <strong>状态:</strong> 
                        <span className={`status-badge status-${book.status}`} style={{ marginLeft: '8px' }}>
                          {getStatusText(book.status)}
                        </span>
                      </p>
                      {book.status === 'available' && (
                        <button 
                          className="btn btn-primary"
                          onClick={() => handleBorrow(book)}
                          style={{ marginTop: '8px' }}
                        >
                          立即借阅
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RecommendationPage;
