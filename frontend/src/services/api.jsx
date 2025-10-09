import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // Increased to 15 seconds for search operations
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log("✅ API Response:", response.config.url, response.data);
    return response;
  },
  (error) => {
    console.error(
      "❌ API Error:",
      error.config?.url,
      error.response?.data || error.message
    );

    // Handle different error scenarios
    if (error.response?.status === 401) {
      console.warn("🔒 Unauthorized - removing token");
      localStorage.removeItem("token");
      // Don't redirect automatically for login endpoints
      if (!error.config?.url?.includes("/auth/login")) {
        window.location.href = "/auth";
      }
    } else if (error.response?.status === 403) {
      console.warn("🚫 Forbidden access");
      // Don't redirect for 403 errors, let the component handle it
    } else if (error.code === "NETWORK_ERROR" || !error.response) {
      console.error("🌐 Network error - server may be down");
    }

    return Promise.reject(error);
  }
);

//
// 🔹 Auth API
//
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  getMe: () => api.get("/auth/me"),

  // Token Management
  refreshToken: (refreshToken) => api.post("/auth/refresh", { refreshToken }),

  // Password Recovery
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (data) => api.post("/auth/reset-password", data),

  // Email Verification
  verifyEmail: (token) => api.post("/auth/verify-email", { token }),
  resendVerification: (email) =>
    api.post("/auth/resend-verification", { email }),

  // Social Login (handled by redirects to backend OAuth endpoints)
  googleLogin: () => (window.location.href = `${API_BASE_URL}/auth/google`),
  facebookLogin: () => (window.location.href = `${API_BASE_URL}/auth/facebook`),
  githubLogin: () => (window.location.href = `${API_BASE_URL}/auth/github`),

  // Server Health Check
  healthCheck: () =>
    api.get("/health").catch(() => ({
      data: { success: false, message: "Server not responding" },
    })),
};

//
// 🔹 Poetry API
//
export const poetryAPI = {
  // Poem CRUD operations
  getAllPoems: (params = {}) => api.get("/poems", { params }),
  getMyPoems: (params = {}) => api.get("/poems/my-poems", { params }),
  getPoemById: (id) => api.get(`/poems/${id}`),
  createPoem: (poemData) => api.post("/poems", poemData),
  updatePoem: (id, poemData) => api.put(`/poems/${id}`, poemData),
  deletePoem: (id) => api.delete(`/poems/${id}`),

  // Poem interactions
  likePoem: (id) => api.post(`/poems/${id}/like`),
  addComment: (id, commentData) =>
    api.post(`/poems/${id}/comments`, commentData),

  // Search and filters
  searchPoems: (query, filters = {}) =>
    api.get("/poems", {
      params: { search: query, ...filters },
    }),

  // Poet operations
  getAllPoets: () => api.get("/poets"),
  getPoetById: (id) => api.get(`/poets/${id}`),
  createPoet: (poetData) => api.post("/poets", poetData),

  // Categories and metadata
  getCategories: () => api.get("/categories"),
  getPoemStats: () => api.get("/poems/stats"),

  // Missing functions for dashboard
  getSubmissions: (params = {}) => api.get("/poems/submissions", { params }),
  getContests: (params = {}) => api.get("/contests", { params }),

  // Admin approval functions
  getPendingPoems: (params = {}) => api.get("/poems/pending", { params }),
  approvePoem: (id) => api.put(`/poems/${id}/approve`),
  rejectPoem: (id, reason) => api.put(`/poems/${id}/reject`, { reason }),

  // Rating and review functions
  addRating: (id, ratingData) => api.post(`/poems/${id}/rating`, ratingData),
  getRatings: (id, params = {}) => api.get(`/poems/${id}/ratings`, { params }),

  // Bookmark/Favorites functions
  toggleBookmark: (id) => api.post(`/poems/${id}/bookmark`),
  getBookmarkedPoems: async (params = {}) => {
    try {
      return await api.get("/poems/bookmarks", { params });
    } catch (error) {
      // Handle 500 error gracefully for bookmarks endpoint
      if (error.response?.status === 500) {
        console.warn(
          "📚 Bookmarks endpoint not fully implemented, returning empty result"
        );
        return {
          data: {
            success: true,
            poems: [],
            message: "Bookmarks feature coming soon",
          },
        };
      }
      throw error;
    }
  },

  // View tracking
  incrementView: (id) => api.post(`/poems/${id}/view`),

  // Privacy functions
  togglePrivacy: (id) => api.patch(`/poems/${id}/privacy`),

  // Recommendations
  getRecommendations: (params = {}) =>
    api.get("/poems/recommendations", { params }),
};

