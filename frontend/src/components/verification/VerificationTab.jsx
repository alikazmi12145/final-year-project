/**
 * VerificationTab.jsx
 * Beautiful verification dashboard for the poet:
 *   - Hero with current badge + status
 *   - Live stats vs. tier thresholds (progress bars)
 *   - Auto-check button
 *   - Inline verification request form (for unverified poets)
 */
import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Heart,
  BookOpen,
  RefreshCw,
  Award,
  Crown,
  Gem,
} from "lucide-react";
import VerificationBadge from "../verification/VerificationBadge";
import VerificationForm from "./VerificationForm";
import {
  autoCheckVerification,
  getMyVerificationStatus,
} from "../../services/verificationAPI";

const TIER_ORDER = ["none", "bronze", "silver", "gold", "diamond"];

const TIER_META = {
  none: {
    label: "غیر تصدیق شدہ",
    icon: ShieldCheck,
    gradient: "from-gray-400 to-gray-500",
    ring: "ring-gray-200",
    text: "text-gray-700",
  },
  bronze: {
    label: "برانز",
    icon: Award,
    gradient: "from-orange-400 to-amber-600",
    ring: "ring-orange-200",
    text: "text-orange-700",
  },
  silver: {
    label: "سلور",
    icon: Trophy,
    gradient: "from-slate-300 to-slate-500",
    ring: "ring-slate-200",
    text: "text-slate-700",
  },
  gold: {
    label: "گولڈ",
    icon: Crown,
    gradient: "from-amber-400 to-yellow-600",
    ring: "ring-amber-200",
    text: "text-amber-700",
  },
  diamond: {
    label: "ڈائمنڈ",
    icon: Gem,
    gradient: "from-sky-400 to-indigo-600",
    ring: "ring-sky-200",
    text: "text-sky-700",
  },
};

const DEFAULT_CRITERIA = {
  bronze: { poems: 10, followers: 0, likes: 0 },
  silver: { poems: 50, followers: 500, likes: 300 },
  gold: { poems: 100, followers: 1000, likes: 1000 },
  diamond: { poems: 500, followers: 2000, likes: 2000 },
};

const Progress = ({ value, max, color = "amber" }) => {
  const pct = max <= 0 ? 100 : Math.min(100, Math.round((value / max) * 100));
  const colorMap = {
    amber: "from-amber-400 to-orange-500",
    rose: "from-rose-400 to-pink-500",
    sky: "from-sky-400 to-indigo-500",
  };
  return (
    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${colorMap[color] || colorMap.amber} transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

const STAT_COLORS = {
  amber: { bg: "bg-amber-100", icon: "text-amber-600" },
  sky: { bg: "bg-sky-100", icon: "text-sky-600" },
  rose: { bg: "bg-rose-100", icon: "text-rose-600" },
};

const StatCard = ({ icon: Icon, label, value, target, color = "amber" }) => {
  const reached = target > 0 && value >= target;
  const c = STAT_COLORS[color] || STAT_COLORS.amber;
  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}
          >
            <Icon className={`w-5 h-5 ${c.icon}`} />
          </div>
          <span className="urdu-text text-sm font-semibold text-gray-700">
            {label}
          </span>
        </div>
        {reached && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
            ✓ ہدف مکمل
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 mb-2" dir="ltr">
        <span className="text-3xl font-extrabold text-gray-900">{value}</span>
        {target > 0 && (
          <span className="text-sm text-gray-400 font-medium">/ {target}</span>
        )}
      </div>
      {target > 0 && <Progress value={value} max={target} color={color} />}
    </div>
  );
};

const TierRow = ({ tier, criteria, currentBadge, stats }) => {
  const meta = TIER_META[tier];
  const Icon = meta.icon;
  const currentIdx = TIER_ORDER.indexOf(currentBadge || "none");
  const tierIdx = TIER_ORDER.indexOf(tier);
  const achieved = currentIdx >= tierIdx;
  const isCurrent = currentBadge === tier;

  const conditions = [];
  if (criteria.poems > 0)
    conditions.push(`${criteria.poems}+ نظمیں`);
  if (criteria.followers > 0)
    conditions.push(`${criteria.followers}+ فالوورز`);
  if (criteria.likes > 0)
    conditions.push(`${criteria.likes}+ پسندیدگیاں`);

  return (
    <div
      className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all ${
        isCurrent
          ? `bg-gradient-to-l ${meta.gradient} text-white border-transparent shadow-lg`
          : achieved
          ? "bg-green-50 border-green-200"
          : "bg-white border-gray-100"
      }`}
    >
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          isCurrent
            ? "bg-white/20"
            : achieved
            ? "bg-green-100"
            : "bg-gray-100"
        }`}
      >
        <Icon
          className={`w-6 h-6 ${
            isCurrent ? "text-white" : achieved ? "text-green-600" : "text-gray-400"
          }`}
        />
      </div>
      <div className="flex-1">
        <p
          className={`font-bold urdu-text ${
            isCurrent ? "text-white" : achieved ? "text-green-800" : "text-gray-700"
          }`}
        >
          {meta.label} {isCurrent && "(موجودہ سطح)"}
        </p>
        <p
          className={`text-xs urdu-text ${
            isCurrent ? "text-white/90" : "text-gray-500"
          }`}
        >
          {conditions.join(" • ") || "ابتدائی سطح"}
        </p>
      </div>
      {achieved && !isCurrent && (
        <span className="text-green-600 text-xl">✓</span>
      )}
    </div>
  );
};

