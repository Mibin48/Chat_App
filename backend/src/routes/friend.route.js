import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import {
  sendFriendRequest,
  getPendingRequests,
  getSentRequests,
  respondToRequest,
  searchUsers,
  blockUser,
  unblockUser,
  getBlockedUsers,
} from "../controllers/friend.controller.js";

const router = express.Router();

router.use(arcjetProtection);

router.post("/request", protectRoute, sendFriendRequest);
router.get("/requests/pending", protectRoute, getPendingRequests);
router.get("/requests/sent", protectRoute, getSentRequests);
router.put("/request/respond", protectRoute, respondToRequest);
router.get("/search", protectRoute, searchUsers);

router.post("/block", protectRoute, blockUser);
router.post("/unblock", protectRoute, unblockUser);
router.get("/blocked", protectRoute, getBlockedUsers);

export default router;