//
// 🔹 Poet API
//
export const poetAPI = {
  // Get all poets with filtering and pagination
  getAllPoets: (params = {}) => api.get("/poets", { params }),
  getPoetById: (id) => api.get(`/poets/${id}`),
  getPoetProfile: (id) => api.get(`/poets/${id}/profile`),
  getPoetPoems: (id, params = {}) => api.get(`/poets/${id}/poems`, { params }),

  // Search poets
  searchPoets: (query, filters = {}) =>
    api.get("/poets", {
      params: { search: query, ...filters },
    }),
};

//
// 🔹 Search API (AI Multi-Modal Search)
//
export const searchAPI = {
  // Text Search with AI enhancement
  textSearch: async (query, filters = {}) => {
    try {
      return await api.post("/search/text", {
        query,
        useAI: true, // Enable AI enhancement
        limit: 50,
        page: 1,
        ...filters,
      });
    } catch (error) {
      console.warn("🔍 Text search failed, trying basic search");
      // Fallback to basic search without AI
      return await api.post("/search/text", {
        query,
        useAI: false,
        limit: 50,
        page: 1,
        ...filters,
      });
    }
  },

  // Fuzzy Search for misspellings
  fuzzySearch: (query, limit = 30) =>
    api.post("/search/fuzzy", {
      query,
      limit,
    }),

  // Voice Search with transcription improvement
  voiceSearch: async (transcribedText, confidence = 0) => {
    try {
      return await api.post("/search/voice", {
        transcribedText,
        confidence,
      });
    } catch (error) {
      console.warn("🎤 Voice search failed, falling back to text search");
      // Fallback to text search
      return await api.post("/search/text", {
        query: transcribedText,
        useAI: false,
        limit: 30,
      });
    }
  },

  // Image Search with OCR and text analysis
  imageSearch: async (image) => {
    try {
      return await api.post("/search/image", { image });
    } catch (error) {
      console.error("📷 Image search failed:", error);
      throw error;
    }
  },

  // Advanced Search with multiple filters
  advancedSearch: (searchParams) => api.post("/search/advanced", searchParams),

  // AI-powered Smart Suggestions
  getSmartSuggestions: async (partialQuery) => {
    try {
      return await api.post("/search/suggestions", { partialQuery });
    } catch (error) {
      console.warn("💡 Smart suggestions failed");
      return { data: { success: false, suggestions: [] } };
    }
  },

  // Legacy text search (for backward compatibility)
  searchPoems: (query, filters = {}) =>
    api.get("/poems", {
      params: { search: query, ...filters },
    }),
};

//
// 🔹 Contest API
//
export const contestAPI = {
  // Contest CRUD
  getAllContests: (params = {}) => api.get("/contests", { params }),
  getContestById: (id) => api.get(`/contests/${id}`),
  createContest: (contestData) => api.post("/contests", contestData),
  updateContest: (id, contestData) => api.put(`/contests/${id}`, contestData),
  deleteContest: (id) => api.delete(`/contests/${id}`),

  // Contest Management
  participateInContest: (id, poemId) =>
    api.post(`/contests/${id}/participate`, { poemId }),
  voteForSubmission: (id, participantId, rating) =>
    api.post(`/contests/${id}/vote`, { participantId, rating }),
  getContestLeaderboard: (id) => api.get(`/contests/${id}/leaderboard`),
  getContestParticipants: (id) => api.get(`/contests/${id}/participants`),

  // Contest Status Management (Admin)
  activateContest: (id) => api.put(`/contests/${id}/activate`),
  completeContest: (id) => api.put(`/contests/${id}/complete`),
  cancelContest: (id) => api.put(`/contests/${id}/cancel`),
  announceWinners: (id, winners) =>
    api.put(`/contests/${id}/winners`, { winners }),
};

