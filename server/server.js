require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const crypto = require('crypto');
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Server } = require('socket.io');

const ADMIN_KEY = process.env.ADMIN_KEY || 'rabah-admin-2024';
const banned = new Set();

const adminAuth = (req, res, next) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(401).json({ error: 'غير مصرّح' });
  }
  next();
};

const dbReady = () => mongoose.connection.readyState === 1;

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Atlas متصل بنجاح'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  pushToken: { type: String, default: null },
  banned: { type: Boolean, default: false },
  friends: { type: [String], default: [] },
  points: { type: Number, default: 0 },
  achievements: { type: [String], default: [] },
  avatar: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

app.post('/users/register', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const id = String(req.body?.id || '').trim();

    if (!name) {
      return res.status(400).json({ error: 'name مطلوب' });
    }

    const userId = id || crypto.randomUUID();

    const user = await User.findOneAndUpdate(
      { id: userId },
      {
        $set: {
          name,
          lastSeen: new Date()
        },
        $setOnInsert: {
          id: userId
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        createdAt: user.createdAt,
        lastSeen: user.lastSeen
      }
    });
  } catch (err) {
    console.error('❌ User registration error:', err.message);
    res.status(500).json({ error: 'تعذر حفظ المستخدم' });
  }
});

app.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id }).lean();

    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    res.json({
      id: user.id,
      name: user.name,
      createdAt: user.createdAt,
      lastSeen: user.lastSeen
    });
  } catch (err) {
    res.status(500).json({ error: 'تعذر جلب المستخدم' });
  }
});


const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);
app.use('/uploads', express.static(UPLOADS));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ===== بيانات (في الذاكرة — يمكن ربط MongoDB لاحقاً) =====
const rooms = [
  { id: 'general', name: 'الغرفة العامة',  type: 'chat',   cat: 'عامة'  },
  { id: 'chat',    name: 'غرفة الدردشة',   type: 'chat',   cat: 'عامة'  },
  { id: 'cinema',  name: 'غرفة السينما',   type: 'cinema', cat: 'ترفيه' },
  { id: 'live',    name: 'غرفة البث',      type: 'chat',   cat: 'ترفيه' },
  { id: 'games1',  name: 'غرفة الألعاب 1', type: 'games',  cat: 'ألعاب' },
  { id: 'games2',  name: 'غرفة الألعاب 2', type: 'games',  cat: 'ألعاب' },
  { id: 'study',   name: 'غرفة الدراسة',   type: 'chat',   cat: 'تعليم' },
];
const members = {}, history = {};
rooms.forEach(r => (members[r.id] = new Set()));
mongoose.connection.once('open', async () => {
  try {
    const custom = await Room.find().lean();

    custom.forEach(r => {
      if (!rooms.find(x => x.id === r.id)) {
        rooms.push({
          id: r.id,
          name: r.name,
          type: r.type,
          cat: r.cat,
          password: r.password || null,
          createdBy: r.createdBy
        });
        members[r.id] = new Set();
      }
    });

    const bs = await User.find({ banned: true }).lean();
    bs.forEach(u => banned.add(u.name));

    console.log(`✅ تم تحميل ${custom.length} غرفة و ${bs.length} محظور`);
  } catch (err) {
    console.error('❌ خطأ في تحميل الغرف/المحظورين:', err.message);
  }
});

const roomsPayload = () => rooms.map(r => ({
  id: r.id,
  name: r.name,
  type: r.type,
  cat: r.cat,
  locked: !!r.password,
  online: members[r.id]?.size || 0,
}));

// ===== REST API =====

// ===== ADMIN API =====

app.post('/admin/login', (req, res) => {
  if (req.body?.key === ADMIN_KEY) {
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'المفتاح غير صحيح' });
});

app.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const users = dbReady() ? await User.countDocuments() : 0;
    const messages = dbReady()
      ? await Message.countDocuments()
      : Object.values(history).flat().length;

    res.json({
      users,
      messages,
      rooms: rooms.length,
      online: io.engine.clientsCount,
      banned: banned.size
    });
  } catch (err) {
    res.status(500).json({ error: 'تعذر جلب الإحصائيات' });
  }
});

app.get('/admin/users', adminAuth, async (req, res) => {
  try {
    if (!dbReady()) return res.json([]);

    const users = await User.find()
      .sort({ lastSeen: -1 })
      .limit(100)
      .lean();

    res.json(users.map(u => ({
      username: u.name,
      banned: !!u.banned,
      friends: u.friends?.length || 0,
      lastSeen: u.lastSeen
    })));
  } catch (err) {
    res.status(500).json({ error: 'تعذر جلب المستخدمين' });
  }
});

app.post('/admin/ban', adminAuth, async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const ban = !!req.body?.ban;

    if (!username) {
      return res.status(400).json({ error: 'اسم المستخدم مطلوب' });
    }

    if (ban) banned.add(username);
    else banned.delete(username);

    if (dbReady()) {
      await User.updateOne(
        { name: username },
        { $set: { banned: ban } }
      );
    }

    if (ban) {
      io.to('user-' + username).emit('banned');

      const sockets = await io.in('user-' + username).fetchSockets();
      sockets.forEach(s => s.disconnect(true));
    }

    res.json({ ok: true, banned: ban });
  } catch (err) {
    console.error('❌ Admin ban error:', err.message);
    res.status(500).json({ error: 'تعذر تنفيذ الحظر' });
  }
});

