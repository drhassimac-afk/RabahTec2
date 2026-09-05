try { require('dotenv').config(); } catch {}

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// ================= MongoDB (يعمل بدونه بالذاكرة كاحتياط) =================
const MONGO_URI = process.env.MONGO_URI || '';
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB متصل'))
    .catch(e => console.log('⚠️ خطأ MongoDB:', e.message));
} else {
  console.log('⚠️ MONGO_URI غير موجود — وضع الذاكرة المؤقتة');
}
const dbReady = () => mongoose.connection.readyState === 1;

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  friends: { type: [String], default: [] },
  pushToken: String,
  lastSeen: Date,
});
const messageSchema = new mongoose.Schema({
  roomId: String, userId: String, user: String, text: String, file: String,
  time: { type: Date, default: Date.now },
});
const friendRequestSchema = new mongoose.Schema({
  from: String, to: String,
  status: { type: String, default: 'pending' },
  time: { type: Date, default: Date.now },
});
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
const FriendRequest = mongoose.models.FriendRequest || mongoose.model('FriendRequest', friendRequestSchema);

// ================= الملفات =================
const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);
app.use('/uploads', express.static(UPLOADS));

// ================= البيانات =================
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const rooms = [
  { id: 'general', name: 'الغرفة العامة',  type: 'chat',   cat: 'عامة'  },
  { id: 'chat',    name: 'غرفة الدردشة',   type: 'chat',   cat: 'عامة'  },
  { id: 'cinema',  name: 'غرفة السينما',   type: 'cinema', cat: 'ترفيه' },
  { id: 'live',    name: 'غرفة البث',      type: 'chat',   cat: 'ترفيه' },
  { id: 'games1',  name: 'غرفة الألعاب 1', type: 'games',  cat: 'ألعاب' },
  { id: 'games2',  name: 'غرفة الألعاب 2', type: 'games',  cat: 'ألعاب' },
  { id: 'study',   name: 'غرفة الدراسة',   type: 'chat',   cat: 'تعليم' },
];
const members = {}, history = {}, cinemaState = {}, xoGames = {}, lives = {};
rooms.forEach(r => (members[r.id] = new Set()));
const roomsPayload = () => rooms.map(r => ({ ...r, online: members[r.id].size }));

// ================= REST API =================
app.get('/', (req, res) => res.json({ status: 'RabahTec server OK ✅', db: dbReady() }));
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

// ===== المستخدمون =====
app.post('/users/register', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username مطلوب' });
  if (dbReady()) {
    try { await User.updateOne({ username }, { $set: { lastSeen: new Date() } }, { upsert: true }); } catch {}
  }
  res.json({ ok: true });
});

app.get('/users/search', async (req, res) => {
  const q = String(req.query.q || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!dbReady() || !q) return res.json([]);
  const users = await User.find({ username: new RegExp(q, 'i') }).limit(20).lean();
  res.json(users.map(u => ({ username: u.username })));
});

app.post('/users/push-token', async (req, res) => {
  const { username, token } = req.body;
  if (dbReady() && username) await User.updateOne({ username }, { $set: { pushToken: token } }).catch(() => {});
  res.json({ ok: true });
});

// ===== الأصدقاء =====
app.post('/friends/request', async (req, res) => {
  const { from, to } = req.body;
  if (!from || !to || from === to) return res.status(400).json({ error: 'بيانات ناقصة' });
  if (!dbReady()) return res.status(503).json({ error: 'فعّل MongoDB أولاً' });
  const u = await User.findOne({ username: from });
  if (u?.friends.includes(to)) return res.json({ ok: true, already: true });
  const exists = await FriendRequest.findOne({ from, to, status: 'pending' });
  if (!exists) await FriendRequest.create({ from, to });
  io.to('user-' + to).emit('friend_request', { from });
  res.json({ ok: true });
});

app.post('/friends/accept', async (req, res) => {
  const { from, to } = req.body;
  if (!dbReady()) return res.status(503).json({ error: 'فعّل MongoDB أولاً' });
  await FriendRequest.updateOne({ from, to, status: 'pending' }, { $set: { status: 'accepted' } });
  await User.updateOne({ username: from }, { $addToSet: { friends: to } }, { upsert: true });
  await User.updateOne({ username: to }, { $addToSet: { friends: from } }, { upsert: true });
  io.to('user-' + from).emit('friend_accepted', { by: to });
  res.json({ ok: true });
});

