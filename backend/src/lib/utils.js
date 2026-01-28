import jwt from "jsonwebtoken"
export const generateToken = (userId, res) => {
    const { JWT_SECRET } = process.env;
    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }
    const token = jwt.sign({ userId }, JWT_SECRET, {
        expiresIn: "7d",
    });

    // If we are NOT on localhost, we MUST use SameSite: None and Secure: true
    // This handles Render.com and any other hosted environment correctly.
    const isLocalhost = process.env.NODE_ENV === "development";
    const isProduction = !isLocalhost || process.env.RENDER === "true";

    const cookieOptions = {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        sameSite: "none", // Always use none for cross-origin chat apps
        secure: true,     // Always use secure for cross-origin chat apps
        path: "/",
    };

    // If we are definitely on local dev without HTTPS, we can fallback
    if (isLocalhost && process.env.RENDER !== "true") {
        cookieOptions.sameSite = "lax";
        cookieOptions.secure = false;
    }

    console.log("--- Cookie Debug ---");
    console.log("Is Localhost:", isLocalhost);
    console.log("Using SameSite:", cookieOptions.sameSite);
    console.log("Using Secure Flag:", cookieOptions.secure);
    console.log("--------------------");

    res.cookie("jwt", token, cookieOptions);

    return token;
};