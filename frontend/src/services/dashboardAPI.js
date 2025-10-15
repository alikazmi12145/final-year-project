import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

// ============================
// ADMIN DASHBOARD API
// ============================

export const adminDashboardAPI = {
  // Authentication
  login: async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  // Dashboard Overview - Complete Statistics
  getDashboard: async () => {
    const response = await api.get("/admin/dashboard/stats");
    return response.data;
  },

  // Dashboard Statistics with Real-time Data
  getDashboardStats: async () => {
    const response = await api.get("/admin/dashboard/stats");
    return response.data;
  },

  // User Management - All Users with Filtering
  getUsers: async (params = {}) => {
    const response = await api.get("/admin/users", { params });
    return response.data;
  },

  // Get Users by Role (Dynamic Role-based Filtering)
  getUsersByRole: async (role) => {
    const response = await api.get("/admin/users", {
      params: { role, limit: 100 },
    });
    return response.data;
  },

  // Get Users by Status (Dynamic Status-based Filtering)
  getUsersByStatus: async (status) => {
    const response = await api.get("/admin/users", {
      params: { status, limit: 100 },
    });
    return response.data;
  },

  // Get pending users specifically for approval workflow
  getPendingUsers: async (role = "all") => {
    const response = await api.get("/admin/users/pending", {
      params: { role },
    });
    return response.data;
  },

  // Real-time User Statistics
  getUserStats: async () => {
    const response = await api.get("/admin/users/stats");
    return response.data;
  },

  // User Operations
  approveUser: async (userId, approved, reason = "") => {
    const endpoint = approved ? "approve" : "reject";
    const response = await api.put(`/admin/users/${userId}/${endpoint}`, {
      approvedBy: "admin",
      [approved ? "approvedReason" : "rejectedReason"]: reason,
    });
    return response.data;
  },

  // Update user role dynamically
  updateUserRole: async (userId, newRole) => {
    const response = await api.put(`/admin/users/${userId}`, {
      role: newRole,
    });
    return response.data;
  },

  // Update user status dynamically
  updateUserStatus: async (userId, newStatus, reason = "") => {
    const response = await api.put(`/admin/users/${userId}`, {
      status: newStatus,
      statusReason: reason,
    });
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // Bulk operations for efficiency
  bulkApproveUsers: async (userIds) => {
    const response = await api.put("/admin/users/bulk-approve", { userIds });
    return response.data;
  },

  bulkUpdateUsers: async (userIds, updateData) => {
    const response = await api.put("/admin/users/bulk", {
      userIds,
      updateData,
    });
    return response.data;
  },

  // Poem Management
  getPoems: async (params = {}) => {
    const response = await api.get("/admin/poems", { params });
    return response.data;
  },

  approvePoem: async (poemId, approved, reason) => {
    const response = await api.put(`/admin/content/poem/${poemId}/moderate`, {
      action: approved ? "approve" : "reject",
      moderationNotes: reason,
    });
    return response.data;
  },

  featurePoem: async (poemId, featured) => {
    const response = await api.put(`/admin/poems/${poemId}/feature`, {
      featured,
    });
    return response.data;
  },

  deletePoem: async (poemId) => {
    const response = await api.delete(`/admin/poems/${poemId}`);
    return response.data;
  },

  // Contest Management
  getContests: async () => {
    const response = await api.get("/admin/contests");
    return response.data;
  },

  createContest: async (contestData) => {
    const response = await api.post("/admin/contests", contestData);
    return response.data;
  },

  updateContest: async (contestId, contestData) => {
    const response = await api.put(`/admin/contests/${contestId}`, contestData);
    return response.data;
  },

  deleteContest: async (contestId) => {
    const response = await api.delete(`/admin/contests/${contestId}`);
    return response.data;
  },

  // Analytics
  getAnalytics: async (period = "30d") => {
    const response = await api.get("/admin/analytics", {
      params: { period },
    });
    return response.data;
  },

  // AI Reports
  generateAIReport: async (type = "weekly") => {
    const response = await api.post("/admin/ai-report", { type });
    return response.data;
  },
};

// ============================
// POET DASHBOARD API
// ============================

export const poetDashboardAPI = {
  // Authentication
  login: async (credentials) => {
    const response = await api.post("/poet-dashboard/login", credentials);
    return response.data;
  },

  // Dashboard Overview
  getOverview: async () => {
    const response = await api.get("/poet-dashboard/overview");
    return response.data;
  },

  // Profile Management
  getProfile: async () => {
    const response = await api.get("/poet-dashboard/profile");
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put("/poet-dashboard/profile", profileData);
    return response.data;
  },

  uploadAvatar: async (avatarFile) => {
    const formData = new FormData();
    formData.append("avatar", avatarFile);

    const response = await api.post(
      "/poet-dashboard/profile/avatar",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Poem Management
  getPoems: async (params = {}) => {
    const response = await api.get("/poet-dashboard/poems", { params });
    return response.data;
  },

  createPoem: async (poemData) => {
    const response = await api.post("/poet-dashboard/poems", poemData);
    return response.data;
  },

  updatePoem: async (poemId, poemData) => {
    const response = await api.put(`/poet-dashboard/poems/${poemId}`, poemData);
    return response.data;
  },

  deletePoem: async (poemId) => {
    const response = await api.delete(`/poet-dashboard/poems/${poemId}`);
    return response.data;
  },

  // AI Assistance
  getAISuggestions: async (content, language = "urdu") => {
    const response = await api.post("/poet-dashboard/ai/suggestions", {
      content,
      language,
    });
    return response.data;
  },

  translatePoem: async (content, fromLanguage, toLanguage) => {
    const response = await api.post("/poet-dashboard/ai/translate", {
      content,
      fromLanguage,
      toLanguage,
    });
    return response.data;
  },

  // Classical Poetry Search
  searchClassicalPoetry: async (query, poet) => {
    const response = await api.post("/poet-dashboard/classical-search", {
      query,
      poet,
    });
    return response.data;
  },

  // Analytics
  getAnalytics: async (period = "month") => {
    const response = await api.get("/poet-dashboard/analytics", {
      params: { period },
    });
    return response.data;
  },
};

// ============================
// UTILITY FUNCTIONS - ENHANCED FOR DYNAMIC DASHBOARD
// ============================

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDateUrdu = (dateString) => {
  const date = new Date(dateString);
  const months = [
    "جنوری",
    "فروری",
    "مارچ",
    "اپریل",
    "مئی",
    "جون",
    "جولائی",
    "اگست",
    "ستمبر",
    "اکتوبر",
    "نومبر",
    "دسمبر",
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "ابھی";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} منٹ پہلے`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} گھنٹے پہلے`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "کل";
  if (diffInDays < 7) return `${diffInDays} دن پہلے`;

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks === 1) return "1 ہفتہ پہلے";
  if (diffInWeeks < 4) return `${diffInWeeks} ہفتے پہلے`;

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths === 1) return "1 ماہ پہلے";
  if (diffInMonths < 12) return `${diffInMonths} ماہ پہلے`;

  const diffInYears = Math.floor(diffInDays / 365);
  return diffInYears === 1 ? "1 سال پہلے" : `${diffInYears} سال پہلے`;
};

export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num?.toString() || "0";
};

