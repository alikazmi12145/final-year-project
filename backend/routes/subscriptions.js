import express from "express";
import SubscriptionController from "../controllers/subscriptionController.js";
import { auth, adminAuth } from "../middleware/auth.js";

const router = express.Router();

// Public
router.get("/plans", SubscriptionController.listPlans);

// Authenticated user routes
router.get("/me", auth, SubscriptionController.getMySubscription);
router.get("/payments", auth, SubscriptionController.getMyPayments);
router.get("/invoice/:paymentId", auth, SubscriptionController.getInvoice);
router.post("/checkout", auth, SubscriptionController.createCheckout);
router.post("/confirm", auth, SubscriptionController.confirmPayment);
router.post("/cancel", auth, SubscriptionController.cancelSubscription);
router.patch("/auto-renew", auth, SubscriptionController.toggleAutoRenew);

// Admin
router.get("/admin/revenue", auth, adminAuth, SubscriptionController.adminRevenue);
router.get(
  "/admin/subscriptions",
  auth,
  adminAuth,
  SubscriptionController.adminListSubscriptions
);

export default router;