app.get('/friends/:username', async (req, res) => {
  if (!dbReady()) return res.json([]);
  const u = await User.findOne({ username: req.params.username }).lean();
  res.json((u?.friends || []).map(f => ({ username: f })));
});

app.get('/friends/requests/:username', async (req, res) => {
  if (!dbReady()) return res.json([]);
  const reqs = await FriendRequest.find({ to: req.params.username, status: 'pending' }).sort({ time: -1 }).lean();
  res.json(reqs.map(r => ({ from: r.from })));
});

// ===== LiveKit (اختياري — بث الكاميرا) =====
app.get('/livekit-token', async (req, res) => {
  try {
    const { AccessToken } = require('livekit-server-sdk');
    const { identity, room } = req.query;
    const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } = process.env;
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL)
      return res.status(503).json({ error: 'LiveKit غير مفعّل — أضف المفاتيح في .env' });
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: String(identity) });
    at.addGrant({ roomJoin: true, room: String(room), canPublish: true, canSubscribe: true });
    res.json({ token: await at.toJwt(), url: LIVEKIT_URL });
  } catch {
    res.status(503).json({ error: 'ثبّت الحزمة أولاً: npm i livekit-server-sdk' });
  }
});

// ===== إشعار Push عبر Expo =====
async function sendPush(username, title, body) {
  try {
    if (!dbReady()) return;
    const u = await User.findOne({ username });
    if (!u?.pushToken?.startsWith('ExponentPushToken')) return;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: u.pushToken, title, body, sound: 'default' }),
    });
  } catch {}
}