export const formatNumberUrdu = (num) => {
  const urduDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num?.toString().replace(/\d/g, (digit) => urduDigits[digit]) || "۰";
};

export const getStatusColor = (status) => {
  const colors = {
    active: "text-green-600 bg-green-100 border-green-200",
    pending: "text-yellow-600 bg-yellow-100 border-yellow-200",
    rejected: "text-red-600 bg-red-100 border-red-200",
    published: "text-green-600 bg-green-100 border-green-200",
    draft: "text-gray-600 bg-gray-100 border-gray-200",
    suspended: "text-orange-600 bg-orange-100 border-orange-200",
    banned: "text-red-600 bg-red-100 border-red-200",
    approved: "text-green-600 bg-green-100 border-green-200",
    reviewing: "text-blue-600 bg-blue-100 border-blue-200",
  };
  return colors[status] || "text-gray-600 bg-gray-100 border-gray-200";
};

export const getStatusTextUrdu = (status) => {
  const statusTexts = {
    active: "فعال",
    pending: "منتظر منظوری",
    rejected: "مسترد",
    published: "شائع شدہ",
    draft: "مسودہ",
    suspended: "معطل",
    banned: "پابند",
    approved: "منظور شدہ",
    reviewing: "زیر نظر",
  };
  return statusTexts[status] || status;
};

export const getRoleColor = (role) => {
  const colors = {
    admin: "text-purple-600 bg-purple-100 border-purple-200",
    moderator: "text-blue-600 bg-blue-100 border-blue-200",
    poet: "text-green-600 bg-green-100 border-green-200",
    reader: "text-gray-600 bg-gray-100 border-gray-200",
  };
  return colors[role] || "text-gray-600 bg-gray-100 border-gray-200";
};

export const getRoleTextUrdu = (role) => {
  const roleTexts = {
    admin: "ایڈمن",
    moderator: "منتظم",
    poet: "شاعر",
    reader: "قاری",
  };
  return roleTexts[role] || role;
};

export const getRoleIcon = (role) => {
  const icons = {
    admin: "👑",
    moderator: "⚖️",
    poet: "🎭",
    reader: "📚",
  };
  return icons[role] || "👤";
};

export const calculateGrowthPercentage = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return (((current - previous) / previous) * 100).toFixed(1);
};

export const getGrowthColor = (percentage) => {
  if (percentage > 0) return "text-green-600";
  if (percentage < 0) return "text-red-600";
  return "text-gray-600";
};

export const getEngagementLevel = (rate) => {
  if (rate >= 80) return { text: "بہترین", color: "text-green-600" };
  if (rate >= 60) return { text: "اچھا", color: "text-blue-600" };
  if (rate >= 40) return { text: "متوسط", color: "text-yellow-600" };
  return { text: "کم", color: "text-red-600" };
};

// Export the main api instance for other custom requests
export default api;
