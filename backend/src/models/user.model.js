import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
        },
        fullName: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        profilePic: {
            type: String,
            default: "",
        },
        customStatus: {
            type: String,
            default: "",
            maxlength: 100,
        },
        statusEmoji: {
            type: String,
            default: "",
        },
        phone: {
            type: String,
            default: ""
        },
        location: {
            type: String,
            default: ""
        },
        bio: {
            type: String,
            default: "",
            maxlength: 200
        },
        dob: {
            type: Date
        },
        publicKey: {
            type: Object,
            default: null
        },
        encryptedPrivateKey: {
            type: String,
            default: null
        },
        privateKeyIv: {
            type: String,
            default: null
        },
        passwordSalt: {
            type: String,
            default: null
        },
        friends: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        blockedUsers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    }, { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;