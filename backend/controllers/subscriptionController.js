import Subscription from "../models/Subscription.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import {
  PLAN_CATALOG,
  getPlan,
  computePrice,
  SUPPORTED_PROVIDERS,
} from "../config/plans.js";

let stripeClient = null;
async function getStripe() {
  if (stripeClient || !process.env.STRIPE_SECRET_KEY) return stripeClient;
  const Stripe = (await import("stripe")).default;
  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

function computePeriodEnd(interval) {
  const now = new Date();
  if (interval === "month") {
    now.setMonth(now.getMonth() + 1);
  } else if (interval === "year") {
    now.setFullYear(now.getFullYear() + 1);
  } else {
    return null;
  }
  return now;
}

async function activateSubscription({
  userId,
  planId,
  cycle,
  provider,
  providerData = {},
  payment,
}) {
  const plan = getPlan(planId);
  const pricing = computePrice(planId, cycle);
  if (!plan || !pricing) throw new Error("Invalid plan");

  // Cancel any existing active subscription for this user
  await Subscription.updateMany(
    { user: userId, status: { $in: ["active", "trialing"] } },
    {
      $set: {
        status: "canceled",
        canceledAt: new Date(),
        cancellationReason: "upgraded",
      },
    }
  );

  const sub = await Subscription.create({
    user: userId,
    plan: planId,
    price: pricing,
    status: planId === "free" ? "active" : "active",
    autoRenew: planId !== "free",
    startDate: new Date(),
    currentPeriodEnd: computePeriodEnd(pricing.interval),
    gateway: {
      provider,
      ...providerData,
      latestPaymentId: payment?._id?.toString(),
    },
    features: { ...plan.features },
  });

  // Sync to user
  await User.findByIdAndUpdate(userId, {
    $set: {
      "membership.isPremium": planId !== "free",
      "membership.plan": planId,
      "membership.activeSubscription": sub._id,
      "membership.currentPeriodEnd": sub.currentPeriodEnd,
    },
  });

  if (payment) {
    payment.subscription = sub._id;
    await payment.save();
  }

  return sub;
}

export default class SubscriptionController {
  // GET /api/subscriptions/plans
  static async listPlans(req, res) {
    try {
      const plans = Object.values(PLAN_CATALOG);
      res.json({ success: true, data: plans });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // GET /api/subscriptions/me — current user's active subscription
  static async getMySubscription(req, res) {
    try {
      const sub = await Subscription.findOne({
        user: req.user.id,
        status: { $in: ["active", "trialing"] },
      }).sort({ createdAt: -1 });

      res.json({
        success: true,
        data: {
          subscription: sub,
          isPremium: !!sub && sub.plan !== "free",
          plan: sub ? getPlan(sub.plan) : getPlan("free"),
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // GET /api/subscriptions/payments — current user's payment history
  static async getMyPayments(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const [payments, total] = await Promise.all([
        Payment.find({ user: req.user.id })
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        Payment.countDocuments({ user: req.user.id }),
      ]);
      res.json({
        success: true,
        data: { payments, total, page, hasNext: page * limit < total },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/subscriptions/checkout
  // body: { planId, cycle, provider, billingDetails }
  //
  // For Stripe (if STRIPE_SECRET_KEY set) → returns a Checkout Session URL.
  // For other providers → creates a "pending" Payment, returns instructions/URL
  // for the frontend to complete. This keeps the system functional even without
  // every gateway configured.
  static async createCheckout(req, res) {
    try {
      const { planId, cycle, provider, billingDetails = {} } = req.body;

      if (!getPlan(planId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid plan" });
      }
      if (!SUPPORTED_PROVIDERS.includes(provider)) {
        return res
          .status(400)
          .json({ success: false, message: "Unsupported payment provider" });
      }

      const pricing = computePrice(planId, cycle);
      if (planId === "free") {
        // Free plan is activated immediately, no payment.
        const sub = await activateSubscription({
          userId: req.user.id,
          planId,
          cycle,
          provider: "manual",
        });
        return res.json({
          success: true,
          data: { subscription: sub, redirectUrl: "/membership/success" },
        });
      }

      // Create the pending Payment record
      const payment = await Payment.create({
        user: req.user.id,
        plan: planId,
        amount: pricing.amount,
        currency: pricing.currency,
        provider,
        status: "pending",
        billingDetails: {
          name: billingDetails.name || req.user.name,
          email: billingDetails.email || req.user.email,
          country: billingDetails.country,
          phone: billingDetails.phone,
        },
      });

      // ---- Stripe ----
      if (provider === "stripe") {
        const stripe = await getStripe();
        if (!stripe) {
          // Fallback: return a frontend-handled mock checkout reference.
          return res.json({
            success: true,
            data: {
              paymentId: payment._id,
              provider,
              mock: true,
              message:
                "Stripe not configured. Use /api/subscriptions/confirm to simulate payment in dev.",
            },
          });
        }

        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: payment.billingDetails.email,
          line_items: [
            {
              price_data: {
                currency: pricing.currency.toLowerCase(),
                product_data: {
                  name: `Bazm-e-Sukhan — ${getPlan(planId).name}`,
                  description: getPlan(planId).tagline,
                },
                unit_amount: Math.round(pricing.amount * 100),
              },
              quantity: 1,
            },
          ],
          metadata: {
            paymentId: payment._id.toString(),
            userId: req.user.id,
            planId,
            cycle: pricing.interval,
          },
          success_url: `${
            process.env.CLIENT_URL || "http://localhost:5173"
          }/membership/success?paymentId=${payment._id}`,
          cancel_url: `${
            process.env.CLIENT_URL || "http://localhost:5173"
          }/membership/failure?paymentId=${payment._id}`,
        });

        payment.providerPaymentId = session.id;
        await payment.save();

        return res.json({
          success: true,
          data: { paymentId: payment._id, url: session.url, provider },
        });
      }

      // ---- PayPal / Razorpay / JazzCash / Easypaisa ----
      // We don't ship full SDK integrations here; the frontend collects details
      // and calls /confirm. Returning a "client-handled" instruction object.
      return res.json({
        success: true,
        data: {
          paymentId: payment._id,
          provider,
          amount: pricing.amount,
          currency: pricing.currency,
          // The frontend should redirect to provider hosted page, then call
          // POST /api/subscriptions/confirm with paymentId + providerPaymentId.
          requiresClientHandling: true,
          instructions:
            provider === "jazzcash" || provider === "easypaisa"
              ? "Please complete the mobile wallet payment, then submit the transaction ID for verification."
              : "Continue with the provider's hosted checkout, then return to confirm.",
        },
      });
    } catch (err) {
      console.error("createCheckout error", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/subscriptions/confirm
  // body: { paymentId, providerPaymentId?, status? }
  //
  // Called by the frontend after the gateway redirect (success page) OR by
  // local mobile-wallet flows that need manual confirmation. In production,
  // this should be protected by a webhook signature verification instead.
  static async confirmPayment(req, res) {
    try {
      const { paymentId, providerPaymentId, transactionId } = req.body;
      const payment = await Payment.findOne({
        _id: paymentId,
        user: req.user.id,
      });
      if (!payment) {
        return res
          .status(404)
          .json({ success: false, message: "Payment not found" });
      }
      if (payment.status === "succeeded") {
        return res.json({
          success: true,
          data: { payment, alreadyProcessed: true },
        });
      }

      // For Stripe sessions, verify with the API when possible
      if (payment.provider === "stripe") {
        const stripe = await getStripe();
        if (stripe && payment.providerPaymentId) {
          const session = await stripe.checkout.sessions.retrieve(
            payment.providerPaymentId
          );
          if (session.payment_status !== "paid") {
            payment.status = "failed";
            payment.failureReason = `Stripe status: ${session.payment_status}`;
            await payment.save();
            return res
              .status(400)
              .json({ success: false, message: "Payment not completed" });
          }
        }
      } else {
        // For non-Stripe gateways, record the supplied reference
        if (providerPaymentId || transactionId) {
          payment.providerPaymentId = providerPaymentId || transactionId;
        }
      }

      payment.status = "succeeded";
      payment.paidAt = new Date();
      await payment.save();

      const sub = await activateSubscription({
        userId: req.user.id,
        planId: payment.plan,
        cycle: null,
        provider: payment.provider,
        providerData: { latestPaymentId: payment._id.toString() },
        payment,
      });

      res.json({ success: true, data: { payment, subscription: sub } });
    } catch (err) {
      console.error("confirmPayment error", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/subscriptions/cancel
  static async cancelSubscription(req, res) {
    try {
      const { reason } = req.body;
      const sub = await Subscription.findOne({
        user: req.user.id,
        status: { $in: ["active", "trialing"] },
      });
      if (!sub) {
        return res
          .status(404)
          .json({ success: false, message: "No active subscription" });
      }
      sub.status = "canceled";
      sub.canceledAt = new Date();
      sub.autoRenew = false;
      sub.cancellationReason = reason || "user_requested";
      await sub.save();

      await User.findByIdAndUpdate(req.user.id, {
        $set: {
          "membership.isPremium": false,
          "membership.plan": "free",
          "membership.activeSubscription": null,
        },
      });

      res.json({ success: true, data: sub });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // PATCH /api/subscriptions/auto-renew
  static async toggleAutoRenew(req, res) {
    try {
      const sub = await Subscription.findOne({
        user: req.user.id,
        status: { $in: ["active", "trialing"] },
      });
      if (!sub) {
        return res
          .status(404)
          .json({ success: false, message: "No active subscription" });
      }
      sub.autoRenew = !sub.autoRenew;
      await sub.save();
      res.json({ success: true, data: sub });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // GET /api/subscriptions/invoice/:paymentId
  static async getInvoice(req, res) {
    try {
      const payment = await Payment.findOne({
        _id: req.params.paymentId,
        user: req.user.id,
      }).populate("subscription");
      if (!payment) {
        return res
          .status(404)
          .json({ success: false, message: "Invoice not found" });
      }
      const plan = getPlan(payment.plan);
      res.json({
        success: true,
        data: {
          invoiceNumber: payment.invoiceNumber,
          issuedAt: payment.paidAt || payment.createdAt,
          billingDetails: payment.billingDetails,
          item: {
            name: plan?.name,
            nameUrdu: plan?.nameUrdu,
            description: plan?.tagline,
          },
          amount: payment.amount,
          currency: payment.currency,
          provider: payment.provider,
          status: payment.status,
          subscription: payment.subscription,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ============= ADMIN =============

  // GET /api/subscriptions/admin/revenue
  static async adminRevenue(req, res) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalRevenueAgg,
        monthRevenueAgg,
        yearRevenueAgg,
        activeCount,
        byPlan,
        byProvider,
        last30Trend,
        recentPayments,
      ] = await Promise.all([
        Payment.aggregate([
          { $match: { status: "succeeded" } },
          { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),
        Payment.aggregate([
          {
            $match: {
              status: "succeeded",
              paidAt: { $gte: startOfMonth },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),
        Payment.aggregate([
          {
            $match: { status: "succeeded", paidAt: { $gte: startOfYear } },
          },
          { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),
        Subscription.countDocuments({
          status: { $in: ["active", "trialing"] },
          plan: { $ne: "free" },
        }),
        Subscription.aggregate([
          { $match: { status: { $in: ["active", "trialing"] } } },
          { $group: { _id: "$plan", count: { $sum: 1 } } },
        ]),
        Payment.aggregate([
          { $match: { status: "succeeded" } },
          {
            $group: {
              _id: "$provider",
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
        ]),
        Payment.aggregate([
          {
            $match: { status: "succeeded", paidAt: { $gte: last30 } },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$paidAt" },
              },
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Payment.find({ status: "succeeded" })
          .sort({ paidAt: -1 })
          .limit(15)
          .populate("user", "name email"),
      ]);

      res.json({
        success: true,
        data: {
          totals: {
            allTime: totalRevenueAgg[0] || { total: 0, count: 0 },
            thisMonth: monthRevenueAgg[0] || { total: 0, count: 0 },
            thisYear: yearRevenueAgg[0] || { total: 0, count: 0 },
            activeSubscribers: activeCount,
          },
          breakdown: { byPlan, byProvider },
          trend30Days: last30Trend,
          recentPayments,
        },
      });
    } catch (err) {
      console.error("adminRevenue error", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // GET /api/subscriptions/admin/subscriptions
  static async adminListSubscriptions(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 25;
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.plan) filter.plan = req.query.plan;

      const [subs, total] = await Promise.all([
        Subscription.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("user", "name email role"),
        Subscription.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: { subscriptions: subs, total, page, hasNext: page * limit < total },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
