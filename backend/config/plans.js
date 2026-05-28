/**
 * Static catalog of membership plans for Bazm-e-Sukhan.
 * Keep prices/features in one place — the frontend can fetch this list
 * and the backend uses it for validation when creating subscriptions.
 */

export const PLAN_CATALOG = {
  free: {
    id: "free",
    name: "Free",
    nameUrdu: "مفت",
    tagline: "شاعری کا ابتدائی سفر",
    price: { monthly: 0, yearly: 0, currency: "USD" },
    interval: "none",
    badge: null,
    color: "slate",
    features: {
      aiAdvancedSearch: false,
      exclusiveCollections: false,
      unlimitedDownloads: false,
      audioStudio: false,
      adFree: false,
      premiumBadge: false,
      earlyAccess: false,
    },
    perks: [
      "بنیادی اردو شاعری کا ذخیرہ",
      "محدود AI تلاش",
      "بک مارک اور پڑھنے کی تاریخ",
      "کمیونٹی میں شمولیت",
    ],
  },

  premium_monthly: {
    id: "premium_monthly",
    name: "Premium Monthly",
    nameUrdu: "پریمیم ماہانہ",
    tagline: "ہر ماہ نئی شاعری کا ذخیرہ",
    price: { monthly: 4.99, yearly: 4.99, currency: "USD" },
    interval: "month",
    badge: "Most Flexible",
    color: "amber",
    features: {
      aiAdvancedSearch: true,
      exclusiveCollections: true,
      unlimitedDownloads: true,
      audioStudio: false,
      adFree: true,
      premiumBadge: true,
      earlyAccess: false,
    },
    perks: [
      "خصوصی کلاسیکی مجموعے",
      "ایڈوانس AI تلاش (آواز + OCR)",
      "لامحدود PDF ڈاؤن لوڈ",
      "اشتہار سے پاک تجربہ",
      "پریمیم بیج",
    ],
  },

  premium_yearly: {
    id: "premium_yearly",
    name: "Premium Yearly",
    nameUrdu: "پریمیم سالانہ",
    tagline: "سال بھر کی بچت — دو ماہ مفت",
    price: { monthly: 3.33, yearly: 39.99, currency: "USD" },
    interval: "year",
    badge: "Best Value",
    color: "gold",
    features: {
      aiAdvancedSearch: true,
      exclusiveCollections: true,
      unlimitedDownloads: true,
      audioStudio: true,
      adFree: true,
      premiumBadge: true,
      earlyAccess: true,
    },
    perks: [
      "تمام پریمیم ماہانہ کی سہولیات",
      "آڈیو شاعری اسٹوڈیو تک رسائی",
      "نئے فیچرز تک ابتدائی رسائی",
      "33% سالانہ بچت",
      "VIP کمیونٹی چینل",
    ],
  },

  vip_literary: {
    id: "vip_literary",
    name: "VIP Literary",
    nameUrdu: "وی آئی پی ادبی رکنیت",
    tagline: "اعلیٰ ترین ادبی تجربہ",
    price: { monthly: 9.99, yearly: 99.99, currency: "USD" },
    interval: "year",
    badge: "Elite",
    color: "purple",
    features: {
      aiAdvancedSearch: true,
      exclusiveCollections: true,
      unlimitedDownloads: true,
      audioStudio: true,
      adFree: true,
      premiumBadge: true,
      earlyAccess: true,
    },
    perks: [
      "تمام پریمیم سالانہ کی سہولیات",
      "نایاب مخطوطات تک رسائی",
      "ماہانہ مشاعرہ میں دعوت",
      "شاعروں سے براہ راست رابطہ",
      "VIP ادبی بیج",
      "ذاتی کیورٹیڈ کلیکشن",
    ],
  },
};

export const PLAN_IDS = Object.keys(PLAN_CATALOG);

export function getPlan(planId) {
  return PLAN_CATALOG[planId] || null;
}

/**
 * Compute price (in major units) for a plan given the chosen billing cycle.
 * Returns { amount, currency, interval }.
 */
export function computePrice(planId, cycle = null) {
  const plan = getPlan(planId);
  if (!plan) return null;
  const interval = cycle || plan.interval;
  let amount = 0;
  if (interval === "year") amount = plan.price.yearly;
  else if (interval === "month") amount = plan.price.monthly;
  else amount = 0;
  return { amount, currency: plan.price.currency, interval };
}

export const SUPPORTED_PROVIDERS = [
  "stripe",
  "paypal",
  "razorpay",
  "jazzcash",
  "easypaisa",
];