app.get('/admin/messages', adminAuth, async (req, res) => {
  try {
    const roomId = req.query?.roomId;

    if (dbReady()) {
      const docs = await Message.find(
        roomId ? { roomId } : {}
      )
        .sort({ time: -1 })
        .limit(50)
        .lean();

      return res.json(docs.map(d => ({
        id: String(d._id),
        roomId: d.roomId,
        user: d.user,
        text: d.text,
        time: d.time
      })));
    }

    const mem = roomId
      ? (history[roomId] || [])
      : Object.values(history).flat();

    res.json(
      mem.slice(-50).reverse().map(m => ({
        id: m.id,
        roomId: m.roomId || roomId,
        user: m.user,
        text: m.text,
        time: m.time
      }))
    );
  } catch (err) {
    res.status(500).json({ error: 'تعذر جلب الرسائل' });
  }
});

app.post('/admin/delete-message', adminAuth, async (req, res) => {
  try {
    const id = String(req.body?.id || '').trim();

    if (!id) {
      return res.status(400).json({ error: 'معرف الرسالة مطلوب' });
    }

    if (dbReady()) {
      await Message.findByIdAndDelete(id).catch(() => {});
    }

    Object.keys(history).forEach(rid => {
      history[rid] = (history[rid] || []).filter(m => m.id !== id);
    });

    io.emit('message_deleted', { id });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'تعذر حذف الرسالة' });
  }
});

app.get('/', (req, res) => res.json({ status: 'RabahTec server OK ✅' }));
app.get('/rooms', (req, res) => res.json(roomsPayload()));

const storage = multer.diskStorage({
  destination: UPLOADS,
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + Buffer.from(file.originalname, 'latin1').toString('utf8')),
});
const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  const f = req.file;
  res.json({ url: `/uploads/${f.filename}`, name: f.filename, size: f.size, mimetype: f.mimetype });
});

app.get('/files', (req, res) => {
  const files = fs.readdirSync(UPLOADS).map(name => {
    const s = fs.statSync(path.join(UPLOADS, name));
    return { name, url: `/uploads/${name}`, size: s.size, date: s.mtime };
  });
  res.json(files.reverse());
});

// ===== Socket.io =====

const friendSchema = new mongoose.Schema({
  from: { type: String, required: true, index: true },
  to: { type: String, required: true, index: true },
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

friendSchema.index({ from: 1, to: 1 }, { unique: true });

const Friend = mongoose.models.Friend || mongoose.model('Friend', friendSchema);

const roomSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  type: String,
  cat: String,
  password: String,           // null = غرفة عامة
  createdBy: String,
  time: { type: Date, default: Date.now },
});

const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);

// ===== إنشاء غرفة =====
app.post('/rooms/create', async (req, res) => {
  const { name, cat, password, createdBy } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'الاسم مطلوب' });

  const id = 'room-' + Date.now().toString(36);
  const room = {
    id,
    name: name.trim(),
    cat: cat || 'عامة',
    type: 'chat',
    password: password || null,
    createdBy
  };

  rooms.push(room);
  members[id] = new Set();

  if (dbReady()) await Room.create(room).catch(() => {});

  io.emit('rooms_update', roomsPayload());
  res.json({ ok: true, room: { id, name: room.name } });
});


const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  user: { type: String, required: true },
  text: { type: String, default: '' },
  file: { type: String, default: null },
  audio: { type: String, default: null },
  duration: { type: Number, default: 0 },
  replyTo: {
    id: { type: String, default: null },
    user: { type: String, default: null },
    text: { type: String, default: null }
  },
  time: { type: Date, default: Date.now }
});

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);



// البحث عن المستخدمين
app.get('/users/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();

    if (!q) return res.json([]);

    const users = await User.find({
      name: { $regex: q, $options: 'i' }
    })
      .select('id name')
      .limit(20)
      .lean();

    res.json(users.map(u => ({
      id: u.id,
      username: u.name
    })));
  } catch (err) {
    console.error('❌ User search error:', err.message);
    res.status(500).json({ error: 'تعذر البحث عن المستخدمين' });
  }
});

// إرسال طلب صداقة
app.post('/friends/request', async (req, res) => {
  try {
    const from = String(req.body?.from || '').trim();
    const to = String(req.body?.to || '').trim();

    if (!from || !to) {
      return res.status(400).json({ error: 'from و to مطلوبان' });
    }

    if (from === to) {
      return res.status(400).json({ error: 'لا يمكنك إضافة نفسك' });
    }

    const sender = await User.findOne({ name: from });
    const receiver = await User.findOne({ name: to });

    if (!sender || !receiver) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    const existing = await Friend.findOne({
      $or: [
        { from, to },
        { from: to, to: from }
      ]
    });

    if (existing) {
      return res.status(400).json({
        error: existing.status === 'accepted'
          ? 'أنتم أصدقاء بالفعل'
          : 'يوجد طلب صداقة بالفعل'
      });
    }

    await Friend.create({ from, to, status: 'pending' });

    io.emit('friend_request', { from, to });

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Friend request error:', err.message);
    res.status(500).json({ error: 'تعذر إرسال طلب الصداقة' });
  }
});

