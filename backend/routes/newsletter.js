import express from "express";
import newsletterController from "../controllers/newsletterController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/subscribe", newsletterController.subscribe);
router.post("/unsubscribe", newsletterController.unsubscribe);

// Admin routes
router.get(
  "/subscribers",
  protect,
  authorize("admin"),
  newsletterController.getAllSubscribers
);
router.get(
  "/stats",
  protect,
  authorize("admin"),
  newsletterController.getStats
);

export default router;
