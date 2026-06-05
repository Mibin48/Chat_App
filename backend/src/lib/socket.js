import { Server } from "socket.io";
import http from "http";
import express from "express";
import "dotenv/config";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

const app = express();
const server = http.createServer(app);

// Trust proxy is required for cookies to work securely on Render/Heroku
app.set("trust proxy", 1);

const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL,
      "https://chat-app-frontend-oa3t.onrender.com",
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ],
    credentials: true,
  },
});

io.use(socketAuthMiddleware);

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// this is for storig online users
const userSocketMap = {}; // {userId:socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.user.fullName);

  const userId = socket.userId;
  userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // with socket.on we listen for events from clients
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.user.fullName);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  socket.on("typing", (receiverId) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", userId);
    }
  });

  socket.on("stopTyping", (receiverId) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", userId);
    }
  });

  // Group Socket handlers
  socket.on("join_groups", (groupIds) => {
    if (Array.isArray(groupIds)) {
      groupIds.forEach((id) => {
        socket.join("group_" + id);
      });
    }
  });

  socket.on("groupTyping", ({ groupId }) => {
    socket.to("group_" + groupId).emit("groupTyping", { groupId, userId });
  });

  socket.on("groupStopTyping", ({ groupId }) => {
    socket.to("group_" + groupId).emit("groupStopTyping", { groupId, userId });
  });
});

export { io, app, server };