const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const app = express();

// إنشاء السيرفر أولاً
const server = http.createServer(app);

// ثم إعداد Socket.io مع CORS
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ملفات ثابتة
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// متغيرات التطبيق
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

// تحميل البيانات
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

loadData();

// المسارات
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});
app.get('/admin-permissions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-permissions.html'));
});

// APIs
app.get('/api/admins', (req, res) => res.json(adminSettings.admins));

app.post('/api/admins', (req, res) => {
  const { username, password, color } = req.body;
  if (!username || !password || !color)
    return res.status(400).json({ error: 'Missing fields' });

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

app.get('/api/notifications', (req, res) => {
  res.json(adminSettings.notifications || {});
});

app.post('/api/notifications', (req, res) => {
  adminSettings.notifications = req.body;
  saveData();
  res.json(adminSettings.notifications);
});

// Socket.io
io.on('connection', (socket) => {
  console.log('New user connected');

  socket.on("get-role-permissions", () => {
    socket.emit("role-permissions-data", adminSettings.permissions);
  });

  socket.on("update-role-permissions", (data) => {
    adminSettings.permissions = data;
    saveData();
    io.emit("role-permissions-data", adminSettings.permissions);
  });

  socket.on('login', (user) => {
    user.id = socket.id;
    users.push(user);
    socket.emit('login-success', user);
    io.emit('user-list-update', users);
    saveData();
  });

  socket.on('disconnect', () => {
    users = users.filter(u => u.id !== socket.id);
    io.emit('user-list-update', users);
    saveData();
  });

  socket.on('send-message', (message) => {
    const newMessage = {
      id: Date.now().toString(),
      ...message,
      timestamp: new Date().toISOString()
    };
    messages.push(newMessage);
    io.emit('new-message', newMessage);
    saveData();
  });

  socket.on('admin-action', (action) => {
    const admin = users.find(u => u.id === socket.id && u.isAdmin);
    if (!admin) return;

    io.emit('admin-action-performed', {
      ...action,
      admin: admin.username
    });

    if (action.type === 'ban') {
      users = users.filter(u => u.id !== action.userId);
    }

    io.emit('user-list-update', users);
    saveData();
  });
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
