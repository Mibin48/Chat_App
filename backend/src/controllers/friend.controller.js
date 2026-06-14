import User from "../models/user.model.js";
import FriendRequest from "../models/friendRequest.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Send a friend request
export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.body;

    if (senderId.toString() === receiverId) {
      return res.status(400).json({ message: "You cannot send a friend request to yourself" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    const sender = await User.findById(senderId);

    // Check if either user has blocked the other
    if (sender.blockedUsers && sender.blockedUsers.includes(receiverId)) {
      return res.status(403).json({ message: "You have blocked this user. Please unblock them first." });
    }
    if (receiver.blockedUsers && receiver.blockedUsers.includes(senderId)) {
      return res.status(403).json({ message: "You have been blocked by this user." });
    }

    // Check if already friends
    if (sender.friends.includes(receiverId)) {
      return res.status(400).json({ message: "You are already friends with this user" });
    }

    // Check for existing request from sender to receiver
    let existingRequest = await FriendRequest.findOne({
      sender: senderId,
      receiver: receiverId,
    });

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return res.status(400).json({ message: "Friend request is already pending" });
      } else if (existingRequest.status === "accepted") {
        return res.status(400).json({ message: "You are already friends with this user" });
      } else {
        // If it was declined, we reset it to pending
        existingRequest.status = "pending";
        await existingRequest.save();
        
        // Notify the receiver in real-time
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
          const populatedRequest = await FriendRequest.findById(existingRequest._id)
            .populate("sender", "fullName email profilePic customStatus statusEmoji");
          io.to(receiverSocketId).emit("newFriendRequest", populatedRequest);
        }

        return res.status(200).json({ message: "Friend request sent successfully", request: existingRequest });
      }
    }

    // Check if there is an incoming request from receiver to sender
    const incomingRequest = await FriendRequest.findOne({
      sender: receiverId,
      receiver: senderId,
    });

    if (incomingRequest) {
      if (incomingRequest.status === "pending") {
        return res.status(400).json({
          message: "This user has already sent you a friend request. Please accept it instead.",
          hasIncomingPending: true
        });
      }
    }

    // Create new friend request
    const newRequest = new FriendRequest({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
    });

    await newRequest.save();

    // Populate sender details for real-time notification
    const populatedRequest = await FriendRequest.findById(newRequest._id)
      .populate("sender", "fullName email profilePic customStatus statusEmoji");

    // Notify the receiver in real-time
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newFriendRequest", populatedRequest);
    }

    res.status(201).json({ message: "Friend request sent successfully", request: populatedRequest });
  } catch (error) {
    console.error("Error in sendFriendRequest:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get pending incoming requests
export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const pending = await FriendRequest.find({
      receiver: userId,
      status: "pending",
    }).populate("sender", "fullName email profilePic customStatus statusEmoji");

    res.status(200).json(pending);
  } catch (error) {
    console.error("Error in getPendingRequests:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get requests sent by the current user
export const getSentRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const sent = await FriendRequest.find({
      sender: userId,
    }).populate("receiver", "fullName email profilePic customStatus statusEmoji");

    res.status(200).json(sent);
  } catch (error) {
    console.error("Error in getSentRequests:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Respond to friend request (accept/decline)
export const respondToRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { requestId, status } = req.body; // status is either "accepted" or "declined"

    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({ message: "Invalid status response" });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (request.receiver.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You are not authorized to respond to this request" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Friend request has already been processed" });
    }

    request.status = status;
    await request.save();

    if (status === "accepted") {
      // Add users to each other's friends lists
      await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
      await User.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });

      const senderUser = await User.findById(request.sender).select("fullName email profilePic customStatus statusEmoji");
      const receiverUser = await User.findById(request.receiver).select("fullName email profilePic customStatus statusEmoji");

      // Notify the sender that the request was accepted
      const senderSocketId = getReceiverSocketId(request.sender.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit("friendRequestAccepted", {
          requestId: request._id,
          friend: receiverUser,
        });
      }

      // Notify the receiver also so UI can update immediately
      const receiverSocketId = getReceiverSocketId(request.receiver.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("friendRequestAccepted", {
          requestId: request._id,
          friend: senderUser,
        });
      }

      return res.status(200).json({ message: "Friend request accepted", status });
    } else {
      // If declined, notify the sender in real-time
      const senderSocketId = getReceiverSocketId(request.sender.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit("friendRequestDeclined", {
          requestId: request._id,
        });
      }
      return res.status(200).json({ message: "Friend request declined", status });
    }
  } catch (error) {
    console.error("Error in respondToRequest:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Global User search to find and add friends
export const searchUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { query } = req.query;

    if (!query) {
      return res.status(200).json([]);
    }

    // Find users excluding current user
    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { fullName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    }).select("fullName email profilePic customStatus statusEmoji");

    // Enhance each user with relationship state
    const enhancedUsers = await Promise.all(
      users.map(async (u) => {
        const currentUser = await User.findById(currentUserId);
        
        // 1. Check blocked status
        if (currentUser.blockedUsers && currentUser.blockedUsers.includes(u._id)) {
          return { ...u.toObject(), relationship: "blocked-by-you" };
        }
        const targetUser = await User.findById(u._id);
        if (targetUser.blockedUsers && targetUser.blockedUsers.includes(currentUserId)) {
          return { ...u.toObject(), relationship: "blocked-by-them" };
        }

        // 2. Already friends
        if (currentUser.friends.includes(u._id)) {
          return { ...u.toObject(), relationship: "friends" };
        }

        // 3. Sent request check (pending or declined)
        const sentRequest = await FriendRequest.findOne({
          sender: currentUserId,
          receiver: u._id,
        });
        if (sentRequest) {
          if (sentRequest.status === "pending") {
            return { ...u.toObject(), relationship: "sent-pending", requestId: sentRequest._id };
          } else if (sentRequest.status === "declined") {
            return { ...u.toObject(), relationship: "sent-declined", requestId: sentRequest._id };
          }
        }

        // 4. Received pending request
        const receivedRequest = await FriendRequest.findOne({
          sender: u._id,
          receiver: currentUserId,
          status: "pending",
        });
        if (receivedRequest) {
          return { ...u.toObject(), relationship: "received-pending", requestId: receivedRequest._id };
        }

        // 5. Default none
        return { ...u.toObject(), relationship: "none" };
      })
    );

    res.status(200).json(enhancedUsers);
  } catch (error) {
    console.error("Error in searchUsers:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Block a user
export const blockUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { userId } = req.body;

    if (currentUserId.toString() === userId) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    // Update current user: add to blockedUsers, remove from friends
    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { blockedUsers: userId },
      $pull: { friends: userId }
    });

    // Update target user: remove from friends
    await User.findByIdAndUpdate(userId, {
      $pull: { friends: currentUserId }
    });

    // Delete any pending friend requests
    await FriendRequest.deleteMany({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    });

    // Emit socket.io real-time event to the blocked user
    const receiverSocketId = getReceiverSocketId(userId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userBlocked", { blockedBy: currentUserId });
    }

    res.status(200).json({ message: "User blocked successfully" });
  } catch (error) {
    console.error("Error in blockUser:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Unblock a user
export const unblockUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { userId } = req.body;

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { blockedUsers: userId }
    });

    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    console.error("Error in unblockUser:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get blocked users list
export const getBlockedUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const user = await User.findById(currentUserId).populate(
      "blockedUsers",
      "fullName email profilePic customStatus statusEmoji"
    );

    res.status(200).json(user.blockedUsers || []);
  } catch (error) {
    console.error("Error in getBlockedUsers:", error);
    res.status(500).json({ message: "Server error" });
  }
};