// الطلبات الواردة
app.get('/friends/requests/:username', async (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);

    const requests = await Friend.find({
      to: username,
      status: 'pending'
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests.map(r => ({
      from: r.from,
      to: r.to,
      createdAt: r.createdAt
    })));
  } catch (err) {
    res.status(500).json({ error: 'تعذر جلب طلبات الصداقة' });
  }
});

// قبول طلب صداقة
app.post('/friends/accept', async (req, res) => {
  try {
    const from = String(req.body?.from || '').trim();
    const to = String(req.body?.to || '').trim();

    const request = await Friend.findOneAndUpdate(
      { from, to, status: 'pending' },
      { $set: { status: 'accepted' } },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ error: 'طلب الصداقة غير موجود' });
    }

    io.emit('friend_accepted', { from, to });

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Friend accept error:', err.message);
    res.status(500).json({ error: 'تعذر قبول طلب الصداقة' });
  }
});

// قائمة الأصدقاء
app.get('/friends/:username', async (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);

    const rows = await Friend.find({
      $or: [{ from: username }, { to: username }],
      status: 'accepted'
    }).lean();

    const names = rows.map(r => r.from === username ? r.to : r.from);

    const users = await User.find({
      name: { $in: names }
    })
      .select('id name')
      .lean();

    res.json(users.map(u => ({
      id: u.id,
      username: u.name
    })));
  } catch (err) {
    res.status(500).json({ error: 'تعذر جلب الأصدقاء' });
  }
});

io.on('connection', socket => {
  // ===== تسجيل المستخدم والحظر =====
  socket.on('register', async ({ username }) => {
    if (!username) return;

    if (banned.has(username)) {
      socket.emit('banned');
      return socket.disconnect(true);
    }

    socket.join('user-' + username);

    if (dbReady()) {
      try {
        await User.updateOne(
          { id: username },
          {
            $set: { name: username, lastSeen: new Date() },
            $setOnInsert: { id: username }
          },
          { upsert: true }
        );
      } catch {}
    }
  });

  socket.on('join_room', async ({ roomId, user, password }) => {
    if (banned.has(user?.name)) {
      socket.emit('banned');
      return socket.disconnect(true);
    }

    const room = rooms.find(r => r.id === roomId);

    if (room?.password && room.password !== password) {
      return socket.emit('room_locked', {
        roomId,
        wrong: password != null
      });
    }

    socket.join(roomId);
    socket.data = { roomId, user };

    if (!members[roomId]) members[roomId] = new Set();
    members[roomId].add(user.id);

    io.emit('rooms_update', roomsPayload());

    if (dbReady()) {
      try {
        const docs = await Message.find({ roomId })
          .sort({ time: -1 })
          .limit(100)
          .lean();

        socket.emit(
          'room_history',
          docs.reverse().map(d => ({
            id: String(d._id),
            userId: d.userId,
            user: d.user,
            text: d.text,
            file: d.file,
            audio: d.audio,
            duration: d.duration,
            replyTo: d.replyTo || null,
            time: d.time
          }))
        );
      } catch {
        socket.emit('room_history', history[roomId] || []);
      }
    } else {
      socket.emit('room_history', history[roomId] || []);
    }

    socket.to(roomId).emit('system_message', {
      text: `${user.name} انضم إلى الغرفة 👋`
    });
  });

  socket.on('send_message', async ({ roomId, message }) => {
    const msg = {
      id: Date.now() + '-' + socket.id,
      ...message,
      time: new Date().toISOString()
    };

    (history[roomId] = history[roomId] || []).push(msg);
    if (history[roomId].length > 200) history[roomId].shift();

    if (dbReady()) {
      try {
        await Message.create({
          roomId,
          userId: message.userId,
          user: message.user,
          text: message.text || '',
          file: message.file || null,
          audio: message.audio || null,
          duration: message.duration || 0,
          replyTo: message.replyTo || null
        });
      } catch (err) {
        console.error('❌ Message save error:', err.message);
      }
    }

    io.to(roomId).emit('new_message', msg);
  });

  // مزامنة الفيديو (السينما): تشغيل / إيقاف / تقديم
  socket.on('video_action', ({ roomId, action, position }) => {
    socket.to(roomId).emit('video_sync', { action, position, by: socket.data.user?.name });
  });

  const leave = () => {
    const { roomId, user } = socket.data || {};
    if (roomId && user) {
      members[roomId]?.delete(user.id);
      io.emit('rooms_update', roomsPayload());
      socket.to(roomId).emit('system_message', { text: `${user.name} غادر الغرفة` });
    }
  };
  socket.on('leave_room', leave);
  socket.on('disconnect', leave);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ RabahTec server يعمل على المنفذ ${PORT}`));
