import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import ScanPage from './pages/ScanPage';
import RenewPage from './pages/RenewPage';
import OverduePage from './pages/OverduePage';
import ReservationPage from './pages/ReservationPage';
import BooksPage from './pages/BooksPage';
import AnalyticsPage from './pages/AnalyticsPage';
import RecommendationPage from './pages/RecommendationPage';
import StorePage from './pages/StorePage';
import DonationPage from './pages/DonationPage';

const Notification = () => {
  const { notification } = useApp();
  
  if (!notification) return null;
  
  return (
    <div className={`alert alert-${notification.type}`} style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      maxWidth: '400px'
    }}>
      {notification.message}
    </div>
  );
};

const AppContent = () => {
  return (
    <div className="app">
      <Notification />
      
      <header className="header">
        <div className="header-content">
          <h1>📚 图书借阅站</h1>
          <nav className="nav">
            <NavLink to="/" exact>扫码借阅</NavLink>
            <NavLink to="/renew">续借归还</NavLink>
            <NavLink to="/overdue">逾期管理</NavLink>
            <NavLink to="/reservations">预约管理</NavLink>
            <NavLink to="/analytics">热门分析</NavLink>
            <NavLink to="/recommendations">个性化推荐</NavLink>
            <NavLink to="/store">积分商城</NavLink>
            <NavLink to="/donation">捐书换积分</NavLink>
            <NavLink to="/books">图书管理</NavLink>
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<ScanPage />} />
        <Route path="/renew" element={<RenewPage />} />
        <Route path="/overdue" element={<OverduePage />} />
        <Route path="/reservations" element={<ReservationPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/recommendations" element={<RecommendationPage />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/donation" element={<DonationPage />} />
        <Route path="/books" element={<BooksPage />} />
      </Routes>
    </div>
  );
};

const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
