import React, { useState, useEffect } from 'react';
import { analyticsAPI, userAPI } from '../services/api';
import { useApp } from '../context/AppContext';

const AnalyticsPage = () => {
  const { currentUser, setCurrentUser, showNotification } = useApp();
  const [users, setUsers] = useState([]);
  const [hotBooks, setHotBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [trending, setTrending] = useState({ weekly: [], monthly: [] });
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

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

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [hotRes, catRes, trendRes, newRes] = await Promise.all([
        analyticsAPI.getHotBooks({ days: period, limit: 10 }),
        analyticsAPI.getCategories(),
        analyticsAPI.getTrending({ limit: 5 }),
        analyticsAPI.getNewArrivals({ limit: 5 })
      ]);
      
      setHotBooks(hotRes.data.books || []);
      setCategories(catRes.data || []);
      setTrending(trendRes.data || { weekly: [], monthly: [] });
      setNewArrivals(newRes.data.books || []);
    } catch (error) {
      showNotification('error', '加载数据失败');
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
        <h2>📊 热门图书分析</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label>统计周期: </label>
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            style={{ marginLeft: '8px', padding: '8px' }}
          >
            <option value={7}>最近7天</option>
            <option value={14}>最近14天</option>
            <option value={30}>最近30天</option>
            <option value={90}>最近90天</option>
          </select>
          <button 
            className="btn btn-primary" 
            style={{ marginLeft: '16px' }}
            onClick={loadAnalytics}
            disabled={loading}
          >
            刷新数据
          </button>
        </div>

        {loading ? (
          <p>加载中...</p>
        ) : (
          <>
            <div className="card" style={{ margin: '0 0 20px 0' }}>
              <h3>🔥 热门图书排行榜</h3>
              {hotBooks.length === 0 ? (
                <div className="alert alert-warning">
                  暂无借阅数据
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>排名</th>
                      <th>书名</th>
                      <th>分类</th>
                      <th>周期内借阅</th>
                      <th>总借阅次数</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotBooks.map((book, index) => (
                      <tr key={book._id}>
                        <td>
                          <span style={{
                            background: index < 3 
                              ? ['#FFD700', '#C0C0C0', '#CD7F32'][index] 
                              : '#e0e0e0',
                            padding: '4px 10px',
                            borderRadius: '50%',
                            fontWeight: 'bold',
                            color: index < 3 ? 'white' : '#333'
                          }}>
                            {index + 1}
                          </span>
                        </td>
                        <td>{book.title}</td>
                        <td>{book.category || '未分类'}</td>
                        <td><strong>{book.recentBorrowCount || 0}</strong> 次</td>
                        <td>{book.borrowCount || 0} 次</td>
                        <td>
                          <span className={`status-badge status-${book.status}`}>
                            {getStatusText(book.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="grid-2">
              <div className="card" style={{ margin: 0 }}>
                <h3>📈 周热门趋势</h3>
                {trending.weekly.length === 0 ? (
                  <p>暂无数据</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>书名</th>
                        <th>本周借阅</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trending.weekly.map(book => (
                        <tr key={book._id}>
                          <td>{book.title}</td>
                          <td><strong>{book.weeklyCount}</strong> 次</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="card" style={{ margin: 0 }}>
                <h3>📊 月热门趋势</h3>
                {trending.monthly.length === 0 ? (
                  <p>暂无数据</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>书名</th>
                        <th>本月借阅</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trending.monthly.map(book => (
                        <tr key={book._id}>
                          <td>{book.title}</td>
                          <td><strong>{book.monthlyCount}</strong> 次</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="card" style={{ margin: '20px 0 0 0' }}>
              <h3>🆕 新书上架</h3>
              {newArrivals.length === 0 ? (
                <p>暂无新书</p>
              ) : (
                <div className="book-list">
                  {newArrivals.map(book => (
                    <div key={book._id} className="book-item">
                      <h3>{book.title}</h3>
                      <p><strong>作者:</strong> {book.author || '未知'}</p>
                      <p><strong>分类:</strong> {book.category || '未分类'}</p>
                      <p><strong>入库时间:</strong> {formatDate(book.createdAt)}</p>
                      <p>
                        <strong>状态:</strong> 
                        <span className={`status-badge status-${book.status}`} style={{ marginLeft: '8px' }}>
                          {getStatusText(book.status)}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {categories.length > 0 && (
              <div className="card" style={{ margin: '20px 0 0 0' }}>
                <h3>📚 分类借阅统计</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>分类</th>
                      <th>图书数量</th>
                      <th>总借阅次数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat.category}>
                        <td><strong>{cat.category}</strong></td>
                        <td>{cat.count} 本</td>
                        <td>{cat.totalBorrows} 次</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
