import { sendWelcomeEmail } from "../emails/emailHandlers.js";
import cloudinary from "../lib/cloudinary.js";
import { purgeUserData } from "../lib/cleanup.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
//import cloudinary from "../lib/cloudinary.js";
import "dotenv/config";


export const signup = async (req, res) => {
    const { fullName, email, password, phone, location, bio, dob, publicKey } = req.body;
    try {
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be atleast 6 characters" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email" });
        }

        const user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: "Email already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,
            phone: phone || "",
            location: location || "",
            bio: bio || "",
            dob: dob ? new Date(dob) : undefined,
            publicKey: publicKey || null
        });

        if (newUser) {
            const savedUser = await newUser.save();
            generateToken(newUser._id, res);
            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                profilePic: newUser.profilePic,
                phone: newUser.phone,
                location: newUser.location,
                bio: newUser.bio,
                dob: newUser.dob,
                publicKey: newUser.publicKey
            });

            try {
                await sendWelcomeEmail(savedUser.email, savedUser.fullName, process.env.CLIENT_URL);
            } catch (error) {
                console.error("Failed to send welcome email:", error);
            }
        } else {
            res.status(400).json({ message: "Invalid user data" });
        }
    } catch (error) {
        console.log("Error in signup controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid Credentials!" });
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid Credentials!" });

        generateToken(user._id, res);
        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            profilePic: user.profilePic,
            phone: user.phone,
            location: user.location,
            bio: user.bio,
            customStatus: user.customStatus,
            statusEmoji: user.statusEmoji,
            dob: user.dob
        });
    } catch (error) {
        console.error("Error in login", error);
        res.status(500).json({ message: "Internal Server error!" });
    }
};

export const logout = (_, res) => {
    const isLocalhost = process.env.NODE_ENV === "development";
    const cookieOptions = {
        maxAge: 0,
        httpOnly: true,
        sameSite: "none",
        secure: true,
        path: "/",
    };

    if (isLocalhost && process.env.RENDER !== "true") {
        cookieOptions.sameSite = "lax";
        cookieOptions.secure = false;
    }

    res.cookie("jwt", "", cookieOptions);
    res.status(200).json({ message: "Logged out successfully!" });
};

export const updateProfile = async (req, res) => {
    try {
        const { profilePic, fullName, bio, phone, location, dob } = req.body;
        const userId = req.user._id;

        if (!profilePic && !fullName && bio === undefined && phone === undefined && location === undefined && dob === undefined) {
            return res.status(400).json({ message: "At least one profile field is required" });
        }

        const updateData = {};

        if (fullName !== undefined) {
            updateData.fullName = fullName;
        }

        if (bio !== undefined) {
            updateData.bio = bio;
        }

        if (phone !== undefined) {
            updateData.phone = phone;
        }

        if (location !== undefined) {
            updateData.location = location;
        }

        if (dob !== undefined) {
            updateData.dob = dob ? new Date(dob) : null;
        }

        if (profilePic) {
            // Delete old profile picture from Cloudinary if it exists
            if (req.user.profilePic && req.user.profilePic.includes("res.cloudinary.com")) {
                try {
                    const publicId = req.user.profilePic.split("/").pop().split(".")[0];
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId);
                    }
                } catch (err) {
                    console.error("Failed to delete old profile pic from Cloudinary:", err.message);
                }
            }
            try {
                const uploadResponse = await cloudinary.uploader.upload(profilePic);
                updateData.profilePic = uploadResponse.secure_url;
            } catch (uploadError) {
                console.error("Cloudinary upload error in updateProfile:", uploadError.message);
                return res.status(500).json({ message: "Profile image upload failed. Please try again." });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

        res.status(200).json(updatedUser);
    } catch (error) {
        console.log("Error in update profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateStatus = async (req, res) => {
    try {
        const { customStatus, statusEmoji } = req.body;
        const userId = req.user._id;

        const updateData = {};

        if (customStatus !== undefined) {
            updateData.customStatus = customStatus;
        }

        if (statusEmoji !== undefined) {
            updateData.statusEmoji = statusEmoji;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-password");

        res.status(200).json(updatedUser);
    } catch (error) {
        console.log("Error in update status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Purge all messages, files, groups and user records
        await purgeUserData(userId);

        // Clear the cookie
        const isLocalhost = process.env.NODE_ENV === "development";
        const cookieOptions = {
            maxAge: 0,
            httpOnly: true,
            sameSite: "none",
            secure: true,
            path: "/",
        };
        if (isLocalhost && process.env.RENDER !== "true") {
            cookieOptions.sameSite = "lax";
            cookieOptions.secure = false;
        }
        res.cookie("jwt", "", cookieOptions);

        res.status(200).json({ message: "Account permanently deleted and all assets cleaned up successfully." });
    } catch (error) {
        console.error("Error in deleteAccount:", error);
        res.status(500).json({ message: "Failed to delete account. Please try again." });
    }
};

export const updatePublicKey = async (req, res) => {
    try {
        const { publicKey } = req.body;
        const userId = req.user._id;

        if (!publicKey) {
            return res.status(400).json({ message: "Public key is required" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { publicKey },
            { new: true }
        ).select("-password");

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error in updatePublicKey:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
