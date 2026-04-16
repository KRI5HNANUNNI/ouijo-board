const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

// Serve static files (the HTML, CSS, JS, PNGs) from this directory
app.use(express.static(path.join(__dirname)));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' } // Allow all for testing
});

io.on('connection', (socket) => {
    console.log(`[SYS] Client connected: ${socket.id}`);

    // Board creates a room
    socket.on('create_room', (pin) => {
        socket.join(`room_${pin}`);
        console.log(`[SYS] Board established Room: ${pin}`);
    });

    // Controller joins a room
    socket.on('join_room', (pin, callback) => {
        const room = io.sockets.adapter.rooms.get(`room_${pin}`);
        if (room) {
            socket.join(`room_${pin}`);
            console.log(`[SYS] Controller joined Room: ${pin}`);
            // Let the controller know it was successful
            callback({ success: true });
        } else {
            console.log(`[SYS] Controller failed to join Room: ${pin} (Not Found)`);
            callback({ success: false, error: 'Room not found' });
        }
    });

    // Handle Live Relays
    socket.on('live_pos', (data) => {
        // Broadcast specifically to the board in that room
        socket.to(`room_${data.pin}`).emit('board_live_pos', data);
    });

    // Handle Spell Relays
    socket.on('spell_word', (data) => {
        socket.to(`room_${data.pin}`).emit('board_spell', data);
        console.log(`[SYS] Room ${data.pin} spelling: ${data.text || data.reset}`);
    });

    socket.on('disconnect', () => {
        console.log(`[SYS] Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`👻 Spirit Server running on http://localhost:${PORT}`);
    console.log(`===============================================`);
});
