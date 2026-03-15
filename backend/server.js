require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const app = express();
const httpServer = http.createServer(app);

// Socket.io — allows real-time map updates across all clients
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

connectDB();

app.use(cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true
}));
app.use(compression());
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Attach io to app so controllers can emit events via req.app.locals.io
app.locals.io = io;

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/issues", require("./routes/citizenRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/donations", require("./routes/donationRoutes"));
app.use("/api/rewards", require("./routes/rewardRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/projects", require("./routes/projectRoutes"));
app.use("/api/impact", require("./routes/impactRoutes"));
app.use("/api/community", require("./routes/communityRoutes"));
app.use("/api/authority", require("./routes/authorityRoutes"));
app.use("/api/ngo", require("./routes/ngoRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/audit", require("./routes/auditRoutes"));
app.use("/api/operations", require("./routes/operationsRoutes"));

app.get("/", (req, res) => {
    res.send("Public Space Cleanliness System API is running!");
});

// Global error handler to ensure JSON responses
app.use((err, req, res, next) => {
    console.error('Express error:', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join specific issue chat room
    socket.on("join_room", (room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room ${room}`);
    });

    // Leave a room
    socket.on("leave_room", (room) => {
        socket.leave(room);
        console.log(`Socket ${socket.id} left room ${room}`);
    });

    // Typing indicators
    socket.on("typing", ({ room, user }) => {
        socket.to(room).emit("typing", user);
    });
    socket.on("stop_typing", ({ room, user }) => {
        socket.to(room).emit("stop_typing", user);
    });

    // Global chat relay is still maintained via REST but can relay direct if needed
    socket.on("chat_message", (msg) => {
        io.to("global_ngo_network").emit("chat_message", msg);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});