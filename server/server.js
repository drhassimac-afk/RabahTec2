const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);
app.use('/uploads', express.static(UPLOADS));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ===== بيانات (في الذاكرة — يمكن ربط MongoDB لاحقاً) =====
const rooms = [
  { id: 'general', name: 'الغرفة العامة', type: 'chat' },
  { id: 'chat',    name: 'غرفة الدردشة',  type: 'chat' },
  { id: 'cinema',  name: 'غرفة السينما',  type: 'cinema' },
  { id: 'games1',  name: 'غرفة الألعاب 1', type: 'games' },
  { id: 'games2',  name: 'غرفة الألعاب 2', type: 'games' },
];
const members = {}, history = {};
rooms.forEach(r => (members[r.id] = new Set()));
const roomsPayload = () => rooms.map(r => ({ ...r, online: members[r.id].size }));

// ===== REST API =====
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
io.on('connection', socket => {
  socket.on('join_room', ({ roomId, user }) => {
    socket.join(roomId);
    socket.data = { roomId, user };
    members[roomId]?.add(user.id);
    io.emit('rooms_update', roomsPayload());
    socket.emit('room_history', history[roomId] || []);
    socket.to(roomId).emit('system_message', { text: `${user.name} انضم إلى الغرفة 👋` });
  });

  socket.on('send_message', ({ roomId, message }) => {
    const msg = { id: Date.now() + '-' + socket.id, ...message, time: new Date().toISOString() };
    (history[roomId] = history[roomId] || []).push(msg);
    if (history[roomId].length > 200) history[roomId].shift();
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
