const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const rooms = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', ({ roomId, username }) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ id: socket.id, name: username || `User-${socket.id.slice(0, 5)}` });

    io.to(roomId).emit('user-list', rooms[roomId]);

    const otherUsers = rooms[roomId].filter(u => u.id !== socket.id).map(u => u.id);
    socket.emit('users', otherUsers);
  });

  socket.on('offer', (payload) => {
    io.to(payload.target).emit('offer', { sdp: payload.sdp, caller: socket.id });
  });

  socket.on('answer', (payload) => {
    io.to(payload.target).emit('answer', { sdp: payload.sdp, caller: socket.id });
  });

  socket.on('candidate', (payload) => {
    io.to(payload.target).emit('candidate', { candidate: payload.candidate, caller: socket.id });
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter(u => u.id !== socket.id);
        io.to(roomId).emit('user-list', rooms[roomId]);
        if (rooms[roomId].length === 0) delete rooms[roomId];
      }
    }
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
