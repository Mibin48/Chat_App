// backend/src/models/groupKey.model.js
import mongoose from "mongoose";

const groupKeySchema = new mongoose.Schema(
    {
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        encryptedKey: {
            type: String, // Base64 ciphertext of the symmetric Group Key
            required: true
        },
        iv: {
            type: String, // Base64 initialization vector used to encrypt the Group Key
            required: true
        },
        encryptedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
);

// Compound index to ensure uniqueness per user-group mapping and speed up lookups
groupKeySchema.index({ groupId: 1, userId: 1 }, { unique: true });

const GroupKey = mongoose.model("GroupKey", groupKeySchema);

export default GroupKey;
