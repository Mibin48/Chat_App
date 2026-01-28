import jwt from "jsonwebtoken"
export const generateToken = (userId, res) => {
    const { JWT_SECRET } = process.env;
    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }
    const token = jwt.sign({ userId }, JWT_SECRET, {
        expiresIn: "7d",
    });

    const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";

    const cookieOptions = {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
        path: "/",
    };

    console.log("--- Cookie Debug ---");
    console.log("Production Mode:", isProduction);
    console.log("SameSite Flag:", cookieOptions.sameSite);
    console.log("Secure Flag:", cookieOptions.secure);
    console.log("--------------------");

    res.cookie("jwt", token, cookieOptions);

    return token;
};