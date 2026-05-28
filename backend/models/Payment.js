import mongoose from "mongoose";

/**
 * Payment / Invoice ledger. One record per attempted transaction.
 */
const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      index: true,
    },

    invoiceNumber: { type: String, unique: true, sparse: true },

    plan: {
      type: String,
      enum: ["free", "premium_monthly", "premium_yearly", "vip_literary"],
      required: true,
    },

    amount: { type: Number, required: true }, // in major currency units
    currency: { type: String, default: "USD" },

    provider: {
      type: String,
      enum: [
        "stripe",
        "paypal",
        "razorpay",
        "jazzcash",
        "easypaisa",
        "manual",
      ],
      required: true,
    },

    providerPaymentId: String,
    providerCustomerId: String,
    providerRawResponse: { type: mongoose.Schema.Types.Mixed },

    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "refunded", "canceled"],
      default: "pending",
      index: true,
    },

    failureReason: String,
    paidAt: Date,
    refundedAt: Date,

    billingDetails: {
      name: String,
      email: String,
      country: String,
      phone: String,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

// Pre-save hook: generate invoice number on successful payments
paymentSchema.pre("save", function (next) {
  if (this.status === "succeeded" && !this.invoiceNumber) {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    this.invoiceNumber = `BES-${ts}-${rnd}`;
  }
  next();
});

export default mongoose.model("Payment", paymentSchema);
