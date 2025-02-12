require('dotenv').config();
const http = require("http");
const app = require("./app");
const socketIo = require("socket.io");

const port = process.env.PORT;
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Pass `io` to `app.js`
app.set("io", io);

// Handle Socket.IO connections
io.on("connection", (socket) => {
    console.log(`🔵 User Connected: ${socket.id}`);

    socket.on("message", (data) => {
        console.log("📩 Received Message:", data);
        io.emit("message", data); // Broadcast message to all clients
    });

    socket.on("disconnect", () => {
        console.log(`🔴 User Disconnected: ${socket.id}`);
    });
});

server.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
