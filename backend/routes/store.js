const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

router.get('/products', async (req, res) => {
  try {
    const { category, minPoints, maxPoints, status } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    else filter.status = 'active';

    if (minPoints || maxPoints) {
      filter.pointsPrice = {};
      if (minPoints) filter.pointsPrice.$gte = parseInt(minPoints);
      if (maxPoints) filter.pointsPrice.$lte = parseInt(maxPoints);
    }

    const products = await Product.find(filter)
      .sort({ pointsPrice: 1 });

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const { name, description, category, pointsPrice, stock, image } = req.body;

    const product = new Product({
      name,
      description,
      category,
      pointsPrice,
      stock: stock || 0,
      image,
      status: (stock && stock > 0) ? 'active' : 'out_of_stock'
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { name, description, category, pointsPrice, stock, image, status } = req.body;
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }

    product.name = name || product.name;
    product.description = description || product.description;
    product.category = category || product.category;
    product.pointsPrice = pointsPrice !== undefined ? pointsPrice : product.pointsPrice;
    product.stock = stock !== undefined ? stock : product.stock;
    product.image = image !== undefined ? image : product.image;
    product.status = status !== undefined ? status : 
      (product.stock > 0 ? 'active' : 'out_of_stock');
    product.updatedAt = new Date();

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const { userId, productId, quantity = 1, address, contactPhone, remark } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }

    if (product.status !== 'active' && product.status !== 'inactive') {
      return res.status(400).json({ error: '该商品暂时无法兑换' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: '库存不足' });
    }

    const totalPoints = product.pointsPrice * quantity;
    if (user.points < totalPoints) {
      return res.status(400).json({ 
        error: `积分不足，需要 ${totalPoints} 积分，当前有 ${user.points} 积分` 
      });
    }

    user.points -= totalPoints;
    await user.save();

    product.stock -= quantity;
    if (product.stock === 0) {
      product.status = 'out_of_stock';
    }
    product.updatedAt = new Date();
    await product.save();

    const order = new Order({
      user: userId,
      product: productId,
      quantity,
      pointsSpent: totalPoints,
      address,
      contactPhone,
      remark,
      status: 'pending'
    });

    await order.save();
    await order.populate('product');
    await order.populate('user', 'name');

    res.status(201).json({
      message: '兑换成功',
      order,
      remainingPoints: user.points
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { userId, status } = req.query;
    const filter = {};

    if (userId) filter.user = userId;
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('product')
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('product')
      .populate('user', 'name');

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '无效的订单状态' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    if (status === 'cancelled' && order.status !== 'pending') {
      return res.status(400).json({ error: '只能取消待处理的订单' });
    }

    if (status === 'cancelled') {
      const user = await User.findById(order.user);
      if (user) {
        user.points += order.pointsSpent;
        await user.save();
      }

      const product = await Product.findById(order.product);
      if (product) {
        product.stock += order.quantity;
        if (product.status === 'out_of_stock' && product.stock > 0) {
          product.status = 'active';
        }
        product.updatedAt = new Date();
        await product.save();
      }
    }

    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    await order.populate('product');
    await order.populate('user', 'name');

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          minPrice: { $min: '$pointsPrice' },
          maxPrice: { $max: '$pointsPrice' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          minPrice: 1,
          maxPrice: 1,
          _id: 0
        }
      }
    ]);

    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
