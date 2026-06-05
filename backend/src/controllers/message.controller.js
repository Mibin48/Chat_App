import cloudinary from "../lib/cloudinary.js";
import { sender } from "../lib/resend.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { uploadToUploadThing } from "../lib/uploadthing.js";

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
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getChatPatners = async (req, res) => {
    try {
        const loggedInUserID = req.user._id;
        const messages = await Message.find({
            $or: [{ senderId: loggedInUserID }, { recieverId: loggedInUserID }],
            groupId: { $exists: false }
        });
        const chatPartnerIds = [...new Set(messages.map(msg => msg.senderId.toString() === loggedInUserID.toString() ? msg.recieverId.toString() : msg.senderId.toString()))];
        const chatPartners = await User.find({ _id: { $in: chatPartnerIds } }).select("-password");

        const chatPartnersWithUnread = await Promise.all(chatPartners.map(async (partner) => {
            const unreadCount = await Message.countDocuments({
                senderId: partner._id,
                recieverId: loggedInUserID,
                'readBy.userId': { $ne: loggedInUserID }
            });
            return {
                ...partner.toObject(),
                unreadCount
            };
        }));
        res.status(200).json(chatPartnersWithUnread);
    } catch (error) {
        console.error("Error in getChatPartners:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { text, image, audioUrl, audioDuration } = req.body;
        const { id: recieverId } = req.params;
        const senderId = req.user._id;
        if (!text && !image && !audioUrl) {
            return res.status(400).json({ message: "Text, image, or audio is required." });
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
            try {
                const uploadResponse = await cloudinary.uploader.upload(image);
                imageUrl = uploadResponse.secure_url;
            } catch (uploadError) {
                console.error("Cloudinary image upload error in sendMessage:", uploadError.message);
                return res.status(500).json({ message: "Image upload failed. Please try again." });
            }
        }

        let finalAudioUrl;
        if (audioUrl) {
            try {
                // Strip codecs parameter from base64 data URI if present (e.g. data:audio/webm;codecs=opus;base64,... -> data:audio/webm;base64,...)
                const cleanedAudioUrl = audioUrl.replace(/;codecs=[^;]+/, "");
                const uploadResponse = await cloudinary.uploader.upload(cleanedAudioUrl, {
                    resource_type: "video",
                    folder: "chat_audio",
                    format: "webm"
                });
                finalAudioUrl = uploadResponse.secure_url;
            } catch (uploadError) {
                console.error("Cloudinary audio upload error in sendMessage:", uploadError.message);
                return res.status(500).json({ message: "Audio upload failed. Please try again." });
            }
        }

        const newMessage = new Message({
            senderId,
            recieverId,
            text,
            image: imageUrl,
            audioUrl: finalAudioUrl,
            audioDuration
        });

        await newMessage.save();
        const recieverSocketId = getReceiverSocketId(recieverId);
        if (recieverSocketId) {
            io.to(recieverSocketId).emit("newMessage", newMessage);
        }
        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in sendMessage controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
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
        res.status(500).json({ message: "Internal server error" });
    }
};

// Add or remove reaction to a message
export const addReaction = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user._id;

        if (!emoji) {
            return res.status(400).json({ message: "Emoji is required" });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        // Check if user already reacted with this emoji
        const existingReactionIndex = message.reactions.findIndex(
            r => r.userId.toString() === userId.toString() && r.emoji === emoji
        );

        if (existingReactionIndex > -1) {
            // Remove reaction
            message.reactions.splice(existingReactionIndex, 1);
        } else {
            // Add reaction
            message.reactions.push({ userId, emoji });
        }

        await message.save();

        // Notify both users
        const receiverSocketId = getReceiverSocketId(message.recieverId);
        const senderSocketId = getReceiverSocketId(message.senderId);

        const reactionData = { messageId, reactions: message.reactions };

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("messageReaction", reactionData);
        }
        if (senderSocketId) {
            io.to(senderSocketId).emit("messageReaction", reactionData);
        }

        res.status(200).json(message);
    } catch (error) {
        console.log("Error in addReaction controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
    try {
        const { id: otherUserId } = req.params;
        const userId = req.user._id;

        // Find all unread messages from the other user
        const messages = await Message.find({
            senderId: otherUserId,
            recieverId: userId,
            'readBy.userId': { $ne: userId }
        });

        // Mark each message as read
        for (const message of messages) {
            message.readBy.push({ userId, readAt: new Date() });
            await message.save();

            // Notify sender
            const senderSocketId = getReceiverSocketId(otherUserId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("messageRead", {
                    messageId: message._id,
                    readBy: userId,
                    readAt: new Date()
                });
            }
        }

        res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
        console.log("Error in markAsRead controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Edit a message
export const editMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ message: "Text is required" });
        }

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only edit your own messages" });
        }

        message.text = text;
        message.isEdited = true;
        message.editedAt = new Date();

        await message.save();

        // Notify the receiver
        const receiverSocketId = getReceiverSocketId(message.recieverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("messageEdited", message);
        }

        res.status(200).json(message);
    } catch (error) {
        console.log("Error in editMessage controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Upload file
export const uploadFile = async (req, res) => {
    try {
        const { file, fileName, fileType, fileSize } = req.body;
        const { id: recieverId } = req.params;
        const senderId = req.user._id;

        if (!file) {
            return res.status(400).json({ message: "File is required" });
        }

        const receiverExists = await User.exists({ _id: recieverId });
        if (!receiverExists) {
            return res.status(404).json({ message: "Receiver not found" });
        }

        const isPdf = fileType?.toLowerCase().includes("pdf") || fileName?.toLowerCase().endsWith(".pdf");
        let fileDataToSave;

        if (isPdf) {
            try {
                const uploadRes = await uploadToUploadThing(file, fileName, fileType);
                fileDataToSave = {
                    fileUrl: uploadRes.url,
                    fileName: uploadRes.name,
                    fileType: uploadRes.type,
                    fileSize: uploadRes.size,
                };
            } catch (utError) {
                console.error("UploadThing PDF upload error in uploadFile:", utError.message);
                return res.status(500).json({ message: "PDF upload failed. Please try again." });
            }
        } else {
            // Upload to cloudinary
            try {
                const uploadResponse = await cloudinary.uploader.upload(file, {
                    resource_type: "auto",
                    folder: "chat_files"
                });
                fileDataToSave = {
                    fileUrl: uploadResponse.secure_url,
                    fileName: fileName || uploadResponse.original_filename || "file",
                    fileType: fileType || uploadResponse.format,
                    fileSize: fileSize || uploadResponse.bytes,
                };
            } catch (uploadError) {
                console.error("Cloudinary upload error in uploadFile:", uploadError.message);
                return res.status(500).json({ message: "File upload failed. Please try again." });
            }
        }

        const newMessage = new Message({
            senderId,
            recieverId,
            fileUrl: fileDataToSave.fileUrl,
            fileName: fileDataToSave.fileName,
            fileType: fileDataToSave.fileType,
            fileSize: fileDataToSave.fileSize,
        });

        await newMessage.save();

        const recieverSocketId = getReceiverSocketId(recieverId);
        if (recieverSocketId) {
            io.to(recieverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in uploadFile controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Search messages
export const searchMessages = async (req, res) => {
    try {
        const { query, userId, type } = req.query;
        const myId = req.user._id;

        if (!query && !type) {
            return res.status(400).json({ message: "Search query or filter type is required" });
        }

        const searchFilter = {
            $or: [
                { senderId: myId, recieverId: userId || { $exists: true } },
                { senderId: userId || { $exists: true }, recieverId: myId },
            ]
        };

        if (query) {
            searchFilter.text = { $regex: query, $options: 'i' };
        }

        if (type === 'image') {
            searchFilter.image = { $exists: true, $ne: null };
        } else if (type === 'audio') {
            searchFilter.audioUrl = { $exists: true, $ne: null };
        } else if (type === 'file') {
            searchFilter.fileUrl = { $exists: true, $ne: null };
        } else if (type === 'text') {
            searchFilter.text = query 
                ? { $regex: query, $options: 'i' }
                : { $exists: true, $ne: "" };
            searchFilter.image = { $exists: false };
            searchFilter.audioUrl = { $exists: false };
            searchFilter.fileUrl = { $exists: false };
        }

        const messages = await Message.find(searchFilter)
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in searchMessages controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const togglePinMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        message.isPinned = !message.isPinned;
        await message.save();

        const populatedMessage = await Message.findById(messageId)
            .populate("senderId", "fullName profilePic");

        // Broadcast real-time pin update
        if (message.groupId) {
            io.to("group_" + message.groupId.toString()).emit("messagePinStatus", populatedMessage);
        } else {
            const receiverSocketId = getReceiverSocketId(message.recieverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("messagePinStatus", populatedMessage);
            }
            const senderSocketId = getReceiverSocketId(message.senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("messagePinStatus", populatedMessage);
            }
        }

        res.status(200).json(populatedMessage);
    } catch (error) {
        console.error("Error in togglePinMessage controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
