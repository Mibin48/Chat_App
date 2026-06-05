import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import "dotenv/config";

export const socketAuthMiddleware = async (socket, next) => {
  try {
    // extract token from http-only cookies or authorization header
    let token;
    const cookieString = socket.handshake.headers.cookie;
    if (cookieString) {
      token = cookieString
        .split("; ")
        .find((row) => row.startsWith("jwt="))
        ?.split("=")[1];
    }

    if (!token && socket.handshake.headers.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      console.log("Socket connection rejected: No token found in cookies or authorization header");
      return next(new Error("Unauthorized - No Token Provided"));
    }

    // verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      console.log("Socket connection rejected: Invalid token");
      return next(new Error("Unauthorized - Invalid Token"));
    }

    // find the user fromdb
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      console.log("Socket connection rejected: User not found");
      return next(new Error("User not found"));
    }

    // attach user info to socket
    socket.user = user;
    socket.userId = user._id.toString();

    console.log(`Socket authenticated for user: ${user.fullName} (${user._id})`);

    next();
  } catch (error) {
    console.log("Error in socket authentication:", error.message);
    next(new Error("Unauthorized - Authentication failed"));
  }
};