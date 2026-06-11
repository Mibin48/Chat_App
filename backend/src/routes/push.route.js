import express from "express";
import { subscribePush, unsubscribePush } from "../controllers/push.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

router.use(arcjetProtection);

router.post("/subscribe", protectRoute, subscribePush);
router.post("/unsubscribe", protectRoute, unsubscribePush);

export default router;
