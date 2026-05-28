import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CreditCard,
  ShieldCheck,
  Lock,
  Smartphone,
  Wallet,
  Globe,
  Crown,
  ArrowLeft,
} from "lucide-react";
import subscriptionAPI from "../services/subscriptionAPI";
import { useAuth } from "../context/AuthContext";
import "../components/membership/membership.css";

const PROVIDERS = [
  { id: "stripe", label: "Stripe (Card)", icon: <CreditCard className="w-5 h-5" />, region: "Global" },
  { id: "paypal", label: "PayPal", icon: <Globe className="w-5 h-5" />, region: "Global" },
  { id: "razorpay", label: "Razorpay", icon: <Wallet className="w-5 h-5" />, region: "India" },
  { id: "jazzcash", label: "JazzCash", icon: <Smartphone className="w-5 h-5" />, region: "Pakistan" },
  { id: "easypaisa", label: "Easypaisa", icon: <Smartphone className="w-5 h-5" />, region: "Pakistan" },
];

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const planId = params.get("plan");
  const cycle = params.get("cycle") || "year";

  const [plans, setPlans] = useState([]);
  const [provider, setProvider] = useState("stripe");
  const [billing, setBilling] = useState({
    name: user?.name || "",
    email: user?.email || "",
    country: "PK",
    phone: "",
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    subscriptionAPI.listPlans().then((r) => setPlans(r?.data || []));
  }, []);

  const plan = useMemo(() => plans.find((p) => p.id === planId), [plans, planId]);
  const price = useMemo(() => {
    if (!plan) return 0;
    return cycle === "year" ? plan.price?.yearly : plan.price?.monthly;
  }, [plan, cycle]);

  if (!planId) {
    return (
      <div className="bes-bg-night min-h-screen text-amber-50 flex items-center justify-center">
        <p>No plan selected.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth", { state: { from: `/membership/checkout?plan=${planId}&cycle=${cycle}` } });
      return;
    }
    setProcessing(true);
    try {
      const res = await subscriptionAPI.checkout({
        planId,
        cycle,
        provider,
        billingDetails: billing,
      });
      const data = res?.data;
      if (data?.url) {
        // Stripe redirect
        window.location.href = data.url;
        return;
      }
      // For non-stripe (and stripe dev fallback), confirm locally
      if (data?.paymentId) {
        const conf = await subscriptionAPI.confirm({
          paymentId: data.paymentId,
          transactionId: `LOCAL-${Date.now()}`,
        });
        if (conf?.success) {
          navigate(`/membership/success?paymentId=${data.paymentId}`);
          return;
        }
      }
      toast.success("Subscription processed");
      navigate("/membership/manage");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Payment failed");
      navigate(`/membership/failure?plan=${planId}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bes-bg-night bes-geo-pattern min-h-screen text-amber-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-amber-200/80 hover:text-amber-200 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Order summary */}
          <aside className="lg:col-span-2 bes-glass rounded-2xl p-6 bes-fade-up">
            <div className="flex items-center gap-2 text-amber-300 mb-2">
              <Crown className="w-5 h-5" />
              <span className="uppercase tracking-widest text-xs">
                Order Summary
              </span>
            </div>
            <h2 dir="rtl" className="font-nastaliq text-3xl bes-gold-text">
              {plan?.nameUrdu || "—"}
            </h2>
            <p className="text-amber-100/70 mt-1">{plan?.name}</p>
            <p dir="rtl" className="font-nastaliq text-amber-100/70 mt-2 text-sm">
              {plan?.tagline}
            </p>

            <div className="bes-divider my-5" />
            <div className="flex justify-between text-amber-100/80">
              <span>Billing cycle</span>
              <span className="capitalize">{cycle === "year" ? "Yearly" : "Monthly"}</span>
            </div>
            <div className="flex justify-between text-amber-100/80 mt-2">
              <span>Subtotal</span>
              <span>${price}</span>
            </div>
            <div className="flex justify-between text-amber-100/80 mt-2">
              <span>Tax</span>
              <span>$0.00</span>
            </div>
            <div className="bes-divider my-5" />
            <div className="flex justify-between items-end">
              <span className="text-amber-100/80">Total</span>
              <span className="text-3xl font-bold bes-gold-text">${price}</span>
            </div>

            <ul className="mt-6 space-y-2">
              {(plan?.perks || []).slice(0, 4).map((perk) => (
                <li
                  dir="rtl"
                  key={perk}
                  className="font-nastaliq text-sm text-amber-100/85"
                >
                  ✦ {perk}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 text-xs text-amber-100/60 mt-6">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Secure encrypted checkout
            </div>
          </aside>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-3 bes-glass rounded-2xl p-6 bes-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            <h3 className="text-amber-50 font-semibold text-lg mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-300" /> Secure Checkout
            </h3>

            <label className="block text-amber-100/80 text-sm mb-2">
              Payment method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {PROVIDERS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    provider === p.id
                      ? "border-amber-400/70 bg-amber-400/10"
                      : "border-amber-100/15 hover:border-amber-300/40"
                  }`}
                >
                  <div className="flex items-center gap-2 text-amber-200">
                    {p.icon}
                    <span className="text-sm font-medium">{p.label}</span>
                  </div>
                  <p className="text-[10px] text-amber-100/50 mt-1 uppercase">
                    {p.region}
                  </p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Full name"
                value={billing.name}
                onChange={(v) => setBilling({ ...billing, name: v })}
                required
              />
              <Field
                label="Email"
                type="email"
                value={billing.email}
                onChange={(v) => setBilling({ ...billing, email: v })}
                required
              />
              <Field
                label="Country"
                value={billing.country}
                onChange={(v) => setBilling({ ...billing, country: v })}
              />
              <Field
                label="Phone (for wallets)"
                value={billing.phone}
                onChange={(v) => setBilling({ ...billing, phone: v })}
              />
            </div>

            <div className="mt-6 p-4 rounded-xl bg-amber-400/5 border border-amber-400/20 text-xs text-amber-100/70">
              <p>
                By continuing you agree to our subscription terms. Your card / wallet
                will be charged <strong>${price}</strong> and your membership will
                auto-renew unless canceled. You can cancel anytime from
                <em> Manage Subscription</em>.
              </p>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="bes-btn-gold w-full mt-6 inline-flex items-center justify-center gap-2"
            >
              {processing ? "Processing…" : `Pay $${price} securely`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }) {
  return (
    <label className="block">
      <span className="text-amber-100/80 text-sm">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg bg-stone-900/60 border border-amber-100/15 px-3 py-2 text-amber-50 focus:border-amber-300/60 focus:outline-none"
      />
    </label>
  );
}
