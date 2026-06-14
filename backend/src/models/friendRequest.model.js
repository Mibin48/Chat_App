import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Optional index to speed up lookups
friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
friendRequestSchema.index({ receiver: 1, status: 1 });

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);
export default FriendRequest;
