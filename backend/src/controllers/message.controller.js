import cloudinary from "../lib/cloudinary.js";
import { sender } from "../lib/resend.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js"
import User from "../models/user.model.js"

export const getAllContacts = async (req, res) => {
    try {
        const loggedInUserID = req.user._id;

        const filteredUsers = await User.find({ _id: { $ne: loggedInUserID } }).select("-password");
        res.status(200).json(filteredUsers);
    } catch (error) {
        console.log("Error in getAllContacts:", error);
        res.status(500).json({ message: "Server error" });
    }
}
export const getMessagesByUserId = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: userToChatId } = req.params;

        const message = await Message.find({
            $or: [
                { senderId: myId, recieverId: userToChatId },
                { senderId: userToChatId, recieverId: myId },
            ],
        });
        res.status(200).json(message)
    } catch (error) {
        console.log("Error in getMessages controller: ", error.message);
    }
};

export const getChatPatners = async (req, res) => {
    try {
        const loggedInUserID = req.user._id;
        const messages = await Message.find({
            $or: [{ senderId: loggedInUserID }, { recieverId: loggedInUserID }],
        });
        const chatPartnerIds = [...new Set(messages.map(msg => msg.senderId.toString() == loggedInUserID.toString() ? msg.recieverId.toString() : msg.senderId.toString()))];

        const chatPartners = await User.find({ _id: { $in: chatPartnerIds } }).select("-password");
        res.status(200).json(chatPartners);
    } catch (error) {
        console.error("Erroe in getChatPartners:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: recieverId } = req.params;
        const senderId = req.user._id;
        if (!text && !image) {
            return res.status(400).json({ message: "Text or image is required." });
        }
        if (senderId.equals(recieverId)) {
            return res.status(400).json({ message: "Cannot send messages to yourself." });
        }

        const receiverExists = await User.exists({ _id: recieverId });
        if (!receiverExists) {
            return res.status(404).json({ message: "Receiver not found." });
        }

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            recieverId,
            text,
            image: imageUrl,
        });

        await newMessage.save();
        const recieverSocketId = getReceiverSocketId(recieverId);
        if (recieverSocketId) {
            io.to(recieverSocketId).emit("newMessage", newMessage);
        }
        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in sendMessage controller:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}


export const deleteMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only delete your own messages" });
        }

        await Message.findByIdAndDelete(messageId);

        // Notify the other user
        const receiverSocketId = getReceiverSocketId(message.recieverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("deleteMessage", messageId);
        }

        res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
        console.log("Error in deleteMessage controller:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};