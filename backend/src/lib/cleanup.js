import cloudinary from "./cloudinary.js";
import { utapi } from "./uploadthing.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import User from "../models/user.model.js";

/**
 * Extract publicId from a Cloudinary URL
 * Handles folders as well
 */
const getCloudinaryPublicId = (url) => {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    let afterUpload = parts[1];
    
    // Strip version prefix if present, e.g. "v12345678/folder/image.png"
    if (/^v\d+\//.test(afterUpload)) {
        const firstSlashIndex = afterUpload.indexOf("/");
        afterUpload = afterUpload.substring(firstSlashIndex + 1);
    }
    
    // Strip file extension
    const dotIndex = afterUpload.lastIndexOf(".");
    if (dotIndex !== -1) {
        afterUpload = afterUpload.substring(0, dotIndex);
    }
    return afterUpload;
};

/**
 * Extract resource type from a Cloudinary URL (e.g. image, video, raw)
 */
const getCloudinaryResourceType = (url) => {
    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex > 0) {
        return parts[uploadIndex - 1];
    }
    return "image";
};

/**
 * Delete an asset from Cloudinary or UploadThing by its URL
 */
export const deleteAssetByUrl = async (url) => {
    if (!url) return;
    try {
        if (url.includes("ufs.sh") || url.includes("utfs.io") || url.includes("uploadthing")) {
            const key = url.split("/").pop();
            if (key) {
                console.log(`[Cleanup] Deleting from UploadThing: ${key}`);
                await utapi.deleteFiles(key);
            }
        } else if (url.includes("res.cloudinary.com")) {
            const publicId = getCloudinaryPublicId(url);
            const resourceType = getCloudinaryResourceType(url);
            if (publicId) {
                console.log(`[Cleanup] Deleting from Cloudinary: ${publicId} (${resourceType})`);
                await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
            }
        }
    } catch (error) {
        console.error(`[Cleanup] Failed to delete asset at URL ${url}:`, error.message);
    }
};

/**
 * Purge all user data from the database and cloud storage
 */
export const purgeUserData = async (userId) => {
    console.log(`[Cleanup] Starting complete cleanup for user ${userId}`);

    // 1. Clean up user's profile picture
    const user = await User.findById(userId);
    if (user && user.profilePic) {
        await deleteAssetByUrl(user.profilePic);
    }

    // 2. Find all messages involving this user (sent or received)
    const messages = await Message.find({
        $or: [
            { senderId: userId },
            { recieverId: userId }
        ]
    });

    console.log(`[Cleanup] Found ${messages.length} messages involving user ${userId} for deletion`);

    // Extract and delete attachments in parallel
    const assetDeletions = [];
    for (const msg of messages) {
        if (msg.image) assetDeletions.push(deleteAssetByUrl(msg.image));
        if (msg.audioUrl) assetDeletions.push(deleteAssetByUrl(msg.audioUrl));
        if (msg.fileUrl) assetDeletions.push(deleteAssetByUrl(msg.fileUrl));
    }
    
    await Promise.allSettled(assetDeletions);

    // Delete messages from database
    await Message.deleteMany({
        $or: [
            { senderId: userId },
            { recieverId: userId }
        ]
    });

    // 3. Find groups where the user is a member
    const groups = await Group.find({ "members.userId": userId });
    console.log(`[Cleanup] User is a member of ${groups.length} groups`);

    for (const group of groups) {
        const isCreator = group.creatorId.toString() === userId.toString();
        
        // Remove user from the group members list
        group.members = group.members.filter(m => m.userId.toString() !== userId.toString());

        if (group.members.length === 0) {
            // Delete the empty group completely
            console.log(`[Cleanup] Group ${group.name} has no members left. Deleting group.`);
            if (group.avatar) {
                await deleteAssetByUrl(group.avatar);
            }
            
            // Delete all group messages and attachments
            const groupMessages = await Message.find({ groupId: group._id });
            const groupAssetDeletions = [];
            for (const msg of groupMessages) {
                if (msg.image) groupAssetDeletions.push(deleteAssetByUrl(msg.image));
                if (msg.audioUrl) groupAssetDeletions.push(deleteAssetByUrl(msg.audioUrl));
                if (msg.fileUrl) groupAssetDeletions.push(deleteAssetByUrl(msg.fileUrl));
            }
            await Promise.allSettled(groupAssetDeletions);
            await Message.deleteMany({ groupId: group._id });
            await Group.findByIdAndDelete(group._id);
        } else {
            // Keep the group and adjust creators/admins
            if (isCreator) {
                const newCreator = group.members[0];
                group.creatorId = newCreator.userId;
                
                const hasAdmin = group.members.some(m => m.role === "admin");
                if (!hasAdmin) {
                    newCreator.role = "admin";
                }
                console.log(`[Cleanup] Creator of group ${group.name} deleted. Promoted ${newCreator.userId} to creator/admin.`);
            } else {
                const hasAdmin = group.members.some(m => m.role === "admin");
                if (!hasAdmin) {
                    group.members[0].role = "admin";
                    console.log(`[Cleanup] Promoted member ${group.members[0].userId} of group ${group.name} to admin.`);
                }
            }

            // Recalculate lastMessage in the group since we might have deleted some of its messages
            const lastMsg = await Message.findOne({ groupId: group._id }).sort({ createdAt: -1 });
            group.lastMessage = lastMsg ? lastMsg._id : undefined;

            await group.save();
        }
    }

    // 4. Delete the User document itself
    await User.findByIdAndDelete(userId);
    console.log(`[Cleanup] Permanently deleted user document for ${userId}`);
};
