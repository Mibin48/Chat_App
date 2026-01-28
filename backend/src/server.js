import "dotenv/config";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import { app, server } from "./lib/socket.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";

//const app = express();
const __dirname = path.resolve();

const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url} from origin: ${req.headers.origin}`);
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://chat-app-frontend-oa3t.onrender.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes(origin + "/")) {
      callback(null, true);
    } else {
      console.log("CORS Rejected - Origin:", origin, "Allowed:", allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);


if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}
app.get("/api/debug-cookies", (req, res) => {
  res.json({
    cookies: req.cookies,
    headers: req.headers.cookie,
    env: process.env.NODE_ENV
  });
});

app.post("/debug", (req, res) => {
  res.json(req.body);
});


server.listen(PORT, () => {
  console.log("Server running on port:" + PORT);
  connectDB();
});


