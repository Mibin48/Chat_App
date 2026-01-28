import jwt from "jsonwebtoken"
export const generateToken = (userId, res) => {
    const { JWT_SECRET } = process.env;
    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }
    const token = jwt.sign({ userId }, JWT_SECRET, {
        expiresIn: "7d",
    });

    const isProduction = process.env.NODE_ENV === "production";

    const cookieOptions = {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
        path: "/", // CRITICAL: This ensures the cookie is sent to all routes (auth, messages, etc.)
    };

    console.log("Setting JWT Cookie...");
    console.log("Domain Environment:", process.env.NODE_ENV);
    console.log("Cookie Path:", cookieOptions.path);
    console.log("Cookie SameSite:", cookieOptions.sameSite);

    res.cookie("jwt", token, cookieOptions);

    return token;
};