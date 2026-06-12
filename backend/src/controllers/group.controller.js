import cloudinary from "../lib/cloudinary.js";
import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { uploadToUploadThing } from "../lib/uploadthing.js";
import GroupKey from "../models/groupKey.model.js";
import { sendPushNotificationToUsers } from "../lib/push.js";

export const createGroup = async (req, res) => {
    try {
        const { name, description, members, avatar, groupKeys } = req.body;
        const creatorId = req.user._id;

        if (!name) {
            return res.status(400).json({ message: "Group name is required." });
        }

        let avatarUrl = "";
        if (avatar) {
            try {
                const uploadResponse = await cloudinary.uploader.upload(avatar);
                avatarUrl = uploadResponse.secure_url;
            } catch (error) {
                console.error("Cloudinary group avatar upload error:", error);
                return res.status(500).json({ message: "Avatar upload failed." });
            }
        }

        // Prepare members array
        // Make sure creator is included
        const memberList = [{ userId: creatorId, role: "admin", joinedAt: new Date() }];

        if (Array.isArray(members)) {
            members.forEach(memberId => {
                if (memberId.toString() !== creatorId.toString()) {
                    memberList.push({
                        userId: memberId,
                        role: "member",
                        joinedAt: new Date()
                    });
                }
            });
        }

        const newGroup = new Group({
            name,
            description,
            avatar: avatarUrl,
            creatorId,
            members: memberList
        });

        await newGroup.save();

        if (Array.isArray(groupKeys)) {
            const keysToSave = groupKeys.map(k => ({
                groupId: newGroup._id,
                userId: k.userId,
                encryptedKey: k.encryptedKey,
                iv: k.iv,
                encryptedBy: creatorId
            }));
            await GroupKey.insertMany(keysToSave);
        }

        // Populate members userId details (so frontend gets name/profilePic/etc.)
        const populatedGroup = await Group.findById(newGroup._id)
            .populate("members.userId", "fullName profilePic publicKey");

        // Broadcast to all members to join room
        memberList.forEach(m => {
            const socketId = getReceiverSocketId(m.userId);
            if (socketId) {
                io.to(socketId).emit("join_new_group", {
                    groupId: newGroup._id,
                    group: populatedGroup
                });
            }
        });

        res.status(201).json(populatedGroup);
    } catch (error) {
        console.error("Error in createGroup:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getMyGroups = async (req, res) => {
    try {
        const userId = req.user._id;

        const groups = await Group.find({ "members.userId": userId })
            .populate("members.userId", "fullName profilePic publicKey")
            .populate({
                path: "lastMessage",
                populate: {
                    path: "senderId",
                    select: "fullName profilePic"
                }
            })
            .sort({ updatedAt: -1 });

        res.status(200).json(groups);
    } catch (error) {
        console.error("Error in getMyGroups:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getGroupMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id: groupId } = req.params;
        const { before, limit = 30 } = req.query;

        // Verify membership
        const group = await Group.findOne({ _id: groupId, "members.userId": userId });
        if (!group) {
            return res.status(403).json({ message: "Access denied. You are not a member of this group." });
        }

        const query = { groupId };
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .populate("senderId", "fullName profilePic")
            .populate("replyTo", "text image audioUrl fileUrl fileName senderId isEncrypted createdAt")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.status(200).json(messages.reverse());
    } catch (error) {
        console.error("Error in getGroupMessages:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const sendGroupMessage = async (req, res) => {
    try {
        const { text, image, audioUrl, audioDuration, file, fileName, fileType, fileSize, mediaIv, iv, isEncrypted, replyTo, isAnnouncement, poll } = req.body;
        const { id: groupId } = req.params;
        const senderId = req.user._id;

        // Verify membership
        const group = await Group.findOne({ _id: groupId, "members.userId": senderId });
        if (!group) {
            return res.status(403).json({ message: "Access denied. You are not a member of this group." });
        }

        if (isAnnouncement) {
            const requester = group.members.find(m => m.userId.toString() === senderId.toString());
            const isAdmin = requester?.role === "admin" || group.creatorId.toString() === senderId.toString();
            if (!isAdmin) {
                return res.status(403).json({ message: "Only group admins can post announcements." });
            }
        }

        if (!text && !image && !audioUrl && !file && !poll) {
            return res.status(400).json({ message: "Message content or poll is required." });
        }

        let imageUrl = "";
        if (image) {
            try {
                const uploadOptions = isEncrypted ? { resource_type: "raw" } : {};
                const uploadResponse = await cloudinary.uploader.upload(image, uploadOptions);
                imageUrl = uploadResponse.secure_url;
            } catch (error) {
                console.error("Cloudinary group image upload error:", error);
                return res.status(500).json({ message: "Image upload failed." });
            }
        }

        let finalAudioUrl = "";
        if (audioUrl) {
            try {
                const cleanedAudioUrl = audioUrl.replace(/;codecs=[^;]+/, "");
                const uploadOptions = isEncrypted 
                    ? { resource_type: "raw", folder: "chat_audio" }
                    : { resource_type: "video", folder: "chat_audio", format: "webm" };
                const uploadResponse = await cloudinary.uploader.upload(cleanedAudioUrl, uploadOptions);
                finalAudioUrl = uploadResponse.secure_url;
            } catch (error) {
                console.error("Cloudinary group audio upload error:", error);
                return res.status(500).json({ message: "Audio upload failed." });
            }
        }

        let finalFileUrl = "";
        let finalFileName = fileName;
        let finalFileType = fileType;
        let finalFileSize = fileSize;
        if (file) {
            const isPdf = !isEncrypted && (fileType?.toLowerCase().includes("pdf") || fileName?.toLowerCase().endsWith(".pdf"));
            if (isPdf) {
                try {
                    const utRes = await uploadToUploadThing(file, fileName, fileType);
                    finalFileUrl = utRes.url;
                    finalFileName = utRes.name;
                    finalFileType = utRes.type;
                    finalFileSize = utRes.size;
                } catch (error) {
                    console.error("UploadThing group PDF upload error:", error);
                    return res.status(500).json({ message: "File upload failed." });
                }
            } else {
                try {
                    const uploadOptions = isEncrypted 
                        ? { resource_type: "raw", folder: "chat_files" }
                        : { resource_type: "auto", folder: "chat_files" };
                    const uploadResponse = await cloudinary.uploader.upload(file, uploadOptions);
                    finalFileUrl = uploadResponse.secure_url;
                    finalFileName = fileName || uploadResponse.original_filename || "file";
                    finalFileType = fileType || uploadResponse.format;
                    finalFileSize = fileSize || uploadResponse.bytes;
                } catch (error) {
                    console.error("Cloudinary group file upload error:", error);
                    return res.status(500).json({ message: "File upload failed." });
                }
            }
        }

        const newMessage = new Message({
            senderId,
            groupId,
            text,
            image: imageUrl || undefined,
            audioUrl: finalAudioUrl || undefined,
            audioDuration: audioDuration || undefined,
            fileUrl: finalFileUrl || undefined,
            fileName: finalFileName || undefined,
            fileType: finalFileType || undefined,
            fileSize: finalFileSize || undefined,
            mediaIv: mediaIv || undefined,
            iv: iv || undefined,
            isEncrypted: isEncrypted || false,
            replyTo: replyTo || null,
            isAnnouncement: isAnnouncement || false,
            poll: poll ? {
                question: poll.question,
                iv: poll.iv,
                isClosed: false,
                isMultiSelect: poll.isMultiSelect || false,
                anonymous: poll.anonymous || false,
                options: poll.options.map(opt => ({
                    optionText: opt.optionText,
                    iv: opt.iv,
                    votes: []
                }))
            } : undefined
        });

        await newMessage.save();

        // Update group lastMessage
        group.lastMessage = newMessage._id;
        await group.save();

        // Populate sender details and replyTo for socket broadcast
        const populatedMessage = await Message.findById(newMessage._id)
            .populate("senderId", "fullName profilePic")
            .populate("replyTo", "text image audioUrl fileUrl fileName senderId isEncrypted");

        // Broadcast to group room
        io.to("group_" + groupId).emit("newGroupMessage", populatedMessage);

        const groupMembersIds = group.members
            .map(m => m.userId.toString())
            .filter(id => id !== senderId.toString());

        const pushPayload = {
            senderName: req.user.fullName,
            isEncrypted: populatedMessage.isEncrypted,
            text: populatedMessage.text,
            iv: populatedMessage.iv,
            image: populatedMessage.image,
            mediaIv: populatedMessage.mediaIv,
            fileUrl: populatedMessage.fileUrl,
            fileName: populatedMessage.fileName,
            fileType: populatedMessage.fileType,
            isGroup: true,
            groupId: groupId.toString(),
            groupName: group.name,
            createdAt: populatedMessage.createdAt,
        };
        sendPushNotificationToUsers(groupMembersIds, pushPayload).catch(err => console.error("Group push notify error:", err));

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error("Error in sendGroupMessage:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateGroupDetails = async (req, res) => {
    try {
        const { id: groupId } = req.params;
        const { name, description, avatar } = req.body;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found." });
        }

        const requester = group.members.find(m => m.userId.toString() === userId.toString());
        if (!requester || requester.role !== "admin") {
            return res.status(403).json({ message: "Only admins can update group details." });
        }

        if (name) group.name = name;
        if (description !== undefined) group.description = description;

        if (avatar) {
            try {
                if (!avatar.startsWith("http")) {
                    const uploadResponse = await cloudinary.uploader.upload(avatar);
                    group.avatar = uploadResponse.secure_url;
                }
            } catch (error) {
                console.error("Cloudinary group avatar upload error:", error);
                return res.status(500).json({ message: "Avatar upload failed." });
            }
        }

        await group.save();

        const populatedGroup = await Group.findById(groupId)
            .populate("members.userId", "fullName profilePic")
            .populate({
                path: "lastMessage",
                populate: {
                    path: "senderId",
                    select: "fullName profilePic"
                }
            });

        io.to("group_" + groupId).emit("groupUpdated", populatedGroup);

        res.status(200).json(populatedGroup);
    } catch (error) {
        console.error("Error in updateGroupDetails:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const addMembers = async (req, res) => {
    try {
        const { id: groupId } = req.params;
        const { userIds, newKeys } = req.body;
        const requesterId = req.user._id;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: "userIds array is required." });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found." });
        }

        const requester = group.members.find(m => m.userId.toString() === requesterId.toString());
        if (!requester || requester.role !== "admin") {
            return res.status(403).json({ message: "Only admins can add members." });
        }

        userIds.forEach(userId => {
            const exists = group.members.some(m => m.userId.toString() === userId.toString());
            if (!exists) {
                group.members.push({
                    userId,
                    role: "member",
                    joinedAt: new Date()
                });
            }
        });

        await group.save();

        if (Array.isArray(newKeys)) {
            const keysToSave = newKeys.map(k => ({
                groupId,
                userId: k.userId,
                encryptedKey: k.encryptedKey,
                iv: k.iv,
                encryptedBy: requesterId
            }));
            for (const k of keysToSave) {
                await GroupKey.findOneAndUpdate(
                    { groupId: k.groupId, userId: k.userId },
                    k,
                    { upsert: true, new: true }
                );
            }
        }

        const populatedGroup = await Group.findById(groupId)
            .populate("members.userId", "fullName profilePic publicKey")
            .populate({
                path: "lastMessage",
                populate: {
                    path: "senderId",
                    select: "fullName profilePic"
                }
            });

        userIds.forEach(userId => {
            const socketId = getReceiverSocketId(userId);
            if (socketId) {
                io.to(socketId).emit("join_new_group", {
                    groupId,
                    group: populatedGroup
                });
            }
        });

        io.to("group_" + groupId).emit("groupUpdated", populatedGroup);

        res.status(200).json(populatedGroup);
    } catch (error) {
        console.error("Error in addMembers:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const removeMember = async (req, res) => {
    try {
        const { id: groupId } = req.params;
        const { userIdToRemove, rotatedKeys } = req.body;
        const requesterId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found." });
        }

        const requester = group.members.find(m => m.userId.toString() === requesterId.toString());
        if (!requester || requester.role !== "admin") {
            return res.status(403).json({ message: "Only admins can remove members." });
        }

        if (userIdToRemove.toString() === group.creatorId.toString()) {
            return res.status(400).json({ message: "Cannot remove the group creator." });
        }

        group.members = group.members.filter(m => m.userId.toString() !== userIdToRemove.toString());
        await group.save();

        if (Array.isArray(rotatedKeys)) {
            await GroupKey.deleteMany({ groupId });
            const keysToSave = rotatedKeys.map(k => ({
                groupId,
                userId: k.userId,
                encryptedKey: k.encryptedKey,
                iv: k.iv,
                encryptedBy: requesterId
            }));
            await GroupKey.insertMany(keysToSave);
        } else {
            await GroupKey.deleteMany({ groupId, userId: userIdToRemove });
        }

        const populatedGroup = await Group.findById(groupId)
            .populate("members.userId", "fullName profilePic publicKey")
            .populate({
                path: "lastMessage",
                populate: {
                    path: "senderId",
                    select: "fullName profilePic"
                }
            });

        const removedSocketId = getReceiverSocketId(userIdToRemove);
        if (removedSocketId) {
            io.to(removedSocketId).emit("removedFromGroup", { groupId });
        }

        io.to("group_" + groupId).emit("groupUpdated", populatedGroup);

        res.status(200).json(populatedGroup);
    } catch (error) {
        console.error("Error in removeMember:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateMemberRole = async (req, res) => {
    try {
        const { id: groupId } = req.params;
        const { targetUserId, role } = req.body;
        const requesterId = req.user._id;

        if (!["admin", "member"].includes(role)) {
            return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'member'." });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found." });
        }

        const requester = group.members.find(m => m.userId.toString() === requesterId.toString());
        if (!requester || requester.role !== "admin") {
            return res.status(403).json({ message: "Only admins can change roles." });
        }

        if (targetUserId.toString() === group.creatorId.toString() && role === "member") {
            return res.status(400).json({ message: "Cannot demote the group creator." });
        }

        const member = group.members.find(m => m.userId.toString() === targetUserId.toString());
        if (!member) {
            return res.status(404).json({ message: "Member not found in group." });
        }

        member.role = role;
        await group.save();

        const populatedGroup = await Group.findById(groupId)
            .populate("members.userId", "fullName profilePic publicKey")
            .populate({
                path: "lastMessage",
                populate: {
                    path: "senderId",
                    select: "fullName profilePic"
                }
            });

        io.to("group_" + groupId).emit("groupUpdated", populatedGroup);

        res.status(200).json(populatedGroup);
    } catch (error) {
        console.error("Error in updateMemberRole:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const leaveGroup = async (req, res) => {
    try {
        const { id: groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found." });
        }

        if (userId.toString() === group.creatorId.toString()) {
            return res.status(400).json({ message: "Group creator cannot leave the group. You must transfer ownership or delete the group." });
        }

        group.members = group.members.filter(m => m.userId.toString() !== userId.toString());
        await group.save();

        // Delete group key for the user leaving
        await GroupKey.deleteMany({ groupId, userId });

        const populatedGroup = await Group.findById(groupId)
            .populate("members.userId", "fullName profilePic publicKey")
            .populate({
                path: "lastMessage",
                populate: {
                    path: "senderId",
                    select: "fullName profilePic"
                }
            });

        io.to("group_" + groupId).emit("groupUpdated", populatedGroup);

        res.status(200).json({ message: "Successfully left the group." });
    } catch (error) {
        console.error("Error in leaveGroup:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const transferOwnership = async (req, res) => {
    try {
        const { id: groupId } = req.params;
        const { newCreatorId } = req.body;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found." });
        }

        if (group.creatorId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Only the group creator can transfer ownership." });
        }

        const memberIndex = group.members.findIndex(m => m.userId.toString() === newCreatorId.toString());
        if (memberIndex === -1) {
            return res.status(400).json({ message: "New creator must be a member of the group." });
        }

        // Update creatorId
        group.creatorId = newCreatorId;
        // Ensure the new creator is an admin
        group.members[memberIndex].role = "admin";

        await group.save();

        const populatedGroup = await Group.findById(groupId)
            .populate("members.userId", "fullName profilePic publicKey")
            .populate({
                path: "lastMessage",
                populate: {
                    path: "senderId",
                    select: "fullName profilePic"
                }
            });

        io.to("group_" + groupId).emit("groupUpdated", populatedGroup);

        res.status(200).json(populatedGroup);
    } catch (error) {
        console.error("Error in transferOwnership:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getGroupKey = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id: groupId } = req.params;

        // Verify membership
        const group = await Group.findOne({ _id: groupId, "members.userId": userId });
        if (!group) {
            return res.status(403).json({ message: "Access denied. You are not a member of this group." });
        }

        const keyDoc = await GroupKey.findOne({ groupId, userId }).populate("encryptedBy", "publicKey");
        if (!keyDoc) {
            return res.status(404).json({ message: "Group key not found for this user." });
        }

        res.status(200).json(keyDoc);
    } catch (error) {
        console.error("Error in getGroupKey:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const initializeGroupKeys = async (req, res) => {
    try {
        const { id: groupId } = req.params;
        const { groupKeys } = req.body;
        const userId = req.user._id;

        // Verify membership
        const group = await Group.findOne({ _id: groupId, "members.userId": userId });
        if (!group) {
            return res.status(403).json({ message: "Access denied. You are not a member of this group." });
        }

        // Check if keys already exist to prevent overwrite unless admin
        const existingKeysCount = await GroupKey.countDocuments({ groupId });
        const isRequesterAdmin = group.members.some(m => m.userId.toString() === userId.toString() && m.role === "admin");

        if (existingKeysCount > 0 && !isRequesterAdmin) {
            return res.status(400).json({ message: "Group keys already initialized. Only admins can re-initialize or rotate keys." });
        }

        if (Array.isArray(groupKeys)) {
            // Upsert keys
            const keysToSave = groupKeys.map(k => ({
                groupId,
                userId: k.userId,
                encryptedKey: k.encryptedKey,
                iv: k.iv,
                encryptedBy: userId
            }));
            for (const k of keysToSave) {
                await GroupKey.findOneAndUpdate(
                    { groupId: k.groupId, userId: k.userId },
                    k,
                    { upsert: true, new: true }
                );
            }
        }

        res.status(200).json({ message: "Group keys initialized successfully." });
    } catch (error) {
        console.error("Error in initializeGroupKeys:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteGroup = async (req, res) => {
    try {
        const { id: groupId } = req.params;
        const requesterId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found." });
        }

        // Only the group creator (owner) can delete the group
        if (group.creatorId.toString() !== requesterId.toString()) {
            return res.status(403).json({ message: "Only the group owner can delete this group." });
        }

        const members = [...group.members];

        // 1. Delete group keys
        await GroupKey.deleteMany({ groupId });

        // 2. Delete group messages
        await Message.deleteMany({ groupId });

        // 3. Delete the group itself
        await Group.findByIdAndDelete(groupId);

        // 4. Notify all members that the group has been deleted
        members.forEach(m => {
            const socketId = getReceiverSocketId(m.userId);
            if (socketId) {
                io.to(socketId).emit("groupDeleted", { groupId });
            }
        });

        res.status(200).json({ message: "Group deleted successfully." });
    } catch (error) {
        console.error("Error in deleteGroup:", error);
        res.status(500).json({ message: "Server error" });
    }
};
