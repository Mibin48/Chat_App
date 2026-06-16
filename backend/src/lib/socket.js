import { Server } from "socket.io";
import http from "http";
import express from "express";
import "dotenv/config";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { sendPushNotificationToUsers } from "./push.js";

const app = express();
const server = http.createServer(app);

// Trust proxy is required for cookies to work securely on Render/Heroku
app.set("trust proxy", 1);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = [
        process.env.CLIENT_URL,
        "https://chat-app-frontend-oa3t.onrender.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
      ];
      if (!origin) return callback(null, true);
      const isDev = process.env.NODE_ENV !== "production";
      const isLocalIp = isDev && (
        origin.startsWith("http://192.168.") ||
        origin.startsWith("http://10.") ||
        origin.startsWith("http://172.") ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://127.0.0.1")
      );
      if (allowedOrigins.includes(origin) || allowedOrigins.includes(origin + "/") || isLocalIp) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
});

io.use(socketAuthMiddleware);

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// this is for storig online users
const userSocketMap = {}; // {userId:socketId}

// track active call sessions
const activeCalls = new Map();

async function createCallLogMessage(session) {
  if (session.logged) return;
  session.logged = true;

  activeCalls.delete(session.callerId);
  activeCalls.delete(session.calleeId);

  let duration = 0;
  if (session.startTime) {
    duration = Math.round((Date.now() - session.startTime) / 1000);
  }

  let typeText = session.type === "video" ? "Video call" : "Voice call";
  let fallbackText = "";
  if (session.status === "missed") {
    fallbackText = `Missed ${typeText.toLowerCase()}`;
  } else if (session.status === "rejected") {
    fallbackText = `Rejected ${typeText.toLowerCase()}`;
  } else {
    if (duration < 60) {
      fallbackText = `${typeText} - Less than a minute`;
    } else {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      fallbackText = `${typeText} - ${minutes}m ${seconds}s`;
    }
  }

  try {
    const newMessage = new Message({
      senderId: session.callerId,
      recieverId: session.calleeId,
      text: fallbackText,
      callInfo: {
        type: session.type,
        status: session.status,
        duration: duration
      }
    });

    await newMessage.save();

    const caller = await User.findById(session.callerId).select("fullName publicKey");

    const callerSocketId = getReceiverSocketId(session.callerId);
    const calleeSocketId = getReceiverSocketId(session.calleeId);

    if (callerSocketId) {
      io.to(callerSocketId).emit("newMessage", newMessage);
    }
    if (calleeSocketId) {
      io.to(calleeSocketId).emit("newMessage", newMessage);
    }

    if (session.status === "missed") {
      const pushPayload = {
        senderId: session.callerId,
        senderName: caller?.fullName || "Aether App",
        isEncrypted: false,
        text: fallbackText,
        isGroup: false,
        createdAt: newMessage.createdAt,
        senderPublicKey: caller?.publicKey || null
      };
      sendPushNotificationToUsers(session.calleeId, pushPayload).catch(err => console.error("Push notify error:", err));
    }
  } catch (error) {
    console.error("Error creating call log message:", error);
  }
}

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

    // Handle disconnected user mid-call
    const session = activeCalls.get(userId);
    if (session) {
      const peerId = session.callerId === userId ? session.calleeId : session.callerId;
      const peerSocketId = getReceiverSocketId(peerId);
      if (peerSocketId) {
        io.to(peerSocketId).emit("end-call");
      }
      createCallLogMessage(session);
    }
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

  // WebRTC Signaling Handlers
  socket.on("call-user", ({ to, offer, type }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      const session = {
        callerId: userId,
        calleeId: to,
        type,
        startTime: null,
        status: "missed",
        logged: false
      };
      activeCalls.set(userId, session);
      activeCalls.set(to, session);

      io.to(receiverSocketId).emit("call-user", {
        from: userId,
        offer,
        type,
        callerDetails: {
          _id: socket.userId,
          fullName: socket.user?.fullName,
          profilePic: socket.user?.profilePic,
        }
      });
    } else {
      socket.emit("call-rejected", { reason: "offline" });
      createCallLogMessage({
        callerId: userId,
        calleeId: to,
        type,
        startTime: null,
        status: "missed",
        logged: false
      });
    }
  });

  socket.on("answer-call", ({ to, answer }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("answer-call", { answer });
      const session = activeCalls.get(userId);
      if (session) {
        session.startTime = Date.now();
        session.status = "completed";
      }
    }
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("ice-candidate", { candidate, from: userId });
    }
  });

  socket.on("reject-call", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("reject-call");
    }
    const session = activeCalls.get(userId);
    if (session) {
      session.status = "rejected";
      createCallLogMessage(session);
    }
  });

  socket.on("cancel-call", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("cancel-call");
    }
    const session = activeCalls.get(userId);
    if (session) {
      session.status = "missed";
      createCallLogMessage(session);
    }
  });

  socket.on("end-call", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("end-call");
    }
    const session = activeCalls.get(userId);
    if (session) {
      createCallLogMessage(session);
    }
  });

  socket.on("call-busy", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-busy");
    }
    const session = activeCalls.get(userId);
    if (session) {
      session.status = "rejected";
      createCallLogMessage(session);
    }
  });

  socket.on("call-toggle-mute", ({ to, isMuted }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-toggle-mute", { isMuted });
    }
  });

  socket.on("call-toggle-video", ({ to, isVideoOff }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-toggle-video", { isVideoOff });
    }
  });

  socket.on("call-toggle-screen-share", ({ to, isScreenSharing }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-toggle-screen-share", { isScreenSharing });
    }
  });
});

export { io, app, server };