import express from "express"
import { signup, login, logout, updateProfile, updateStatus, deleteAccount } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

router.use(arcjetProtection);

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);
router.put("/update-status", protectRoute, updateStatus);

router.get("/check", protectRoute, (req, res) => res.status(200).json(req.user));
router.delete("/delete-account", protectRoute, deleteAccount);

export default router;

