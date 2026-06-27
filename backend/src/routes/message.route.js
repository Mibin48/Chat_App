import express from "express";
import { 
    getAllContacts, getChatPatners, getMessagesByUserId, sendMessage, 
    deleteMessage, addReaction, markAsRead, editMessage, uploadFile, 
    searchMessages, togglePinMessage, toggleStarMessage, getStarredMessages,
    getLinkPreview, castPollVote, closePoll, getCallHistory, clearChat,
    getPinnedMessages
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute);
router.get("/link-preview/parse", getLinkPreview);
router.get("/contacts", getAllContacts);
router.get("/chats", getChatPatners);
router.get("/search", searchMessages);
router.get("/starred/all", getStarredMessages);
router.get("/calls/history", getCallHistory);
router.get("/:id/pinned", getPinnedMessages);
router.get("/:id", getMessagesByUserId);
router.post("/send/:id", sendMessage);
router.post("/upload/:id", uploadFile);
router.post("/:id/react", addReaction);
router.post("/read/:id", markAsRead);
router.post("/:id/pin", togglePinMessage);
router.post("/:id/star", toggleStarMessage);
router.put("/:id/edit", editMessage);
router.post("/:id/poll/vote", castPollVote);
router.post("/:id/poll/close", closePoll);
router.delete("/:id", deleteMessage);
router.delete("/clear/:id", clearChat);

export default router;
