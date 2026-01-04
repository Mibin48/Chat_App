import express from "express";
import { getAllContacts, getChatPatners, getMessagesByUserId, sendMessage, deleteMessage, addReaction, markAsRead, editMessage, uploadFile, searchMessages } from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute),
    router.get("/contacts", getAllContacts);
router.get("/chats", getChatPatners);
router.get("/search", searchMessages);
router.get("/:id", getMessagesByUserId);
router.post("/send/:id", sendMessage);
router.post("/upload/:id", uploadFile);
router.post("/:id/react", addReaction);
router.post("/read/:id", markAsRead);
router.put("/:id/edit", editMessage);
router.delete("/:id", deleteMessage);

export default router;
