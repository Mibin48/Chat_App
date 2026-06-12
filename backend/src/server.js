import "dotenv/config";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import { app, server } from "./lib/socket.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import groupRoutes from "./routes/group.route.js";
import pushRoutes from "./routes/push.route.js";
import { connectDB } from "./lib/db.js";
import { vapidKeys } from "./lib/push.js";

//const app = express();
const __dirname = path.resolve();

const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url} from origin: ${req.headers.origin}`);
  next();
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(mongoSanitize());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
app.use("/api/groups", groupRoutes);
app.use("/api/push", pushRoutes);

app.get("/api/push/key", (req, res) => {
  res.status(200).json({ publicKey: vapidKeys.publicKey });
});


// Serve static assets if frontend dist exists
const distPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(distPath));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) {
      res.status(404).send("Route not found. If you are running in development, please access the frontend via the Vite development server (usually http://localhost:5173). Otherwise, build the frontend by running 'npm run build' in the frontend directory to serve it from the backend.");
    }
  });
});
if (process.env.NODE_ENV !== "production") {
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
}


// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Global Express Error Handler:", err);
  res.status(err.status || 500).json({
    message: err.message || "An unexpected error occurred on the server."
  });
});

server.listen(PORT, () => {
  console.log("Server running on port:" + PORT);
  connectDB();
});