// ================= Socket.io =================
io.on('connection', socket => {

  socket.on('register', async ({ username }) => {
    socket.join('user-' + username);
    if (dbReady()) {
      try { await User.updateOne({ username }, { $set: { lastSeen: new Date() } }, { upsert: true }); } catch {}
    }
  });

  socket.on('join_room', async ({ roomId, user }) => {
    socket.join(roomId);
    socket.data = { roomId, user };
    if (!members[roomId]) members[roomId] = new Set();
    members[roomId].add(user.id);
    io.emit('rooms_update', roomsPayload());

    if (dbReady()) {
      const docs = await Message.find({ roomId }).sort({ time: -1 }).limit(100).lean().catch(() => []);
      socket.emit('room_history', (docs || []).reverse().map(d => ({
        id: String(d._id), userId: d.userId, user: d.user, text: d.text, file: d.file, time: d.time,
      })));
    } else {
      socket.emit('room_history', history[roomId] || []);
    }
    socket.to(roomId).emit('system_message', { text: `${user.name} انضم إلى الغرفة 👋` });
  });

  socket.on('send_message', async ({ roomId, message }) => {
    const msg = { id: Date.now() + '-' + socket.id, ...message, time: new Date().toISOString() };
    io.to(roomId).emit('new_message', msg);

    if (dbReady()) {
      try { await Message.create({ roomId, userId: message.userId, user: message.user, text: message.text, file: message.file }); } catch {}
    } else {
      (history[roomId] = history[roomId] || []).push(msg);
      if (history[roomId].length > 200) history[roomId].shift();
    }

    // دردشة خاصة: أشعار الطرف الآخر
    if (roomId.startsWith('dm-')) {
      const [a, b] = roomId.slice(3).split('--');
      const other = a === message.user ? b : a;
      io.to('user-' + other).emit('dm_notify', { from: message.user, text: message.text });
      sendPush(other, message.user, message.text);
    }
  });

  // ===== السينما =====
  socket.on('video_action', ({ roomId, action, position }) => {
    socket.to(roomId).emit('video_sync', { action, position, by: socket.data.user?.name });
  });
  socket.on('cinema_set_video', ({ roomId, url, title }) => {
    cinemaState[roomId] = { url, title };
    io.to(roomId).emit('cinema_video', cinemaState[roomId]);
  });
  socket.on('cinema_get', ({ roomId }) => {
    if (cinemaState[roomId]) socket.emit('cinema_video', cinemaState[roomId]);
  });

  // ===== لعبة XO =====
  socket.on('xo_join', ({ roomId, user }) => {
    socket.join('xo-' + roomId);
    const g = xoGames[roomId] = xoGames[roomId] || { board: Array(9).fill(null), players: [], turn: 'X', winner: null };
    if (!g.players.find(p => p.id === user.id) && g.players.length < 2)
      g.players.push({ id: user.id, name: user.name, symbol: g.players.length ? 'O' : 'X' });
    io.to('xo-' + roomId).emit('xo_state', g);
  });
  socket.on('xo_move', ({ roomId, user, index }) => {
    const g = xoGames[roomId]; if (!g || g.winner) return;
    const p = g.players.find(p => p.id === user.id);
    if (!p || p.symbol !== g.turn || g.board[index]) return;
    g.board[index] = p.symbol;
    g.turn = g.turn === 'X' ? 'O' : 'X';
    const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,b,c] of L) if (g.board[a] && g.board[a]===g.board[b] && g.board[a]===g.board[c]) g.winner = g.board[a];
    if (!g.winner && g.board.every(Boolean)) g.winner = 'draw';
    io.to('xo-' + roomId).emit('xo_state', g);
  });
  socket.on('xo_reset', ({ roomId }) => {
    const g = xoGames[roomId]; if (!g) return;
    g.board = Array(9).fill(null); g.turn = 'X'; g.winner = null;
    io.to('xo-' + roomId).emit('xo_state', g);
  });
  socket.on('xo_leave', ({ roomId, user }) => {
    const g = xoGames[roomId];
    if (g) {
      g.players = g.players.filter(p => p.id !== user.id);
      g.players.forEach((p, i) => p.symbol = i ? 'O' : 'X');
      g.board = Array(9).fill(null); g.turn = 'X'; g.winner = null;
      io.to('xo-' + roomId).emit('xo_state', g);
    }
    socket.leave('xo-' + roomId);
  });

  // ===== البث المباشر =====
  socket.on('join_live', ({ liveId, user }) => {
    socket.join('live-' + liveId);
    socket.data.liveId = liveId;
    const l = lives[liveId] = lives[liveId] || { viewers: {}, messages: [] };
    l.viewers[socket.id] = user.name;
    io.to('live-' + liveId).emit('live_viewers', Object.keys(l.viewers).length);
    socket.emit('live_history', l.messages.slice(-50));
  });
  socket.on('leave_live', ({ liveId }) => {
    socket.leave('live-' + liveId);
    if (lives[liveId]) {
      delete lives[liveId].viewers[socket.id];
      io.to('live-' + liveId).emit('live_viewers', Object.keys(lives[liveId].viewers).length);
    }
    socket.data.liveId = null;
  });
  socket.on('live_message', ({ liveId, message }) => {
    const l = lives[liveId]; if (!l) return;
    const msg = { id: Date.now() + '-' + socket.id, ...message, time: new Date().toISOString() };
    l.messages.push(msg); if (l.messages.length > 100) l.messages.shift();
    io.to('live-' + liveId).emit('live_message', msg);
  });
  socket.on('live_react', ({ liveId, emoji }) => io.to('live-' + liveId).emit('live_reaction', { emoji }));

  // ===== المغادرة =====
  const leave = () => {
    const { roomId, user } = socket.data || {};
    if (roomId && user) {
      members[roomId]?.delete(user.id);
      io.emit('rooms_update', roomsPayload());
      socket.to(roomId).emit('system_message', { text: `${user.name} غادر الغرفة` });
    }
    const liveId = socket.data?.liveId;
    if (liveId && lives[liveId]) {
      delete lives[liveId].viewers[socket.id];
      io.to('live-' + liveId).emit('live_viewers', Object.keys(lives[liveId].viewers).length);
      socket.data.liveId = null;
    }
  };
  socket.on('leave_room', leave);
  socket.on('disconnect', leave);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ RabahTec server يعمل على المنفذ ${PORT}`));
