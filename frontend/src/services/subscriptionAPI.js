import axios from "axios";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API_BASE_URL = baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const client = axios.create({
  baseURL: `${API_BASE_URL}/subscriptions`,
  timeout: 20000,
});

client.interceptors.request.use((config) => {
  Object.assign(config.headers, authHeaders());
  return config;
});

const subscriptionAPI = {
  listPlans: () => client.get("/plans").then((r) => r.data),
  getMine: () => client.get("/me").then((r) => r.data),
  getPayments: (params = {}) =>
    client.get("/payments", { params }).then((r) => r.data),
  getInvoice: (paymentId) =>
    client.get(`/invoice/${paymentId}`).then((r) => r.data),
  checkout: (payload) => client.post("/checkout", payload).then((r) => r.data),
  confirm: (payload) => client.post("/confirm", payload).then((r) => r.data),
  cancel: (reason) =>
    client.post("/cancel", { reason }).then((r) => r.data),
  toggleAutoRenew: () => client.patch("/auto-renew").then((r) => r.data),

  // Admin
  adminRevenue: () => client.get("/admin/revenue").then((r) => r.data),
  adminListSubscriptions: (params = {}) =>
    client.get("/admin/subscriptions", { params }).then((r) => r.data),
};

export default subscriptionAPI;
