/**
 * verificationAPI.js
 * Axios wrappers for poet verification and fraud reporting endpoints.
 * Uses a shared axios instance with automatic JWT auth header injection.
 */
import axios from "axios";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API_BASE_URL = baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Automatically attach JWT token from localStorage
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const applyForVerification = (data) =>
  http.post("/verification/apply", data);

export const getMyVerificationStatus = () =>
  http.get("/verification/my-status");

export const autoCheckVerification = () =>
  http.post("/verification/auto-check");

export const getAdminVerificationRequests = (params = {}) =>
  http.get("/admin/verification-requests", { params });

export const approveVerificationRequest = (id, adminRemarks = "") =>
  http.put(`/admin/verification/${id}/approve`, { adminRemarks });

export const rejectVerificationRequest = (id, adminRemarks) =>
  http.put(`/admin/verification/${id}/reject`, { adminRemarks });

export const submitFraudReport = (data) =>
  http.post("/report", data);

export const getReportsAgainstMe = () => http.get("/report/against-me");

export const markReportsSeen = () => http.put("/report/mark-seen");

export const getAdminFraudReports = (params = {}) =>
  http.get("/admin/reports", { params });

export const resolveReport = (id, action = "resolved", adminNotes = "") =>
  http.put(`/admin/report/${id}/resolve`, { action, adminNotes });
