import React, { useState, useEffect } from 'react';
import { storeAPI, userAPI } from '../services/api';
import { useApp } from '../context/AppContext';

const StorePage = () => {
  const { currentUser, setCurrentUser, showNotification } = useApp();
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderForm, setOrderForm] = useState({
    quantity: 1,
    address: '',
    contactPhone: '',
    remark: ''
  });

  useEffect(() => {
    loadUsers();
    loadCategories();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadProducts();
      loadMyOrders();
    }
  }, [currentUser, filterCategory]);

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

  const loadCategories = async () => {
    try {
      const response = await storeAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = filterCategory ? { category: filterCategory } : {};
      const response = await storeAPI.getProducts(params);
      setProducts(response.data);
    } catch (error) {
      showNotification('error', '加载商品失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMyOrders = async () => {
    if (!currentUser) return;
    try {
      const response = await storeAPI.getOrders({ userId: currentUser._id });
      setMyOrders(response.data);
    } catch (error) {
      console.error('加载订单失败:', error);
    }
  };

  const handleOpenOrderModal = (product) => {
    setSelectedProduct(product);
    setOrderForm({
      quantity: 1,
      address: '',
      contactPhone: currentUser?.phone || '',
      remark: ''
    });
    setShowOrderModal(true);
  };

  const handleCloseOrderModal = () => {
    setShowOrderModal(false);
    setSelectedProduct(null);
  };

  const handleSubmitOrder = async () => {
    if (!selectedProduct || !currentUser) return;

    const totalPoints = selectedProduct.pointsPrice * orderForm.quantity;
    
    if (currentUser.points < totalPoints) {
      showNotification('error', `积分不足，需要 ${totalPoints} 积分`);
      return;
    }

    if (selectedProduct.stock < orderForm.quantity) {
      showNotification('error', '库存不足');
      return;
    }

    if (!orderForm.address || !orderForm.contactPhone) {
      showNotification('error', '请填写收货地址和联系电话');
      return;
    }

    setLoading(true);
    try {
      const response = await storeAPI.createOrder({
        userId: currentUser._id,
        productId: selectedProduct._id,
        quantity: orderForm.quantity,
        address: orderForm.address,
        contactPhone: orderForm.contactPhone,
        remark: orderForm.remark
      });

      showNotification('success', response.data.message);
      
      const updatedUser = { ...currentUser, points: response.data.remainingPoints };
      setCurrentUser(updatedUser);
      
      handleCloseOrderModal();
      loadProducts();
      loadMyOrders();
    } catch (error) {
      if (error.response && error.response.data) {
        showNotification('error', error.response.data.error);
      } else {
        showNotification('error', '下单失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: '待处理',
      processing: '处理中',
      shipped: '已发货',
      delivered: '已送达',
      cancelled: '已取消'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      pending: 'status-borrowed',
      processing: 'status-reserved',
      shipped: 'status-available',
      delivered: 'status-available',
      cancelled: 'status-overdue'
    };
    return classMap[status] || '';
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
        <h2>🛍️ 积分商城</h2>
        
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

        {categories.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <label>分类筛选: </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ marginLeft: '8px', padding: '8px' }}
            >
              <option value="">全部分类</option>
              {categories.map(cat => (
                <option key={cat.category} value={cat.category}>
                  {cat.category} ({cat.count}件)
                </option>
              ))}
            </select>
            <button 
              className="btn btn-primary" 
              style={{ marginLeft: '16px' }}
              onClick={loadProducts}
            >
              刷新商品
            </button>
          </div>
        )}

        {loading ? (
          <p>加载中...</p>
        ) : products.length === 0 ? (
          <div className="alert alert-warning">
            暂无商品
          </div>
        ) : (
          <div className="book-list">
            {products.map(product => (
              <div key={product._id} className="book-item">
                {product.image && (
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }}
                  />
                )}
                <h3>{product.name}</h3>
                <p><strong>分类:</strong> {product.category}</p>
                <p style={{ color: '#666', fontSize: '13px' }}>{product.description}</p>
                <p style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: '#667eea',
                  margin: '12px 0'
                }}>
                  💰 {product.pointsPrice} 积分
                </p>
                <p>
                  <strong>库存:</strong> 
                  <span style={{ 
                    color: product.stock > 0 ? '#28a745' : '#dc3545',
                    marginLeft: '8px'
                  }}>
                    {product.stock > 0 ? `${product.stock} 件` : '缺货'}
                  </span>
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={() => handleOpenOrderModal(product)}
                  disabled={product.status === 'out_of_stock' || product.stock === 0}
                  style={{ marginTop: '12px', width: '100%' }}
                >
                  {product.stock > 0 ? '立即兑换' : '已售罄'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>📦 我的订单</h3>
        {myOrders.length === 0 ? (
          <div className="alert alert-warning">
            暂无订单记录
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>商品</th>
                <th>数量</th>
                <th>消耗积分</th>
                <th>下单时间</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {myOrders.map(order => (
                <tr key={order._id}>
                  <td>{order.product?.name}</td>
                  <td>{order.quantity}</td>
                  <td>-{order.pointsSpent}</td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showOrderModal && selectedProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3>确认兑换</h3>
            
            <div style={{ 
              background: '#f9f9f9', 
              padding: '16px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h4>{selectedProduct.name}</h4>
              <p>{selectedProduct.description}</p>
              <p><strong>单价:</strong> {selectedProduct.pointsPrice} 积分</p>
              <p><strong>库存:</strong> {selectedProduct.stock} 件</p>
            </div>

            <div className="form-group">
              <label>兑换数量</label>
              <input
                type="number"
                min="1"
                max={selectedProduct.stock}
                value={orderForm.quantity}
                onChange={(e) => setOrderForm(prev => ({
                  ...prev,
                  quantity: Math.max(1, Math.min(selectedProduct.stock, parseInt(e.target.value) || 1))
                }))}
              />
            </div>

            <div className="form-group">
              <label>收货地址 *</label>
              <input
                type="text"
                value={orderForm.address}
                onChange={(e) => setOrderForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="请输入收货地址"
              />
            </div>

            <div className="form-group">
              <label>联系电话 *</label>
              <input
                type="text"
                value={orderForm.contactPhone}
                onChange={(e) => setOrderForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="请输入联系电话"
              />
            </div>

            <div className="form-group">
              <label>备注</label>
              <input
                type="text"
                value={orderForm.remark}
                onChange={(e) => setOrderForm(prev => ({ ...prev, remark: e.target.value }))}
                placeholder="备注信息（可选）"
              />
            </div>

            <div style={{ 
              background: '#fff3cd', 
              padding: '12px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <p>
                <strong>总计:</strong> {selectedProduct.pointsPrice * orderForm.quantity} 积分
                {currentUser && (
                  <span style={{ 
                    marginLeft: '12px',
                    color: currentUser.points >= selectedProduct.pointsPrice * orderForm.quantity ? '#28a745' : '#dc3545'
                  }}>
                    (当前积分: {currentUser.points})
                  </span>
                )}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-danger"
                onClick={handleCloseOrderModal}
              >
                取消
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSubmitOrder}
                disabled={loading}
              >
                {loading ? '处理中...' : '确认兑换'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorePage;
