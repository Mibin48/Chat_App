import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
// Token is verified using JWT_SECRET from process.env loaded in server.js

export const protectRoute = async (req, res, next) => {
    try {
        let token = req.cookies.jwt;
        if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }
        console.log("ProtectRoute - Token found:", !!token);
        if (!token) {
            console.log("ProtectRoute - No token provided. Cookies received:", req.cookies);
            console.log("ProtectRoute - Raw Cookie Header:", req.headers.cookie);
            return res.status(401).json({ message: "Unauthorized - No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ message: "Unauthorized - Invalid token" });
        }

        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Error in protectRoute middleware:", error.message);
        return res.status(401).json({ message: "Unauthorized - Invalid or expired token" });
    }
};