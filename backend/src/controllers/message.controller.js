import cloudinary from "../lib/cloudinary.js";
import { sender } from "../lib/resend.js";
import Message from "../models/message.model.js"
import User from "../models/user.model.js"  

export const getAllContacts =async (req,res) =>{
    try {
        const loggedInUserID = req.user._id;

        const filteredUsers = await User.find({_id:{$ne: loggedInUserID}}).select("-password");
        res.status(200).json(filteredUsers);
    } catch (error) {
        console.log("Error in getAllContacts:",error);
        res.status(500).json({message: "Server error"});
    }
}
export const getMessagesByUserId = async (req,res) =>{
    try {
        const myId = req.user._id;
        const {id:userToChatId} = req.params;

        const message = await Message.find({
            $or: [
                {senderId:myId, recieverId:userToChatId},
                {senderId:userToChatId, recieverId:myId},
            ],
        });
        res.status(200).json(message)
    } catch (error) {
        console.log("Error in getMessages controller: ", error.message);
    }
};

export const getChatPatners = async (req,res) =>{
    try {
        const loggedInUserID = req.user._id;
        const messages = await Message.find({
            $or: [{ senderId: loggedInUserID}, {recieverId:loggedInUserID}],
        });
        const chatPartnerIds = [...new Set(messages.map(msg=>msg.senderId.toString() == loggedInUserID.toString() ? msg.recieverId.toString() : msg.senderId.toString()))];

        const chatPartners = await User.find({_id: {$in:chatPartnerIds}}).select(-password);
        res.status(200).json(chatPartners);
    } catch (error) {
        console.error("Erroe in getChatPartners:",error.message);
        res.status(500).json({error:"Internal server error"});
    }
};

export const sendMessage = async (req,res) =>{
    try {
        const {text,image} = req.body;
        const { id:recieverId } = req.params;
        const senderId = req.user._id;
        if (!text && !image) {
            return res.status(400).json({ message: "Text or image is required." });
        }
        if (senderId.equals(receiverId)) {
            return res.status(400).json({ message: "Cannot send messages to yourself." });
        }

        const receiverExists = await User.exists({_id: receiverId });
        if (!receiverExists) {
            return res.status(404).json({ message: "Receiver not found." });
        }

        let imageUrl;
        if(image){
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

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in sendMessage controller:",error.message);
        res.status(500).json({ error: "Internal server error"});
    }
};