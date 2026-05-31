# 图书借阅站全栈应用

一个完整的图书借阅管理系统，支持扫码借阅、续借、逾期管理和预约功能。

## 项目结构

```
.
├── backend/          # Node.js + Express 后端
│   ├── models/       # 数据模型
│   │   ├── User.js
│   │   ├── Book.js
│   │   ├── BorrowRecord.js
│   │   └── Reservation.js
│   ├── routes/       # API路由
│   │   ├── users.js
│   │   ├── books.js
│   │   ├── borrows.js
│   │   ├── reservations.js
│   │   └── overdue.js
│   ├── server.js     # 服务器入口
│   ├── package.json
│   └── .env
└── frontend/         # React + Vite 前端
    ├── src/
    │   ├── context/  # React Context
    │   ├── pages/    # 页面组件
    │   ├── services/ # API服务
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## 功能模块

### 1. 扫码借阅模块
- 通过摄像头扫描图书二维码
- 支持手动输入二维码内容
- 自动创建借阅记录
- 默认借阅期限14天

### 2. 续借模块
- 每本书可续借一次
- 续借延长14天借期
- 逾期图书不能续借
- 有预约的图书不能续借

### 3. 逾期管理模块
- 自动检测逾期记录
- 逾期每天扣减10积分
- 积分最低为0分
- 显示用户逾期统计信息

### 4. 预约模块
- 对已借出图书排队预约
- 按预约顺序排列队列
- 图书归还时通知第一位预约者
- 可随时取消预约

## 技术栈

### 后端
- Node.js
- Express.js
- MongoDB (Mongoose)
- CORS支持

### 前端
- React 18
- Vite
- React Router
- html5-qrcode (扫码功能)
- Axios

## 安装和运行

### 前置要求
- Node.js (v14+)
- MongoDB (本地运行或MongoDB Atlas)

### 1. 启动MongoDB
确保MongoDB正在运行在 `mongodb://localhost:27017`

### 2. 安装后端依赖
```bash
cd backend
npm install
```

### 3. 启动后端服务
```bash
npm start
```
后端服务运行在 http://localhost:3001

### 4. 安装前端依赖
```bash
cd ../frontend
npm install
```

### 5. 启动前端开发服务器
```bash
npm run dev
```
前端服务运行在 http://localhost:5173

## 使用流程

1. 打开 http://localhost:5173
2. 进入"图书管理"页面，点击"创建示例数据"按钮
3. 进入"扫码借阅"页面，选择用户
4. 复制图书管理页面中某本书的二维码内容
5. 在扫码借阅页面的"手动输入二维码"框中粘贴并查询
6. 点击"确认借阅"完成借阅
7. 在"续借归还"页面可以续借或归还图书
8. 在"逾期管理"页面可以执行逾期检测
9. 在"预约管理"页面可以预约已借出的图书

## API端点

### 用户管理
- `POST /api/users` - 创建用户
- `GET /api/users` - 获取所有用户
- `GET /api/users/:id` - 获取单个用户
- `PUT /api/users/:id` - 更新用户

### 图书管理
- `POST /api/books` - 添加图书（自动生成二维码）
- `GET /api/books` - 获取所有图书
- `GET /api/books/:id` - 获取单个图书
- `GET /api/books/qrcode/:qrCode` - 通过二维码获取图书
- `PUT /api/books/:id` - 更新图书
- `DELETE /api/books/:id` - 删除图书

### 借阅管理
- `POST /api/borrows/scan` - 扫码借阅
- `POST /api/borrows/:id/return` - 归还图书
- `POST /api/borrows/:id/renew` - 续借图书
- `GET /api/borrows` - 获取借阅记录
- `GET /api/borrows/:id` - 获取单个借阅记录

### 预约管理
- `POST /api/reservations` - 创建预约
- `GET /api/reservations` - 获取预约记录
- `GET /api/reservations/:id` - 获取单个预约
- `PUT /api/reservations/:id/cancel` - 取消预约

### 逾期管理
- `POST /api/overdue/check` - 执行逾期检测
- `GET /api/overdue/records` - 获取逾期记录
- `GET /api/overdue/users/:userId/overdue-info` - 获取用户逾期信息

## 业务规则

1. 图书默认借阅期限14天
2. 每本书只能续借一次，延长14天
3. 逾期后每天扣减10积分
4. 逾期图书不能续借
5. 有预约的图书不能续借
6. 只能预约已借出的图书
7. 预约按时间顺序排队
8. 图书归还时，第一位预约者获得借阅资格

## 注意事项

- 扫码功能需要HTTPS或localhost环境
- 首次使用需要创建示例数据或手动添加用户和图书
- MongoDB需要先启动
