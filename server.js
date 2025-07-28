const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
// يجب أن يكون لديك هذا الإعداد
const io = require('socket.io')(server, {
  cors: {
    origin: "*", // أو تحديد النطاق الخاص بك
    methods: ["GET", "POST"]
  }
});

// تأكد من أنك تتعامل مع اتصالات Socket.io بشكل صحيح
io.on('connection', (socket) => {
  console.log('New user connected');
  
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg); // إرسال للجميع
  });
});

// إعدادات الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// متغيرات التخزين
let users = [];
let messages = [];
let adminSettings = {
  permissions: {
    red: ['kick', 'ban', 'mute', 'mic_off', 'camera_off', 'view_details'],
    green: ['kick', 'mute', 'view_details'],
    purple: ['mute']
  },
  admins: []
};

// تحميل البيانات المحفوظة
function loadData() {
  try {
    const data = fs.readFileSync('data.json', 'utf8');
    const parsed = JSON.parse(data);
    users = parsed.users || [];
    messages = parsed.messages || [];
    adminSettings = parsed.adminSettings || adminSettings;
  } catch (err) {
    console.log('No saved data found, starting fresh');
  }
}

// حفظ البيانات
function saveData() {
  const data = {
    users,
    messages,
    adminSettings
  };
  fs.writeFileSync('data.json', JSON.stringify(data), 'utf8');
}

// تحميل البيانات عند التشغيل
loadData();

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// صفحة الدردشة
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// صفحة إدارة الصلاحيات
app.get('/admin-permissions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-permissions.html'));
});

// API لإدارة الأدمنية
app.get('/api/admins', (req, res) => {
  res.json(adminSettings.admins);
});

app.post('/api/admins', (req, res) => {
  const { username, password, color } = req.body;
  
  if (!username || !password || !color) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const newAdmin = {
    id: Date.now().toString(),
    username,
    password,
    color,
    createdAt: new Date().toISOString()
  };
  
  adminSettings.admins.push(newAdmin);
  saveData();
  
  res.json(newAdmin);
});

app.delete('/api/admins/:id', (req, res) => {
  const { id } = req.params;
  adminSettings.admins = adminSettings.admins.filter(admin => admin.id !== id);
  saveData();
  res.json({ success: true });
});

// API لإعدادات الإشعارات
app.get('/api/notifications', (req, res) => {
  res.json(adminSettings.notifications || {});
});

app.post('/api/notifications', (req, res) => {
  adminSettings.notifications = req.body;
  saveData();
  res.json(adminSettings.notifications);
});

// اتصالات Socket.io
io.on('connection', (socket) => {
  console.log('New user connected');
  
  socket.on('login', (userData) => {
  const user = {
    id: socket.id,
    username: userData.username,
    isAdmin: userData.isAdmin || false,
    color: userData.color || 'default'
  };

  users.push(user);
  socket.emit('login', {
    username: enteredUsername,
  isAdmin: false,
  color: 'green' // أو أي لون من اختيارك
});
  saveData();

  // نقل الأحداث داخل الاتصال الرئيسي
  socket.on("get-role-permissions", () => {
    socket.emit("role-permissions-data", adminSettings.permissions);
  });

  socket.on("update-role-permissions", (data) => {
    adminSettings.permissions = data;
    saveData();
    io.emit("role-permissions-data", adminSettings.permissions);
  });
});

  
  socket.on('disconnect', () => {
    users = users.filter(user => user.id !== socket.id);
    io.emit('user-list-update', users);
    saveData();
  });
  
  socket.on('send-message', (message) => {
    const sender = users.find(u => u.id === socket.id);
const newMessage = {
  id: Date.now().toString(),
  text: message.text,
  username: sender ? sender.username : 'مجهول',
  timestamp: new Date().toISOString()
};

    };
    
    messages.push(newMessage);
    io.emit('new-message', newMessage);
    saveData();
  });
  
  socket.on('admin-action', (action) => {
    const admin = users.find(user => user.id === socket.id && user.isAdmin);
    if (!admin) return;
    
    io.emit('admin-action-performed', {
      ...action,
      admin: admin.username
    });
    
    // تطبيق العقوبة على المستخدم
    if (action.type === 'ban') {
      users = users.filter(user => user.id !== action.userId);
    }
    
    io.emit('user-list-update', users);
    saveData();
  });
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});