const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

// Serve static files (the HTML, CSS, JS, PNGs) from this directory
app.use(express.static(path.join(__dirname)));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' } // Allow all for testing
});

// Memory Registry for Active Spirits
const activeRooms = new Map(); // PIN -> { boardSocketId, lastSeen }

io.on('connection', (socket) => {
    console.log(`[SYS] Client connected: ${socket.id}`);

    // Board creates a room
    socket.on('create_room', (pin) => {
        socket.join(`room_${pin}`);
        activeRooms.set(pin, { 
            boardSocketId: socket.id, 
            lastSeen: Date.now() 
        });
        console.log(`[SYS] Board established Room: ${pin}`);
        broadcastRadar();
    });

    // Controller joins a room
    socket.on('join_room', (pin, callback) => {
        const roomExists = activeRooms.has(pin);
        if (roomExists) {
            socket.join(`room_${pin}`);
            console.log(`[SYS] Controller joined Room: ${pin}`);
            callback({ success: true });
        } else {
            console.log(`[SYS] Controller failed to join Room: ${pin} (Not Found)`);
            callback({ success: false, error: 'Room not found' });
        }
    });

    // Spirit Radar - Admin data request
    socket.on('request_radar', () => {
        socket.emit('radar_update', Array.from(activeRooms.keys()));
    });

    // Handle Live Relays
    socket.on('live_pos', (data) => {
        if (data.pin === 'GLOBAL') {
            io.emit('board_live_pos', data); // Broadcast to EVERYONE
        } else {
            socket.to(`room_${data.pin}`).emit('board_live_pos', data);
        }
    });

    // Handle Spell Relays
    socket.on('spell_word', (data) => {
        if (data.pin === 'GLOBAL') {
            io.emit('board_spell', data); // Mass Possession
        } else {
            socket.to(`room_${data.pin}`).emit('board_spell', data);
        }
        console.log(`[SYS] ${data.pin} spelling: ${data.text || data.reset}`);
    });

    socket.on('disconnect', () => {
        // Find if this was a board and clean up
        for (const [pin, info] of activeRooms.entries()) {
            if (info.boardSocketId === socket.id) {
                activeRooms.delete(pin);
                console.log(`[SYS] Board in Room ${pin} vanished. Registry cleaned.`);
                broadcastRadar();
                break;
            }
        }
        console.log(`[SYS] Client disconnected: ${socket.id}`);
    });

    function broadcastRadar() {
        io.emit('radar_update', Array.from(activeRooms.keys()));
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`👻 Spirit Server running on http://localhost:${PORT}`);
    console.log(`===============================================`);
});
