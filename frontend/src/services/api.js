import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const userAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data)
};

export const bookAPI = {
  getAll: (status) => api.get('/books', { params: { status } }),
  getById: (id) => api.get(`/books/${id}`),
  getByQRCode: (qrCode) => api.get(`/books/qrcode/${qrCode}`),
  create: (data) => api.post('/books', data),
  update: (id, data) => api.put(`/books/${id}`, data),
  delete: (id) => api.delete(`/books/${id}`)
};

export const borrowAPI = {
  scan: (data) => api.post('/borrows/scan', data),
  returnBook: (id) => api.post(`/borrows/${id}/return`),
  renew: (id) => api.post(`/borrows/${id}/renew`),
  getAll: (params) => api.get('/borrows', { params }),
  getById: (id) => api.get(`/borrows/${id}`)
};

export const reservationAPI = {
  create: (data) => api.post('/reservations', data),
  getAll: (params) => api.get('/reservations', { params }),
  getById: (id) => api.get(`/reservations/${id}`),
  cancel: (id) => api.put(`/reservations/${id}/cancel`)
};

export const overdueAPI = {
  check: () => api.post('/overdue/check'),
  getRecords: (params) => api.get('/overdue/records', { params }),
  getUserInfo: (userId) => api.get(`/overdue/users/${userId}/overdue-info`),
  simulateOverdue: (recordId) => api.post('/overdue/simulate-overdue', { recordId })
};

export const analyticsAPI = {
  getHotBooks: (params) => api.get('/analytics/hot', { params }),
  getCategories: () => api.get('/analytics/categories'),
  getTrending: (params) => api.get('/analytics/trending', { params }),
  getNewArrivals: (params) => api.get('/analytics/new-arrivals', { params })
};

export const recommendationAPI = {
  getPersonalized: (userId, params) => api.get(`/recommendations/${userId}`, { params }),
  getSimilar: (userId, params) => api.get(`/recommendations/${userId}/similar`, { params }),
  getUserHistory: (userId) => api.get(`/recommendations/${userId}/history`)
};

export const storeAPI = {
  getProducts: (params) => api.get('/store/products', { params }),
  getProductById: (id) => api.get(`/store/products/${id}`),
  createProduct: (data) => api.post('/store/products', data),
  updateProduct: (id, data) => api.put(`/store/products/${id}`, data),
  createOrder: (data) => api.post('/store/orders', data),
  getOrders: (params) => api.get('/store/orders', { params }),
  getOrderById: (id) => api.get(`/store/orders/${id}`),
  updateOrderStatus: (id, status) => api.put(`/store/orders/${id}/status`, { status }),
  getCategories: () => api.get('/store/categories')
};

export const donationAPI = {
  create: (data) => api.post('/donations', data),
  getAll: (params) => api.get('/donations', { params }),
  getById: (id) => api.get(`/donations/${id}`),
  approve: (id) => api.put(`/donations/${id}/approve`),
  reject: (id, reason) => api.put(`/donations/${id}/reject`, { reason }),
  getConditions: () => api.get('/donations/conditions/points'),
  getUserStats: (userId) => api.get(`/donations/stats/user/${userId}`)
};

export default api;
