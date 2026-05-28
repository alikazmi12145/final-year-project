import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Crown,
  Calendar,
  CreditCard,
  Repeat,
  X,
  Receipt,
  Sparkles,
} from "lucide-react";
import subscriptionAPI from "../services/subscriptionAPI";
import "../components/membership/membership.css";

export default function ManageSubscriptionPage() {
  const [me, setMe] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [mine, pays] = await Promise.all([
        subscriptionAPI.getMine(),
        subscriptionAPI.getPayments({ limit: 10 }),
      ]);
      setMe(mine?.data || null);
      setPayments(pays?.data?.payments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your membership?")) return;
    try {
      await subscriptionAPI.cancel("user_requested");
      toast.success("Membership canceled");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const handleAutoRenew = async () => {
    try {
      await subscriptionAPI.toggleAutoRenew();
      toast.success("Auto-renew updated");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const sub = me?.subscription;
  const plan = me?.plan;
  const isPremium = me?.isPremium;

  return (
    <div className="bes-bg-night bes-geo-pattern min-h-screen text-amber-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8 bes-fade-up">
          <div>
            <h1 dir="rtl" className="font-nastaliq text-3xl bes-gold-text">
              میری رکنیت
            </h1>
            <p className="text-amber-100/70">Manage your Bazm-e-Sukhan membership</p>
          </div>
          {!isPremium && (
            <Link to="/membership" className="bes-btn-gold inline-flex gap-2">
              <Sparkles className="w-4 h-4" /> Upgrade
            </Link>
          )}
        </div>

        {loading ? (
          <p className="text-amber-200/70">Loading…</p>
        ) : (
          <>
            <div className="bes-glass rounded-2xl p-6 bes-fade-up">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-amber-300">
                    <Crown className="w-5 h-5" />
                    <span className="uppercase tracking-widest text-xs">
                      Current Plan
                    </span>
                  </div>
                  <h2
                    dir="rtl"
                    className="font-nastaliq text-3xl bes-gold-text mt-2"
                  >
                    {plan?.nameUrdu}
                  </h2>
                  <p className="text-amber-100/80">{plan?.name}</p>
                </div>
                <span
                  className={`bes-chip ${
                    isPremium ? "" : "opacity-70"
                  }`}
                >
                  {sub?.status || "free"}
                </span>
              </div>

              {sub && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <Info
                    icon={<Calendar />}
                    label="Renews on"
                    value={
                      sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                        : "—"
                    }
                  />
                  <Info
                    icon={<CreditCard />}
                    label="Provider"
                    value={sub.gateway?.provider || "—"}
                    capitalize
                  />
                  <Info
                    icon={<Repeat />}
                    label="Auto-renew"
                    value={sub.autoRenew ? "On" : "Off"}
                  />
                </div>
              )}

              {isPremium && (
                <div className="flex flex-wrap gap-3 mt-6">
                  <button onClick={handleAutoRenew} className="bes-btn-ghost">
                    Toggle Auto-renew
                  </button>
                  <button
                    onClick={handleCancel}
                    className="bes-btn-ghost inline-flex items-center gap-2 border-rose-400/50 text-rose-300 hover:bg-rose-400/10"
                  >
                    <X className="w-4 h-4" /> Cancel Membership
                  </button>
                </div>
              )}
            </div>

            {/* Payment history */}
            <div className="bes-glass rounded-2xl p-6 mt-6 bes-fade-up" style={{ animationDelay: "120ms" }}>
              <h3 className="text-amber-50 font-semibold flex items-center gap-2 mb-4">
                <Receipt className="w-4 h-4 text-amber-300" /> Payment History
              </h3>

              {payments.length === 0 ? (
                <p className="text-amber-100/60 text-sm">No payments yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="bes-table">
                    <thead>
                      <tr>
                        <th className="text-left">Date</th>
                        <th>Plan</th>
                        <th>Amount</th>
                        <th>Provider</th>
                        <th>Status</th>
                        <th>Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p._id}>
                          <td className="text-left">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                          <td>{p.plan}</td>
                          <td>
                            {p.currency} {p.amount}
                          </td>
                          <td className="capitalize">{p.provider}</td>
                          <td>
                            <StatusPill status={p.status} />
                          </td>
                          <td>
                            {p.invoiceNumber ? (
                              <Link
                                to={`/membership/success?paymentId=${p._id}`}
                                className="text-amber-300 hover:underline text-xs"
                              >
                                {p.invoiceNumber}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Info({ icon, label, value, capitalize }) {
  return (
    <div className="bes-glass rounded-xl p-4">
      <div className="flex items-center gap-2 text-amber-300/80 text-xs uppercase tracking-widest">
        {icon}
        {label}
      </div>
      <p
        className={`text-amber-50 mt-2 ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    succeeded: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    pending: "bg-amber-500/20 text-amber-300 border-amber-400/30",
    failed: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    refunded: "bg-stone-500/20 text-stone-300 border-stone-400/30",
    canceled: "bg-stone-500/20 text-stone-300 border-stone-400/30",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
        map[status] || map.pending
      }`}
    >
      {status}
    </span>
  );
}
