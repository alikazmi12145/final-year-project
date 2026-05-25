/**
 * copyrightAPI.js
 * Axios wrappers for the Copyright Management Module.
 * Shares baseURL + JWT injection conventions with verificationAPI.js.
 */
import axios from "axios";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API_BASE_URL = baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ─── Constants & poem-level ─────────────────────────────────────────── */
export const getCopyrightConstants = () => http.get("/copyright/constants");
export const getPoemCopyrightInfo = (poemId) =>
  http.get(`/copyright/poem/${poemId}/info`);
export const updatePoemLicense = (poemId, license) =>
  http.patch(`/copyright/poem/${poemId}/license`, { license });
export const checkSimilarity = (content, excludePoemId) =>
  http.post(`/copyright/check-similarity`, { content, excludePoemId });

/* ─── Reports (user) ─────────────────────────────────────────────────── */
export const submitCopyrightReport = (payload) =>
  http.post("/copyright/report", payload);
export const getMyCopyrightReports = (params = {}) =>
  http.get("/copyright/reports", { params });
export const getCopyrightReport = (id) => http.get(`/copyright/report/${id}`);
export const withdrawCopyrightReport = (id) =>
  http.delete(`/copyright/report/${id}`);
export const getMyViolations = () => http.get("/copyright/my-violations");

/* ─── Admin ──────────────────────────────────────────────────────────── */
export const getAdminCopyrightReports = (params = {}) =>
  http.get("/admin/copyright-reports", { params });
export const getAdminCopyrightReport = (id) =>
  http.get(`/admin/copyright-report/${id}`);
export const decideCopyrightReport = (id, payload) =>
  http.patch(`/admin/copyright/${id}`, payload);
export const getAdminViolations = (params = {}) =>
  http.get("/admin/violations", { params });
export const updateViolation = (id, payload) =>
  http.patch(`/admin/violations/${id}`, payload);

/* ─── Local constants (mirror backend enums; safe defaults) ─────────── */
export const LICENSE_OPTIONS = [
  {
    id: "all_rights_reserved",
    label: "تمام حقوق محفوظ",
    english: "All Rights Reserved",
    description: "کوئی شخص اجازت کے بغیر کاپی یا تقسیم نہیں کر سکتا۔",
    icon: "🔒",
  },
  {
    id: "cc_by",
    label: "CC BY",
    english: "Creative Commons Attribution",
    description: "حوالہ دے کر استعمال اور تبدیلی کی اجازت ہے۔",
    icon: "🌐",
  },
  {
    id: "cc_by_sa",
    label: "CC BY-SA",
    english: "Attribution-ShareAlike",
    description: "اسی شرائط کے تحت تبدیلی اور دوبارہ اشاعت کی اجازت۔",
    icon: "🔁",
  },
  {
    id: "cc_by_nc",
    label: "CC BY-NC",
    english: "Attribution-NonCommercial",
    description: "غیر تجارتی استعمال کے لیے آزاد، حوالہ ضروری۔",
    icon: "🚫💰",
  },
  {
    id: "public_domain",
    label: "پبلک ڈومین",
    english: "Public Domain",
    description: "کوئی حق محفوظ نہیں، آزاد استعمال۔",
    icon: "🕊️",
  },
  {
    id: "personal_copyright",
    label: "ذاتی کاپی رائٹ",
    english: "Personal Copyright",
    description: "صرف ذاتی استعمال کے لیے۔ تجارتی پھیلاؤ منع۔",
    icon: "🪪",
  },
];

export const REPORT_REASONS = [
  { id: "plagiarism", label: "سرقہ (Plagiarism)" },
  { id: "unauthorized_reproduction", label: "بغیر اجازت دوبارہ اشاعت" },
  { id: "license_violation", label: "لائسنس کی خلاف ورزی" },
  { id: "false_attribution", label: "غلط حوالہ / نام" },
  { id: "derivative_without_permission", label: "بغیر اجازت اخذ" },
  { id: "other", label: "دیگر" },
];

export const STATUS_META = {
  pending: { label: "زیرِ التواء", color: "amber" },
  under_review: { label: "جائزے میں", color: "blue" },
  approved: { label: "منظور", color: "green" },
  rejected: { label: "مسترد", color: "red" },
  withdrawn: { label: "واپس لے لیا", color: "gray" },
};

export const ADMIN_ACTIONS = [
  { id: "warning", label: "وارننگ" },
  { id: "poem_unpublished", label: "نظم غیر مطبوعہ کریں" },
  { id: "poem_removed", label: "نظم ہٹا دیں" },
  { id: "user_suspended", label: "صارف معطل کریں" },
  { id: "user_banned", label: "صارف پر پابندی" },
];

export default http;
