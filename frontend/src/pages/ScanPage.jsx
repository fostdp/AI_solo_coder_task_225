import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { borrowAPI, bookAPI, userAPI } from '../services/api';
import { useApp } from '../context/AppContext';

const ScanPage = () => {
  const { currentUser, setCurrentUser, showNotification } = useApp();
  const [users, setUsers] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scannedBook, setScannedBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualQR, setManualQR] = useState('');
  const scannerRef = useRef(null);
  const qrCodeRef = useRef(null);

  useEffect(() => {
    loadUsers();
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

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

  const startScanning = async () => {
    try {
      setScanning(true);
      qrCodeRef.current = `qr-reader-${Date.now()}`;
      
      setTimeout(async () => {
        scannerRef.current = new Html5Qrcode(qrCodeRef.current);
        await scannerRef.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          onScanFailure
        );
      }, 100);
    } catch (error) {
      showNotification('error', '无法启动摄像头: ' + error.message);
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
      }
    } catch (error) {
      console.error('停止扫描失败:', error);
    }
    setScanning(false);
  };

  const onScanSuccess = async (decodedText) => {
    try {
      await stopScanning();
      await handleQRCode(decodedText);
    } catch (error) {
      console.error('扫描处理失败:', error);
    }
  };

  const onScanFailure = (error) => {
  };

  const handleQRCode = async (qrCode) => {
    if (!currentUser) {
      showNotification('error', '请先选择用户');
      return;
    }

    setLoading(true);
    try {
      const bookResponse = await bookAPI.getByQRCode(qrCode);
      setScannedBook(bookResponse.data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        showNotification('error', '未找到该图书');
      } else {
        showNotification('error', '查询图书失败: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async () => {
    if (!currentUser || !scannedBook) return;

    setLoading(true);
    try {
      const response = await borrowAPI.scan({
        qrCode: scannedBook.qrCode,
        userId: currentUser._id
      });
      
      showNotification('success', response.data.message);
      setScannedBook(null);
      setManualQR('');
    } catch (error) {
      if (error.response && error.response.data) {
        showNotification('error', error.response.data.error);
      } else {
        showNotification('error', '借阅失败: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualInput = () => {
    if (manualQR.trim()) {
      handleQRCode(manualQR.trim());
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

  return (
    <div className="container">
      <div className="card">
        <h2>扫码借阅</h2>
        
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

        {!scanning ? (
          <button 
            className="btn btn-primary"
            onClick={startScanning}
          >
            开始扫码
          </button>
        ) : (
          <div>
            <div id={qrCodeRef.current} className="qr-scanner" style={{ width: '100%', maxWidth: '400px' }}></div>
            <button 
              className="btn btn-danger"
              onClick={stopScanning}
              style={{ marginTop: '16px' }}
            >
              停止扫描
            </button>
          </div>
        )}

        <div className="card" style={{ marginTop: '24px', marginBottom: 0 }}>
          <h3>手动输入二维码</h3>
          <div className="form-group">
            <input
              type="text"
              placeholder="输入二维码内容"
              value={manualQR}
              onChange={(e) => setManualQR(e.target.value)}
            />
          </div>
          <button 
            className="btn btn-success"
            onClick={handleManualInput}
            disabled={!manualQR.trim() || loading}
          >
            查询图书
          </button>
        </div>

        {scannedBook && (
          <div className="scanned-result" style={{ marginTop: '24px' }}>
            <h3>扫描结果</h3>
            <p><strong>书名:</strong> {scannedBook.title}</p>
            <p><strong>作者:</strong> {scannedBook.author || '未知'}</p>
            <p><strong>ISBN:</strong> {scannedBook.isbn || '未知'}</p>
            <p>
              <strong>状态:</strong> 
              <span className={`status-badge status-${scannedBook.status}`} style={{ marginLeft: '8px' }}>
                {getStatusText(scannedBook.status)}
              </span>
            </p>
            {scannedBook.currentBorrower && (
              <p><strong>当前借阅者:</strong> {scannedBook.currentBorrower.name}</p>
            )}
            
            {scannedBook.status === 'available' && (
              <button 
                className="btn btn-primary"
                onClick={handleBorrow}
                disabled={loading}
                style={{ marginTop: '16px' }}
              >
                {loading ? '处理中...' : '确认借阅'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanPage;
