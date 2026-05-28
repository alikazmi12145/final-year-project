import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Crown, Sparkles, ChevronRight } from "lucide-react";
import subscriptionAPI from "../services/subscriptionAPI";
import { useAuth } from "../context/AuthContext";
import FeatureSection from "../components/membership/FeatureSection";
import PricingCards from "../components/membership/PricingCards";
import ComparisonTable from "../components/membership/ComparisonTable";
import BenefitsGrid from "../components/membership/BenefitsGrid";
import StatsSection from "../components/membership/StatsSection";
import QuoteOfTheDay from "../components/membership/QuoteOfTheDay";
import FeaturedSections from "../components/membership/FeaturedSections";
import "../components/membership/membership.css";

export default function MembershipPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, mine] = await Promise.all([
          subscriptionAPI.listPlans(),
          user ? subscriptionAPI.getMine().catch(() => null) : Promise.resolve(null),
        ]);
        setPlans(p?.data || []);
        setMe(mine?.data || null);
      } catch (err) {
        console.error(err);
        toast.error("پلانز لوڈ نہیں ہو سکے");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSelectPlan = (plan, cycle) => {
    if (!user) {
      toast("براہ کرم پہلے لاگ ان کریں", { icon: "🔐" });
      navigate("/auth", { state: { from: "/membership" } });
      return;
    }
    if (plan.id === "free") {
      subscriptionAPI
        .checkout({ planId: "free", provider: "stripe", cycle })
        .then(() => {
          toast.success("Free plan activated");
          navigate("/membership/manage");
        })
        .catch((e) => toast.error(e?.response?.data?.message || "Error"));
      return;
    }
    navigate(`/membership/checkout?plan=${plan.id}&cycle=${cycle}`);
  };

  const currentPlanId = me?.subscription?.plan || "free";

  return (
    <div className="bes-bg-night min-h-screen text-amber-50">
      {/* HERO */}
      <section className="relative overflow-hidden bes-geo-pattern">
        <div className="max-w-6xl mx-auto px-4 pt-28 pb-24 text-center bes-fade-up">
          <div className="mb-7">
            <span className="bes-eyebrow">
              <Sparkles className="inline w-3 h-3 mr-2 -mt-0.5" />
              Bazm-e-Sukhan Premium
            </span>
          </div>

          {/* Central medallion title */}
          <h1
            dir="rtl"
            className="bes-urdu-display-lg text-6xl sm:text-7xl md:text-[8rem] bes-shimmer-text"
            style={{ lineHeight: "1.4" }}
          >
            بزمِ سخن
          </h1>

          {/* Double-rule divider */}
          <div className="max-w-md mx-auto mt-6 mb-7">
            <div className="bes-divider-double" />
          </div>

          <p
            dir="rtl"
            className="bes-urdu-display text-amber-100/90 text-xl md:text-2xl max-w-3xl mx-auto"
          >
            ادبی شام کا اعلیٰ ترین تجربہ
          </p>
          <p className="font-elegant italic text-amber-100/60 tracking-[0.22em] uppercase text-xs sm:text-sm mt-3">
            The Premier Urdu Literary Experience
          </p>

          <p
            dir="rtl"
            className="bes-urdu-display text-amber-100/75 text-lg mt-8 max-w-2xl mx-auto"
          >
            کلاسیکی شاعری، AI تلاش، اور ایک شاندار ادبی محفل — ایک ہی جگہ
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <a href="#pricing" className="bes-btn-gold bes-shine">
              <Crown className="w-4 h-4" /> Become Premium
            </a>
            <button
              onClick={() => navigate("/poetry")}
              className="bes-btn-ghost"
            >
              Browse Poetry <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <StatsSection />
      <FeatureSection />
      <QuoteOfTheDay />
      <BenefitsGrid />

      {loading ? (
        <div className="py-20 text-center text-amber-200/70">
          Loading plans…
        </div>
      ) : (
        <>
          <PricingCards
            plans={plans}
            onSelect={handleSelectPlan}
            currentPlanId={currentPlanId}
          />
          <ComparisonTable plans={plans} />
        </>
      )}

      <FeaturedSections />

      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 text-center bes-glass bes-glass-frame rounded-3xl p-12 bes-fade-up">
          <div className="bes-medallion mx-auto mb-6">
            <Crown className="w-7 h-7" />
          </div>
          <div className="max-w-xs mx-auto mb-6">
            <div className="bes-divider-double" />
          </div>
          <h3
            dir="rtl"
            className="bes-urdu-display text-3xl md:text-5xl bes-gold-text"
          >
            اپنے ادبی سفر کو شاہانہ بنائیں
          </h3>
          <p className="font-elegant italic text-amber-100/60 tracking-[0.22em] uppercase text-xs mt-3">
            Elevate Your Literary Journey
          </p>
          <p
            dir="rtl"
            className="bes-urdu-display text-amber-100/80 mt-6 max-w-xl mx-auto text-lg"
          >
            آج ہی پریمیم رکنیت اختیار کریں اور بزمِ سخن کے خصوصی خزانے کا حصہ بنیں
          </p>
          <a href="#pricing" className="bes-btn-gold bes-shine mt-8">
            <Crown className="w-4 h-4" /> Choose Your Plan
          </a>
        </div>
      </section>
    </div>
  );
}
