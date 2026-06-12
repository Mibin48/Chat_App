import mongoose from "mongoose";
const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    recieverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: function() { return !this.groupId; }
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group"
    },
    text: {
        type: String,
        trim: true,
        maxlength: 2000,
    },
    image: {
        type: String,
    },
    // Reactions feature
    reactions: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        emoji: {
            type: String,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        }
    }],
    // Read receipts
    readBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        readAt: {
            type: Date,
            default: Date.now,
        }
    }],
    // Message editing
    isEdited: {
        type: Boolean,
        default: false,
    },
    editedAt: {
        type: Date,
    },
    // File attachments
    fileUrl: {
        type: String,
    },
    fileName: {
        type: String,
    },
    fileType: {
        type: String,
    },
    fileSize: {
        type: Number,
    },
    // Voice messages
    audioUrl: {
        type: String,
    },
    audioDuration: {
        type: Number, // in seconds
    },
    isPinned: {
        type: Boolean,
        default: false,
    },
    mediaIv: {
        type: String,
        default: null
    },
    iv: {
        type: String,
        default: null
    },
    isEncrypted: {
        type: Boolean,
        default: false
    },
    starredBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: []
    }],
    isAnnouncement: {
        type: Boolean,
        default: false
    },
    poll: {
        question: { type: String, trim: true },
        iv: { type: String, default: null },
        isClosed: { type: Boolean, default: false },
        isMultiSelect: { type: Boolean, default: false },
        anonymous: { type: Boolean, default: false },
        options: [{
            optionText: { type: String, trim: true },
            iv: { type: String, default: null },
            votes: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: []
            }]
        }]
    },
    // Quoted replies / threading
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null
    },
},
    { timestamps: true }
);

messageSchema.index({ senderId: 1, recieverId: 1, createdAt: 1 });
messageSchema.index({ recieverId: 1, senderId: 1, createdAt: 1 });
messageSchema.index({ groupId: 1, createdAt: 1 });
messageSchema.index({ recieverId: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;