//
// 🔹 Admin API
//
export const adminAPI = {
  // Dashboard
  getDashboardStats: () => api.get("/admin/dashboard/stats"),
  getAnalytics: (period = "30d") =>
    api.get(`/admin/analytics?period=${period}`),

  // Users Management
  getAllUsers: (params = {}) => api.get("/admin/users", { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  bulkUpdateUsers: (userIds, updateData) =>
    api.put("/admin/users/bulk", { userIds, updateData }),
  exportUsers: (format = "csv", filters = {}) =>
    api.get("/admin/users/export", {
      params: { format, ...filters },
      responseType: "blob",
    }),

  // User Approval System
  approveUser: (id, approvalData = {}) =>
    api.put(`/admin/users/${id}/approve`, {
      status: "active",
      approvedAt: new Date().toISOString(),
      ...approvalData,
    }),
  rejectUser: (id, rejectionData = {}) =>
    api.put(`/admin/users/${id}/reject`, {
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      ...rejectionData,
    }),
  suspendUser: (id, suspensionData = {}) =>
    api.put(`/admin/users/${id}/suspend`, {
      status: "suspended",
      suspendedAt: new Date().toISOString(),
      ...suspensionData,
    }),
  getPendingUsers: (params = {}) => api.get("/admin/users/pending", { params }),
  bulkApproveUsers: (userIds) =>
    api.put("/admin/users/bulk-approve", { userIds }),

  // Poet Verification
  getPendingPoets: () => api.get("/admin/poets/pending"),
  verifyPoet: (id, action, reviewNotes) =>
    api.put(`/admin/poets/${id}/verify`, {
      action,
      reviewNotes,
    }),

  // Content Moderation
  getFlaggedContent: (type = "all") =>
    api.get(`/admin/content/flagged?type=${type}`),
  moderateContent: (type, id, action, moderationNotes) =>
    api.put(`/admin/content/${type}/${id}/moderate`, {
      action,
      moderationNotes,
    }),
  bulkModerateContent: (items, action) =>
    api.put("/admin/content/bulk-moderate", { items, action }),

  // System Settings
  getSettings: () => api.get("/admin/settings"),
  updateSettings: (settings) => api.put("/admin/settings", settings),
  getSystemHealth: () => api.get("/admin/system/health"),
  performBackup: () => api.post("/admin/system/backup"),
  getBackupHistory: () => api.get("/admin/system/backups"),

  // Advanced Analytics
  getUserAnalytics: (period = "30d") =>
    api.get(`/admin/analytics/users?period=${period}`),
  getContentAnalytics: (period = "30d") =>
    api.get(`/admin/analytics/content?period=${period}`),
  getEngagementAnalytics: (period = "30d") =>
    api.get(`/admin/analytics/engagement?period=${period}`),
  exportAnalytics: (type, period = "30d", format = "csv") =>
    api.get(`/admin/analytics/${type}/export`, {
      params: { period, format },
      responseType: "blob",
    }),

  // Contest Management
  getAllContests: (params = {}) => api.get("/admin/contests", { params }),
  updateContestStatus: (id, status) =>
    api.put(`/admin/contests/${id}/status`, { status }),
  getContestAnalytics: (id) => api.get(`/admin/contests/${id}/analytics`),
  exportContestData: (id, format = "csv") =>
    api.get(`/admin/contests/${id}/export`, {
      params: { format },
      responseType: "blob",
    }),

  // Notification Management
  sendBulkNotification: (recipients, notification) =>
    api.post("/admin/notifications/bulk", { recipients, notification }),
  getNotificationHistory: (params = {}) =>
    api.get("/admin/notifications/history", { params }),

  // Legacy (for backward compatibility)
  getStats: () => api.get("/admin/dashboard/stats"),
  getAllPoems: () => api.get("/admin/poems"),
  approvePoem: (id) => api.put(`/admin/poems/${id}/approve`),
  deletePoem: (id) => api.delete(`/admin/poems/${id}`),
  getAllPoets: () => api.get("/admin/poets"),
  approvePoet: (id) => api.put(`/admin/poets/${id}/approve`),
};

//
// 🔹 Dashboard API
//
export const dashboardAPI = {
  // Poet Dashboard
  getPoetDashboard: () => api.get("/dashboard/poet"),
  getFollowers: () => api.get("/dashboard/followers"),
  getFollowing: () => api.get("/dashboard/following"),
  updateProfile: (profileData) => api.put("/auth/profile", profileData),
  uploadProfileImage: (formData) =>
    api.post("/auth/profile/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  exportPoetData: () => api.get("/dashboard/export"),

  // Admin Dashboard
  getAdminDashboard: () => api.get("/dashboard/admin"),
  approvePoem: (id) => api.patch(`/dashboard/admin/poems/${id}/approve`),
  rejectPoem: (id, reason) =>
    api.patch(`/dashboard/admin/poems/${id}/reject`, { reason }),
  toggleUserStatus: (id) =>
    api.patch(`/dashboard/admin/users/${id}/toggle-status`),
};

//
// 🔹 Test API Connection
//
export const testConnection = async () => {
  try {
    const response = await api.get("/health");
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

//
// 🔹 Default export (axios instance if needed)
//
export default api;