const VerificationTab = ({ user, profile }) => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [autoRes, statusRes] = await Promise.all([
        autoCheckVerification().catch((e) => ({ data: { data: null, message: e?.response?.data?.message } })),
        getMyVerificationStatus().catch((e) => ({ data: { data: null } })),
      ]);
      setData(autoRes?.data?.data || null);
      setStatus(statusRes?.data?.data || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const { data: res } = await autoCheckVerification();
      if (res?.success) {
        if (res.data?.updated) {
          toast.success(res.message);
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast(res.message, { icon: "ℹ️" });
        }
        setData(res.data);
      } else {
        toast.error(res?.message || "خرابی");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "سرور سے رابطہ نہیں ہو سکا"
      );
    } finally {
      setChecking(false);
    }
  };

  const currentBadge =
    data?.currentBadge ||
    user?.verificationBadge ||
    profile?.verificationBadge ||
    "none";

  const isVerified =
    data?.isVerified ||
    user?.isVerified ||
    profile?.isVerified ||
    (currentBadge && currentBadge !== "none");

  const stats = data?.stats || {
    publishedPoems: 0,
    followers: 0,
    totalLikes: 0,
  };

  const criteria = data?.criteria || DEFAULT_CRITERIA;
  const currentIdx = TIER_ORDER.indexOf(currentBadge);
  const nextTier =
    currentIdx >= 0 && currentIdx < TIER_ORDER.length - 1
      ? TIER_ORDER[currentIdx + 1]
      : null;
  const nextCriteria = nextTier ? criteria[nextTier] : null;

  const meta = TIER_META[currentBadge] || TIER_META.none;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-l ${meta.gradient} p-8 text-white shadow-2xl`}
      >
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur ring-8 ring-white/20 flex items-center justify-center flex-shrink-0">
            {React.createElement(meta.icon, {
              className: "w-14 h-14 text-white drop-shadow-lg",
              strokeWidth: 2.2,
            })}
          </div>
          <div className="flex-1 text-center md:text-right">
            <p className="urdu-text text-white/90 text-sm mb-2 flex items-center justify-center md:justify-start gap-2">
              <Sparkles className="w-4 h-4" />
              شاعر تصدیق کا درجہ
            </p>
            <h2 className="urdu-text text-4xl md:text-5xl font-extrabold mb-3 drop-shadow">
              {isVerified
                ? `${meta.label} تصدیق شدہ شاعر`
                : "ابھی تصدیق شدہ نہیں"}
            </h2>
            {isVerified && (
              <div className="inline-flex">
                <VerificationBadge
                  isVerified={true}
                  badge={currentBadge}
                  size="lg"
                />
              </div>
            )}
            {nextTier && nextCriteria && (
              <p className="urdu-text text-white/95 text-sm mt-4 leading-relaxed">
                اگلی سطح <b>{TIER_META[nextTier].label}</b> کے لیے درکار:
                {nextCriteria.poems > 0 && ` ${nextCriteria.poems}+ نظمیں`}
                {nextCriteria.followers > 0 && ` • ${nextCriteria.followers}+ فالوورز`}
                {nextCriteria.likes > 0 && ` • ${nextCriteria.likes}+ پسندیدگیاں`}
              </p>
            )}
            {!nextTier && isVerified && (
              <p className="urdu-text text-white/95 text-sm mt-4 leading-relaxed">
                آپ نے تصدیق کی بلند ترین سطح حاصل کر لی ہے — مبارک ہو!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={BookOpen}
          label="شائع شدہ نظمیں"
          value={stats.publishedPoems || 0}
          target={nextCriteria?.poems || criteria.diamond.poems}
          color="amber"
        />
        <StatCard
          icon={Users}
          label="فالوورز"
          value={stats.followers || 0}
          target={nextCriteria?.followers || criteria.diamond.followers}
          color="sky"
        />
        <StatCard
          icon={Heart}
          label="کل پسندیدگیاں"
          value={stats.totalLikes || 0}
          target={nextCriteria?.likes || criteria.diamond.likes}
          color="rose"
        />
      </div>

      {/* TIER LADDER */}
      <div className="bg-white rounded-3xl shadow-sm border border-amber-100 p-6">
        <h3 className="urdu-text text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          تصدیق کی سطحیں
        </h3>
        <div className="space-y-3">
          {["bronze", "silver", "gold", "diamond"].map((t) => (
            <TierRow
              key={t}
              tier={t}
              criteria={criteria[t]}
              currentBadge={currentBadge}
              stats={stats}
            />
          ))}
        </div>
      </div>

      {/* REQUEST FORM — only if not yet verified */}
      {!isVerified && (
        <div className="bg-white rounded-3xl shadow-sm border border-amber-100 p-6">
          <h3 className="urdu-text text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            دستی تصدیق کی درخواست
          </h3>
          <p className="urdu-text text-sm text-gray-600 mb-5 leading-relaxed">
            اگر آپ خودکار شرائط پوری نہیں کرتے تو ایڈمن سے براہ راست تصدیق کی درخواست
            کر سکتے ہیں۔ منظوری کی صورت میں آپ کو گولڈ بیج عطا کیا جائے گا۔
          </p>
          <VerificationForm />
        </div>
      )}

      {/* Already verified celebration */}
      {isVerified && status?.latestRequest?.status === "approved" && (
        <div className="bg-gradient-to-l from-green-50 to-emerald-50 rounded-3xl border border-green-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🎉</span>
            <h3 className="urdu-text text-xl font-bold text-green-800">
              مبارک ہو! آپ تصدیق شدہ شاعر ہیں
            </h3>
          </div>
          <p className="urdu-text text-sm text-green-700 leading-relaxed">
            آپ کا بیج پلیٹ فارم پر آپ کے نام کے ساتھ ظاہر ہوگا — نظمیں، تلاش کے
            نتائج، تبصرے اور پروفائل میں۔ مزید شاعری شائع کرتے رہیں اور اگلی سطح
            تک پہنچنے کی کوشش کریں۔
          </p>
        </div>
      )}
    </div>
  );
};

export default VerificationTab;
