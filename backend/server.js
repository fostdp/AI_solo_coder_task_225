const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library')
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

const userRoutes = require('./routes/users');
const bookRoutes = require('./routes/books');
const borrowRoutes = require('./routes/borrows');
const reservationRoutes = require('./routes/reservations');
const overdueRoutes = require('./routes/overdue');
const analyticsRoutes = require('./routes/analytics');
const recommendationRoutes = require('./routes/recommendations');
const storeRoutes = require('./routes/store');
const donationRoutes = require('./routes/donations');

app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/borrows', borrowRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/overdue', overdueRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/donations', donationRoutes);

app.get('/', (req, res) => {
  res.json({ message: '图书借阅站后端服务运行中' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
