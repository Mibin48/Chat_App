import cloudinary from "../lib/cloudinary.js";
import { sender } from "../lib/brevo.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { uploadToUploadThing } from "../lib/uploadthing.js";
import mongoose from "mongoose";
import { sendPushNotificationToUsers } from "../lib/push.js";
import Group from "../models/group.model.js";

export const getAllContacts = async (req, res) => {
    try {
        const loggedInUserID = req.user._id;
        const user = await User.findById(loggedInUserID).populate("friends", "-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user.friends || []);
    } catch (error) {
        console.log("Error in getAllContacts:", error);
        res.status(500).json({ message: "Server error" });
    }
}
export const getMessagesByUserId = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: userToChatId } = req.params;
        const { before, limit = 30 } = req.query;

        const query = {
            $or: [
                { senderId: myId, recieverId: userToChatId },
                { senderId: userToChatId, recieverId: myId },
            ],
        };

        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .populate("replyTo", "text image audioUrl fileUrl fileName senderId isEncrypted createdAt")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
            
        res.status(200).json(messages.reverse());
    } catch (error) {
        console.log("Error in getMessages controller: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getChatPatners = async (req, res) => {
    try {
        const loggedInUserID = req.user._id;
        const loggedInUserObjectId = new mongoose.Types.ObjectId(loggedInUserID);

        // Aggregate unique partner IDs directly inside MongoDB
        const chatPartnersAggregate = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: loggedInUserObjectId },
                        { recieverId: loggedInUserObjectId }
                    ],
                    groupId: { $exists: false }
                }
            },
            {
                $project: {
                    partnerId: {
                        $cond: {
                            if: { $eq: ["$senderId", loggedInUserObjectId] },
                            then: "$recieverId",
                            else: "$senderId"
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$partnerId"
                }
            }
        ]);

        const chatPartnerIds = chatPartnersAggregate
            .map(item => item._id)
            .filter(id => id !== null && id !== undefined);

        const chatPartners = await User.find({ _id: { $in: chatPartnerIds } }).select("-password");

        const chatPartnersWithUnread = await Promise.all(chatPartners.map(async (partner) => {
            const unreadCount = await Message.countDocuments({
                senderId: partner._id,
                recieverId: loggedInUserObjectId,
                'readBy.userId': { $ne: loggedInUserObjectId }
            });
            const lastMessage = await Message.findOne({
                $or: [
                    { senderId: loggedInUserObjectId, recieverId: partner._id },
                    { senderId: partner._id, recieverId: loggedInUserObjectId }
                ]
            }).sort({ createdAt: -1 });

            return {
                ...partner.toObject(),
                unreadCount,
                lastMessage
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
        const {
            text,
            image,
            audioUrl,
            audioDuration,
            fileUrl,
            fileName,
            fileType,
            fileSize,
            iv,
            mediaIv,
            isEncrypted,
            replyTo,
            contentType,
            sharedContact
        } = req.body;
        const { id: recieverId } = req.params;
        const senderId = req.user._id;
        
        if (!text && !image && !audioUrl && !fileUrl && !sharedContact) {
            return res.status(400).json({ message: "Content is required." });
        }
        if (senderId.equals(recieverId)) {
            return res.status(400).json({ message: "Cannot send messages to yourself." });
        }

        const receiverExists = await User.exists({ _id: recieverId });
        if (!receiverExists) {
            return res.status(404).json({ message: "Receiver not found." });
        }

        const senderUser = await User.findById(senderId);
        const receiverUser = await User.findById(recieverId);

        if (senderUser.blockedUsers && senderUser.blockedUsers.includes(recieverId)) {
            return res.status(403).json({ message: "You have blocked this user. Please unblock them first." });
        }
        if (receiverUser.blockedUsers && receiverUser.blockedUsers.includes(senderId)) {
            return res.status(403).json({ message: "You have been blocked by this user." });
        }

        let imageUrl = image;
        if (image && image.startsWith("data:")) {
            try {
                const uploadOptions = isEncrypted ? { resource_type: "raw" } : {};
                const uploadResponse = await cloudinary.uploader.upload(image, uploadOptions);
                imageUrl = uploadResponse.secure_url;
            } catch (uploadError) {
                console.error("Cloudinary image upload error in sendMessage:", uploadError.message);
                return res.status(500).json({ message: "Image upload failed. Please try again." });
            }
        }

        let finalAudioUrl = audioUrl;
        if (audioUrl && audioUrl.startsWith("data:")) {
            try {
                // Strip codecs parameter from base64 data URI if present (e.g. data:audio/webm;codecs=opus;base64,... -> data:audio/webm;base64,...)
                const cleanedAudioUrl = audioUrl.replace(/;codecs=[^;]+/, "");
                const uploadOptions = isEncrypted 
                    ? { resource_type: "raw", folder: "chat_audio" }
                    : { resource_type: "video", folder: "chat_audio", format: "webm" };
                const uploadResponse = await cloudinary.uploader.upload(cleanedAudioUrl, uploadOptions);
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
            audioDuration,
            fileUrl,
            fileName,
            fileType,
            fileSize,
            mediaIv: mediaIv || undefined,
            iv: iv || undefined,
            isEncrypted: isEncrypted || false,
            replyTo: replyTo || null,
            contentType: contentType || "text",
            sharedContact: sharedContact || undefined
        });

        await newMessage.save();

        // Populate replyTo so client gets the quoted message content
        const populatedMessage = await Message.findById(newMessage._id)
            .populate("replyTo", "text image audioUrl fileUrl fileName senderId isEncrypted");

        const recieverSocketId = getReceiverSocketId(recieverId);
        if (recieverSocketId) {
            io.to(recieverSocketId).emit("newMessage", populatedMessage);
        }

        const pushPayload = {
            senderId: req.user._id,
            senderName: req.user.fullName,
            isEncrypted: populatedMessage.isEncrypted,
            text: populatedMessage.text,
            iv: populatedMessage.iv,
            image: populatedMessage.image,
            mediaIv: populatedMessage.mediaIv,
            isGroup: false,
            createdAt: populatedMessage.createdAt,
            senderPublicKey: req.user.publicKey,
        };
        sendPushNotificationToUsers(recieverId, pushPayload).catch(err => console.error("Push notify error:", err));

        res.status(201).json(populatedMessage);
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
        const { id: targetId } = req.params;
        const userId = req.user._id;

        // Check if targetId is a group
        const group = await Group.findById(targetId);
        if (group) {
            // Verify membership
            const isMember = group.members.some(m => m.userId.toString() === userId.toString());
            if (!isMember) {
                return res.status(403).json({ message: "Access denied. You are not a member of this group." });
            }

            // Find all group messages the current user hasn't read yet (excluding own messages)
            const messages = await Message.find({
                groupId: targetId,
                senderId: { $ne: userId },
                'readBy.userId': { $ne: userId }
            });

            // Mark each message as read
            for (const message of messages) {
                message.readBy.push({ userId, readAt: new Date() });
                await message.save();

                // Broadcast to the group socket room
                io.to("group_" + targetId).emit("messageRead", {
                    messageId: message._id,
                    readBy: userId,
                    readAt: new Date()
                });
            }

            return res.status(200).json({ message: "Group messages marked as read" });
        }

        // Standard 1-to-1 mark as read
        const messages = await Message.find({
            senderId: targetId,
            recieverId: userId,
            'readBy.userId': { $ne: userId }
        });

        // Mark each message as read
        for (const message of messages) {
            message.readBy.push({ userId, readAt: new Date() });
            await message.save();

            // Notify sender
            const senderSocketId = getReceiverSocketId(targetId);
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
        const { file, fileName, fileType, fileSize, mediaIv, isEncrypted, replyTo } = req.body;
        const { id: recieverId } = req.params;
        const senderId = req.user._id;

        if (!file) {
            return res.status(400).json({ message: "File is required" });
        }

        const receiverExists = await User.exists({ _id: recieverId });
        if (!receiverExists) {
            return res.status(404).json({ message: "Receiver not found" });
        }

        const senderUser = await User.findById(senderId);
        const receiverUser = await User.findById(recieverId);

        if (senderUser.blockedUsers && senderUser.blockedUsers.includes(recieverId)) {
            return res.status(403).json({ message: "You have blocked this user. Please unblock them first." });
        }
        if (receiverUser.blockedUsers && receiverUser.blockedUsers.includes(senderId)) {
            return res.status(403).json({ message: "You have been blocked by this user." });
        }

        const isPdf = !isEncrypted && (fileType?.toLowerCase().includes("pdf") || fileName?.toLowerCase().endsWith(".pdf"));
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
                const uploadOptions = isEncrypted 
                    ? { resource_type: "raw", folder: "chat_files" }
                    : { resource_type: "auto", folder: "chat_files" };
                const uploadResponse = await cloudinary.uploader.upload(file, uploadOptions);
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
            mediaIv: mediaIv || undefined,
            isEncrypted: isEncrypted || false,
            replyTo: replyTo || null
        });

        await newMessage.save();

        const populatedMessage = await Message.findById(newMessage._id)
            .populate("replyTo", "text image audioUrl fileUrl fileName senderId isEncrypted");

        const recieverSocketId = getReceiverSocketId(recieverId);
        if (recieverSocketId) {
            io.to(recieverSocketId).emit("newMessage", populatedMessage);
        }

        const pushPayload = {
            senderId: req.user._id,
            senderName: req.user.fullName,
            isEncrypted: populatedMessage.isEncrypted,
            text: populatedMessage.text,
            iv: populatedMessage.iv,
            image: populatedMessage.image,
            mediaIv: populatedMessage.mediaIv,
            fileUrl: populatedMessage.fileUrl,
            fileName: populatedMessage.fileName,
            fileType: populatedMessage.fileType,
            isGroup: false,
            createdAt: populatedMessage.createdAt,
            senderPublicKey: req.user.publicKey,
        };
        sendPushNotificationToUsers(recieverId, pushPayload).catch(err => console.error("Push notify error:", err));

        res.status(201).json(populatedMessage);
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

export const toggleStarMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        if (!message.starredBy) {
            message.starredBy = [];
        }

        const starredIndex = message.starredBy.indexOf(userId);
        if (starredIndex > -1) {
            message.starredBy.splice(starredIndex, 1);
        } else {
            message.starredBy.push(userId);
        }

        await message.save();

        const populatedMessage = await Message.findById(messageId)
            .populate("senderId", "fullName profilePic");

        res.status(200).json(populatedMessage);
    } catch (error) {
        console.error("Error in toggleStarMessage controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getStarredMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const starredMessages = await Message.find({ starredBy: userId })
            .populate("senderId", "fullName profilePic")
            .populate("recieverId", "fullName profilePic")
            .sort({ createdAt: -1 });

        res.status(200).json(starredMessages);
    } catch (error) {
        console.error("Error in getStarredMessages controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getLinkPreview = async (req, res) => {
    try {
        let { url } = req.query;
        if (!url) {
            return res.status(400).json({ message: "URL is required" });
        }

        // Add protocol if missing
        if (!/^https?:\/\//i.test(url)) {
            url = "http://" + url;
        }

        // Parse and validate URL structure
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch (e) {
            return res.status(400).json({ message: "Invalid URL format" });
        }

        // Fetch HTML content with timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        let response;
        try {
            response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
                }
            });
        } catch (fetchErr) {
            clearTimeout(timeoutId);
            return res.status(200).json({
                title: parsedUrl.hostname,
                description: `Link to ${parsedUrl.hostname}`,
                image: "",
                url: url
            });
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
            return res.status(200).json({
                title: parsedUrl.hostname,
                description: `Link to ${parsedUrl.hostname}`,
                image: "",
                url: url
            });
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
            return res.status(200).json({
                title: parsedUrl.hostname,
                description: `Shared attachment (${contentType.split(';')[0]})`,
                image: "",
                url: url
            });
        }

        const html = await response.text();

        // Extract metadata using regexes
        const getMetaTag = (propertyOrName) => {
            const regex = new RegExp(
                `<meta[^>]+(?:property|name)=["']${propertyOrName}["'][^>]+content=["']([^"']+)["']`,
                "i"
            );
            const regexReverse = new RegExp(
                `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${propertyOrName}["']`,
                "i"
            );
            const match = html.match(regex) || html.match(regexReverse);
            return match ? match[1] : null;
        };

        const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = getMetaTag("og:title") || getMetaTag("twitter:title") || (titleTagMatch ? titleTagMatch[1] : parsedUrl.hostname);
        const description = getMetaTag("og:description") || getMetaTag("description") || getMetaTag("twitter:description") || `Link to ${parsedUrl.hostname}`;
        let image = getMetaTag("og:image") || getMetaTag("twitter:image") || "";

        // If image URL is relative, convert to absolute
        if (image && !/^https?:\/\//i.test(image)) {
            try {
                image = new URL(image, url).toString();
            } catch (err) {
                // Ignore conversion error
            }
        }

        // Clean html entities
        const decodeHtml = (str) => {
            return str
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .trim();
        };

        res.status(200).json({
            title: decodeHtml(title).slice(0, 100),
            description: decodeHtml(description).slice(0, 200),
            image: image,
            url: url
        });
    } catch (error) {
        console.error("Error in getLinkPreview controller:", error);
        res.status(200).json({
            title: "Link Shared",
            description: "Click to open the link in a new tab.",
            image: "",
            url: req.query.url
        });
    }
};

export const castPollVote = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const { optionIndex } = req.body;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found." });
        }

        if (!message.poll || !message.groupId) {
            return res.status(400).json({ message: "Message is not a poll." });
        }

        if (message.poll.isClosed) {
            return res.status(400).json({ message: "Poll is closed." });
        }

        const group = await Group.findById(message.groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found." });
        }

        const isMember = group.members.some(m => m.userId.toString() === userId.toString());
        if (!isMember) {
            return res.status(403).json({ message: "Access denied. You are not a member of this group." });
        }

        const poll = message.poll;
        if (optionIndex < 0 || optionIndex >= poll.options.length) {
            return res.status(400).json({ message: "Invalid option index." });
        }

        // Cast vote
        poll.options.forEach((opt, idx) => {
            const hasVoted = opt.votes.some(v => v.toString() === userId.toString());
            if (poll.isMultiSelect) {
                if (idx === optionIndex) {
                    if (hasVoted) {
                        opt.votes = opt.votes.filter(v => v.toString() !== userId.toString());
                    } else {
                        opt.votes.push(userId);
                    }
                }
            } else {
                // Single select
                if (idx === optionIndex) {
                    if (hasVoted) {
                        opt.votes = opt.votes.filter(v => v.toString() !== userId.toString());
                    } else {
                        opt.votes.push(userId);
                    }
                } else {
                    opt.votes = opt.votes.filter(v => v.toString() !== userId.toString());
                }
            }
        });

        await message.save();

        const populatedMessage = await Message.findById(messageId)
            .populate("senderId", "fullName profilePic")
            .populate("replyTo", "text image audioUrl fileUrl fileName senderId isEncrypted createdAt");

        io.to("group_" + message.groupId.toString()).emit("messageUpdated", populatedMessage);

        res.status(200).json(populatedMessage);
    } catch (error) {
        console.error("Error in castPollVote:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const closePoll = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found." });
        }

        if (!message.poll || !message.groupId) {
            return res.status(400).json({ message: "Message is not a poll." });
        }

        const group = await Group.findById(message.groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found." });
        }

        const isCreator = message.senderId.toString() === userId.toString();

        if (!isCreator) {
            return res.status(403).json({ message: "Only the poll creator can close this poll." });
        }

        message.poll.isClosed = true;
        await message.save();

        const populatedMessage = await Message.findById(messageId)
            .populate("senderId", "fullName profilePic")
            .populate("replyTo", "text image audioUrl fileUrl fileName senderId isEncrypted createdAt");

        io.to("group_" + message.groupId.toString()).emit("messageUpdated", populatedMessage);

        res.status(200).json(populatedMessage);
    } catch (error) {
        console.error("Error in closePoll:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getCallHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const calls = await Message.find({
            $or: [
                { senderId: userId },
                { recieverId: userId }
            ],
            callInfo: { $exists: true, $ne: null }
        })
        .populate("senderId", "fullName profilePic")
        .populate("recieverId", "fullName profilePic")
        .sort({ createdAt: -1 });

        res.status(200).json(calls);
    } catch (error) {
        console.error("Error in getCallHistory controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const clearChat = async (req, res) => {
    try {
        const { id: chatId } = req.params;
        const myId = req.user._id;

        // Check if chatId is a group or user
        const isGroup = await Group.exists({ _id: chatId });

        if (isGroup) {
            const group = await Group.findById(chatId);
            const isMember = group.members.some(m => m.userId.toString() === myId.toString());
            if (!isMember) {
                return res.status(403).json({ message: "Access denied. You are not a member of this group." });
            }

            // Delete all messages in the group
            await Message.deleteMany({ groupId: chatId });

            // Notify group channel
            io.to("group_" + chatId).emit("groupChatCleared", { groupId: chatId });

            return res.status(200).json({ message: "Group chat history cleared successfully" });
        } else {
            // Delete all DM messages between users
            await Message.deleteMany({
                $or: [
                    { senderId: myId, recieverId: chatId },
                    { senderId: chatId, recieverId: myId }
                ]
            });

            // Notify recipient if online
            const receiverSocketId = getReceiverSocketId(chatId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("chatCleared", { senderId: myId, recieverId: chatId });
            }

            return res.status(200).json({ message: "Chat history cleared successfully" });
        }
    } catch (error) {
        console.error("Error in clearChat controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};
