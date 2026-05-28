import mongoose from "mongoose";

/**
 * Subscription represents an active or historical paid plan for a user.
 * One user may have multiple historical subscriptions; only one is "active"
 * at a time (status === "active" or "trialing").
 */
const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ["free", "premium_monthly", "premium_yearly", "vip_literary"],
      required: true,
    },

    // Pricing snapshot at time of purchase (so historical records stay accurate)
    price: {
      amount: { type: Number, required: true, default: 0 },
      currency: { type: String, default: "USD" },
      interval: {
        type: String,
        enum: ["none", "month", "year", "lifetime"],
        default: "month",
      },
    },

    status: {
      type: String,
      enum: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "expired",
        "pending",
        "failed",
      ],
      default: "pending",
      index: true,
    },

    autoRenew: { type: Boolean, default: true },

    startDate: { type: Date, default: Date.now },
    currentPeriodEnd: { type: Date },
    canceledAt: { type: Date },
    cancellationReason: { type: String },

    // Gateway info — supports multiple providers
    gateway: {
      provider: {
        type: String,
        enum: ["stripe", "paypal", "razorpay", "jazzcash", "easypaisa", "manual"],
        required: true,
      },
      customerId: String,
      subscriptionId: String, // gateway subscription id
      latestPaymentId: String,
      metadata: { type: mongoose.Schema.Types.Mixed },
    },

    // Cached benefits flags (for fast access checks without joining catalog)
    features: {
      aiAdvancedSearch: { type: Boolean, default: false },
      exclusiveCollections: { type: Boolean, default: false },
      unlimitedDownloads: { type: Boolean, default: false },
      audioStudio: { type: Boolean, default: false },
      adFree: { type: Boolean, default: false },
      premiumBadge: { type: Boolean, default: false },
      earlyAccess: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ "gateway.subscriptionId": 1 });

subscriptionSchema.virtual("isActive").get(function () {
  if (!["active", "trialing"].includes(this.status)) return false;
  if (this.currentPeriodEnd && this.currentPeriodEnd < new Date()) return false;
  return true;
});

export default mongoose.model("Subscription", subscriptionSchema);
