import express from "express";
import { 
    createGroup, getMyGroups, getGroupMessages, sendGroupMessage,
    updateGroupDetails, addMembers, removeMember, updateMemberRole, leaveGroup 
} from "../controllers/group.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute);

router.post("/", createGroup);
router.get("/", getMyGroups);
router.get("/:id/messages", getGroupMessages);
router.post("/:id/messages", sendGroupMessage);

router.put("/:id", updateGroupDetails);
router.post("/:id/members/add", addMembers);
router.post("/:id/members/remove", removeMember);
router.put("/:id/members/role", updateMemberRole);
router.post("/:id/leave", leaveGroup);

export default router;
