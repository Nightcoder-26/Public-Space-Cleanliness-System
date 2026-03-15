require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

const app = express();
const server = http.createServer(app);

// Connect Database
connectDB();

// -----------------------------
// Security & Middleware
// -----------------------------
app.use(helmet());
app.use(compression());

app.use(cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// -----------------------------
// Socket.io Setup
// -----------------------------
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"]
    }
});

// attach io globally
app.locals.io = io;

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join NGO chat room
    socket.on("join_room", (room) => {
        socket.join(room);
    });

    // Leave room
    socket.on("leave_room", (room) => {
        socket.leave(room);
    });

    // Typing indicator
    socket.on("typing", ({ room, user }) => {
        socket.to(room).emit("typing", user);
    });

    socket.on("stop_typing", ({ room, user }) => {
        socket.to(room).emit("stop_typing", user);
    });

    // Chat message
    socket.on("chat_message", (msg) => {
        io.to("global_ngo_network").emit("chat_message", msg);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

// -----------------------------
// API Routes
// -----------------------------
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

// -----------------------------
// Health Check Route
// -----------------------------
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Public Space Cleanliness System API is running"
    });
});

// -----------------------------
// Global Error Handler
// -----------------------------
app.use((err, req, res, next) => {
    console.error("Server Error:", err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});

// -----------------------------
// Start Server
// -----------------------------
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});