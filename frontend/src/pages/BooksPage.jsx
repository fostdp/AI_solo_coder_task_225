import React, { useState, useEffect } from 'react';
import { bookAPI, userAPI } from '../services/api';
import { useApp } from '../context/AppContext';

const CATEGORIES = [
  '未分类', '小说', '编程', '计算机', '数学', '物理', '化学', '生物',
  '历史', '哲学', '文学', '艺术', '经济', '管理', '心理学', '教育',
  '科技', '科幻', '悬疑', '言情', '其他'
];

const BooksPage = () => {
  const { showNotification } = useApp();
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '未分类',
    tags: '',
    description: ''
  });
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    loadBooks();
    loadUsers();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const response = await bookAPI.getAll();
      setBooks(response.data);
    } catch (error) {
      showNotification('error', '加载图书失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await userAPI.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('加载用户失败:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      showNotification('error', '请输入书名');
      return;
    }

    setLoading(true);
    try {
      const tags = formData.tags
        ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];
      
      const data = {
        ...formData,
        tags
      };

      const response = await bookAPI.create(data);
      showNotification('success', '图书添加成功');
      setFormData({
        title: '',
        author: '',
        isbn: '',
        category: '未分类',
        tags: '',
        description: ''
      });
      loadBooks();
    } catch (error) {
      showNotification('error', '添加图书失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      available: '可借',
      borrowed: '已借',
      reserved: '预约中',
      donated: '捐赠'
    };
    return statusMap[status] || status;
  };

  const handleCreateSampleData = async () => {
    const sampleUsers = [
      { name: '张三', email: 'zhangsan@example.com', phone: '13800138001' },
      { name: '李四', email: 'lisi@example.com', phone: '13800138002' },
      { name: '王五', email: 'wangwu@example.com', phone: '13800138003' }
    ];

    const sampleBooks = [
      { title: 'JavaScript高级程序设计', author: 'Matt Frisbie', isbn: '978-7-115-54562-0', category: '编程', tags: ['JavaScript', '前端', 'Web开发'] },
      { title: '深入理解计算机系统', author: 'Randal E.Bryant', isbn: '978-7-111-54493-7', category: '计算机', tags: ['计算机系统', '底层原理'] },
      { title: '算法导论', author: 'Thomas H.Cormen', isbn: '978-7-111-40701-0', category: '计算机', tags: ['算法', '数据结构'] },
      { title: '代码整洁之道', author: 'Robert C. Martin', isbn: '978-7-115-21748-4', category: '编程', tags: ['代码质量', '最佳实践'] },
      { title: '设计模式', author: 'Erich Gamma', isbn: '978-7-111-21126-6', category: '编程', tags: ['设计模式', '架构'] },
      { title: '三体', author: '刘慈欣', isbn: '978-7-5366-9293-0', category: '科幻', tags: ['科幻', '刘慈欣', '宇宙'] },
      { title: '活着', author: '余华', isbn: '978-7-5063-3043-5', category: '文学', tags: ['文学', '余华', '经典'] },
      { title: '百年孤独', author: '加西亚·马尔克斯', isbn: '978-7-5442-5399-4', category: '文学', tags: ['魔幻现实主义', '经典'] }
    ];

    setLoading(true);
    try {
      for (const user of sampleUsers) {
        await userAPI.create(user);
      }
      
      for (const book of sampleBooks) {
        await bookAPI.create(book);
      }
      
      showNotification('success', '示例数据创建成功');
      loadBooks();
      loadUsers();
    } catch (error) {
      showNotification('error', '创建示例数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = filterCategory
    ? books.filter(book => book.category === filterCategory)
    : books;

  const allCategories = [...new Set(books.map(b => b.category).filter(Boolean))];

  return (
    <div className="container">
      <div className="card">
        <h2>图书管理</h2>
        
        <button 
          className="btn btn-success"
          onClick={handleCreateSampleData}
          disabled={loading}
          style={{ marginBottom: '24px' }}
        >
          创建示例数据（用户和图书）
        </button>

        <form onSubmit={handleSubmit}>
          <h3>添加新图书</h3>
          <div className="grid-2">
            <div className="form-group">
              <label>书名 *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="输入书名"
              />
            </div>
            <div className="form-group">
              <label>作者</label>
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                placeholder="输入作者"
              />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>ISBN</label>
              <input
                type="text"
                name="isbn"
                value={formData.isbn}
                onChange={handleInputChange}
                placeholder="输入ISBN"
              />
            </div>
            <div className="form-group">
              <label>分类</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>标签（逗号分隔）</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="例如：科幻, 经典, 推荐"
            />
          </div>
          <div className="form-group">
            <label>简介</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="图书简介"
              style={{ width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', minHeight: '80px' }}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? '添加中...' : '添加图书'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>图书列表</h3>
        
        {allCategories.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <label>按分类筛选: </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ marginLeft: '8px', padding: '8px' }}
            >
              <option value="">全部分类</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
        
        {loading ? (
          <p>加载中...</p>
        ) : filteredBooks.length === 0 ? (
          <div className="alert alert-warning">
            当前没有图书，请先添加图书或点击"创建示例数据"
          </div>
        ) : (
          <div className="book-list">
            {filteredBooks.map(book => (
              <div key={book._id} className="book-item">
                <h3>{book.title}</h3>
                <p><strong>作者:</strong> {book.author || '未知'}</p>
                <p><strong>分类:</strong> {book.category || '未分类'}</p>
                <p><strong>ISBN:</strong> {book.isbn || '未知'}</p>
                {book.tags && book.tags.length > 0 && (
                  <p>
                    <strong>标签:</strong> 
                    {book.tags.map((tag, i) => (
                      <span key={i} style={{ 
                        background: '#e7f3ff', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        margin: '0 4px', 
                        fontSize: '12px' 
                      }}>
                        {tag}
                      </span>
                    ))}
                  </p>
                )}
                <p><strong>借阅次数:</strong> {book.borrowCount || 0} 次</p>
                <p>
                  <strong>状态:</strong> 
                  <span className={`status-badge status-${book.status}`} style={{ marginLeft: '8px' }}>
                    {getStatusText(book.status)}
                  </span>
                </p>
                {book.currentBorrower && (
                  <p><strong>借阅者:</strong> {book.currentBorrower.name}</p>
                )}
                {book.donor && (
                  <p><strong>捐赠者:</strong> {book.donor.name || '未知'}</p>
                )}
                <p style={{ 
                  fontSize: '12px', 
                  color: '#999',
                  wordBreak: 'break-all'
                }}>
                  <strong>二维码:</strong> {book.qrCode}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BooksPage;
