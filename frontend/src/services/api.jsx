import axios from "axios";

// Ensure we have the correct base URL without double /api
const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
const API_BASE_URL = baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;

console.log("🔧 API Base URL configured as:", API_BASE_URL);

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // Increased to 15 seconds for search operations
});

// Request interceptor
axiosInstance.interceptors.request.use(
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
axiosInstance.interceptors.response.use(
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
// 🔹 Enhanced API Structure with separate namespaces
//
const api = {
  // Authentication endpoints
  auth: {
    login: (credentials) => axiosInstance.post("/auth/login", credentials),
    register: (userData) => axiosInstance.post("/auth/register", userData),
    getMe: () => axiosInstance.get("/auth/me"),
    logout: () => {
      localStorage.removeItem("token");
      return Promise.resolve({ data: { success: true } });
    },

    // Token Management
    refreshToken: (refreshToken) =>
      axiosInstance.post("/auth/refresh", { refreshToken }),

    // Password Recovery
    forgotPassword: (email) =>
      axiosInstance.post("/auth/forgot-password", { email }),
    resetPassword: (data) => axiosInstance.post("/auth/reset-password", data),

    // Email Verification
    verifyEmail: (token) => axiosInstance.post("/auth/verify-email", { token }),
    resendVerification: (email) =>
      axiosInstance.post("/auth/resend-verification", { email }),

    // Social Login
    googleLogin: () => (window.location.href = `${API_BASE_URL}/auth/google`),
    facebookLogin: () =>
      (window.location.href = `${API_BASE_URL}/auth/facebook`),
    githubLogin: () => (window.location.href = `${API_BASE_URL}/auth/github`),
  },

  // User management endpoints
  users: {
    getProfile: () => axiosInstance.get("/users/me"),
    updateProfile: (data) => axiosInstance.put("/users/me", data),
    uploadAvatar: (formData) =>
      axiosInstance.post("/users/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    changePassword: (data) => axiosInstance.put("/users/password", data),
    getFollowers: (userId) => axiosInstance.get(`/users/${userId}/followers`),
    getFollowing: (userId) => axiosInstance.get(`/users/${userId}/following`),
    followUser: (userId) => axiosInstance.post(`/users/${userId}/follow`),
    unfollowUser: (userId) => axiosInstance.delete(`/users/${userId}/follow`),
    getFavorites: () => axiosInstance.get("/users/favorites"),
    addFavorite: (poemId) => axiosInstance.post(`/users/favorites/${poemId}`),
    removeFavorite: (poemId) =>
      axiosInstance.delete(`/users/favorites/${poemId}`),
  },

  // Admin endpoints
  admin: {
    getStats: () => axiosInstance.get("/admin/stats"),
    getAllUsers: (params = {}) => axiosInstance.get("/admin/users", { params }),
    updateUserRole: (userId, role) =>
      axiosInstance.put(`/admin/users/${userId}/role`, { role }),
    deleteUser: (userId) => axiosInstance.delete(`/admin/users/${userId}`),
    getPendingPoems: (params = {}) =>
      axiosInstance.get("/admin/poems/pending", { params }),
    approvePoem: (poemId) =>
      axiosInstance.put(`/admin/poems/${poemId}/approve`),
    rejectPoem: (poemId, reason) =>
      axiosInstance.put(`/admin/poems/${poemId}/reject`, { reason }),
    getReports: (params = {}) =>
      axiosInstance.get("/admin/reports", { params }),
    handleReport: (reportId, action) =>
      axiosInstance.put(`/admin/reports/${reportId}`, { action }),
  },

  // Search endpoints
  search: {
    // Unified search endpoint
    unified: (searchData) => axiosInstance.post("/search", searchData),

    // Text search with filters
    text: (query, filters = {}) =>
      axiosInstance.post("/search", {
        mode: "text",
        query,
        ...filters,
      }),

    // Voice search
    voice: (transcript, confidence, filters = {}) =>
      axiosInstance.post("/search", {
        mode: "voice",
        transcript,
        confidence,
        ...filters,
      }),

    // Image search with OCR
    image: (extractedText, ocrConfidence, filters = {}) =>
      axiosInstance.post("/search", {
        mode: "image",
        extractedText,
        ocrConfidence,
        ...filters,
      }),

    // Fuzzy search for typos
    fuzzy: (query, threshold = 0.4, filters = {}) =>
      axiosInstance.post("/search", {
        mode: "fuzzy",
        query,
        threshold,
        ...filters,
      }),

    // Get search suggestions
    suggestions: (query) =>
      axiosInstance.get("/search/suggestions", {
        params: { query },
      }),
  },

  // Poets endpoints
  poets: {
    getAll: (params = {}) => axiosInstance.get("/poets", { params }),
    getById: (id) => axiosInstance.get(`/poets/${id}`),
    create: (poetData) => axiosInstance.post("/poets", poetData),
    update: (id, poetData) => axiosInstance.put(`/poets/${id}`, poetData),
    delete: (id) => axiosInstance.delete(`/poets/${id}`),
    getByGenre: (genre) => axiosInstance.get(`/poets/genre/${genre}`),
    getWorks: (poetId, params = {}) =>
      axiosInstance.get(`/poets/${poetId}/works`, { params }),
    getAchievements: (poetId) =>
      axiosInstance.get(`/poets/${poetId}/achievements`),
  },

  // Chat endpoints
  chat: {
    // Conversations
    getConversations: (params = {}) =>
      axiosInstance.get("/chat/conversations", { params }),
    createConversation: (data) => {
      // Route to appropriate endpoint based on chat type
      if (data.type === "group") {
        return axiosInstance.post("/chat/conversations/group", data);
      } else {
        return axiosInstance.post("/chat/conversations/direct", data);
      }
    },
    getConversationById: (id) => axiosInstance.get(`/chat/conversations/${id}`),
    updateConversation: (id, data) =>
      axiosInstance.put(`/chat/conversations/${id}`, data),
    deleteConversation: (id) =>
      axiosInstance.delete(`/chat/conversations/${id}`),

    // Messages
    getMessages: (conversationId, params = {}) =>
      axiosInstance.get(`/chat/conversations/${conversationId}/messages`, {
        params,
      }),
    sendMessage: (conversationId, messageData) =>
      axiosInstance.post(
        `/chat/conversations/${conversationId}/messages`,
        messageData
      ),
    sendMessageWithFile: (conversationId, formData) =>
      axiosInstance.post(
        `/chat/conversations/${conversationId}/messages/file`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      ),
    updateMessage: (messageId, data) =>
      axiosInstance.put(`/chat/messages/${messageId}`, data),
    deleteMessage: (messageId) =>
      axiosInstance.delete(`/chat/messages/${messageId}`),
    markAsRead: (conversationId) =>
      axiosInstance.put(`/chat/conversations/${conversationId}/read`),

    // Reactions
    addReaction: (messageId, emoji) =>
      axiosInstance.post(`/chat/messages/${messageId}/reactions`, { emoji }),
    removeReaction: (messageId, reactionId) =>
      axiosInstance.delete(
        `/chat/messages/${messageId}/reactions/${reactionId}`
      ),

    // Group Management
    addMember: (conversationId, userId) =>
      axiosInstance.post(`/chat/conversations/${conversationId}/members`, {
        userId,
      }),
    removeMember: (conversationId, userId) =>
      axiosInstance.delete(
        `/chat/conversations/${conversationId}/members/${userId}`
      ),
    updateMemberRole: (conversationId, userId, role) =>
      axiosInstance.put(
        `/chat/conversations/${conversationId}/members/${userId}/role`,
        { role }
      ),
    leaveGroup: (conversationId) =>
      axiosInstance.delete(`/chat/conversations/${conversationId}/leave`),

    // Chatbot
    getChatbotResponse: (message) =>
      axiosInstance.post("/chat/chatbot", { message }),
    getChatbotHistory: () => axiosInstance.get("/chat/chatbot/history"),

    // Search
    searchConversations: (query) =>
      axiosInstance.get("/chat/search/conversations", { params: { query } }),
    searchMessages: (query, conversationId = null) =>
      axiosInstance.get("/chat/search/messages", {
        params: { query, conversationId },
      }),

    // User Search for new chats
    searchUsers: (query) =>
      axiosInstance.get("/chat/users/search", { params: { query } }),
  },

  // Support Ticket endpoints
  support: {
    getMyTickets: (params = {}) =>
      axiosInstance.get("/chat/support/tickets", { params }),
    createTicket: (ticketData) =>
      axiosInstance.post("/chat/support/tickets", ticketData),
    getTicketById: (id) => axiosInstance.get(`/chat/support/tickets/${id}`),
    replyToTicket: (id, replyData) =>
      axiosInstance.post(`/chat/support/tickets/${id}/replies`, replyData),
    updateTicketStatus: (id, status) =>
      axiosInstance.put(`/chat/support/tickets/${id}/status`, { status }),
    attachFile: (id, formData) =>
      axiosInstance.post(`/chat/support/tickets/${id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),

    // Admin Support Management
    getAllTickets: (params = {}) =>
      axiosInstance.get("/chat/support/admin/tickets", { params }),
    assignTicket: (id, agentId) =>
      axiosInstance.put(`/chat/support/admin/tickets/${id}/assign`, {
        agentId,
      }),
    escalateTicket: (id, priority) =>
      axiosInstance.put(`/chat/support/admin/tickets/${id}/escalate`, {
        priority,
      }),
    closeTicket: (id, resolution) =>
      axiosInstance.put(`/chat/support/admin/tickets/${id}/close`, {
        resolution,
      }),
  },
};

//
// 🔹 Auth API (Legacy - kept for backward compatibility)
//
export const authAPI = {
  login: (credentials) => axiosInstance.post("/auth/login", credentials),
  register: (userData) => axiosInstance.post("/auth/register", userData),
  getMe: () => axiosInstance.get("/auth/me"),

  // Token Management
  refreshToken: (refreshToken) =>
    axiosInstance.post("/auth/refresh", { refreshToken }),

  // Password Recovery
  forgotPassword: (email) =>
    axiosInstance.post("/auth/forgot-password", { email }),
  resetPassword: (data) => axiosInstance.post("/auth/reset-password", data),

  // Email Verification
  verifyEmail: (token) => axiosInstance.post("/auth/verify-email", { token }),
  resendVerification: (email) =>
    axiosInstance.post("/auth/resend-verification", { email }),

  // Social Login (handled by redirects to backend OAuth endpoints)
  googleLogin: () => (window.location.href = `${API_BASE_URL}/auth/google`),
  facebookLogin: () => (window.location.href = `${API_BASE_URL}/auth/facebook`),
  githubLogin: () => (window.location.href = `${API_BASE_URL}/auth/github`),

  // Server Health Check
  healthCheck: () =>
    axiosInstance.get("/health").catch(() => ({
      data: { success: false, message: "Server not responding" },
    })),
};

//
// 🔹 Poetry API
//
export const poetryAPI = {
  // Poem CRUD operations
  getAllPoems: (params = {}) => axiosInstance.get("/poems", { params }),
  getMyPoems: (params = {}) => axiosInstance.get("/poems/my-poems", { params }),
  getPoemById: (id) => axiosInstance.get(`/poems/${id}`),
  createPoem: (poemData) => axiosInstance.post("/poems", poemData),
  updatePoem: (id, poemData) => axiosInstance.put(`/poems/${id}`, poemData),
  deletePoem: (id) => axiosInstance.delete(`/poems/${id}`),

  // Poem interactions
  likePoem: (id) => axiosInstance.post(`/poems/${id}/like`),
  addComment: (id, commentData) =>
    axiosInstance.post(`/poems/${id}/comments`, commentData),

  // Search and filters
  searchPoems: (query, filters = {}) =>
    axiosInstance.get("/poems", {
      params: { search: query, ...filters },
    }),

  // Enhanced search operations
  search: {
    // Unified search endpoint
    unified: (searchData) => axiosInstance.post("/search", searchData),

    // Text search with filters
    text: (query, filters = {}) =>
      axiosInstance.post("/search", {
        mode: "text",
        query,
        ...filters,
      }),

    // Voice search
    voice: (transcript, confidence, filters = {}) =>
      axiosInstance.post("/search", {
        mode: "voice",
        transcript,
        confidence,
        ...filters,
      }),

    // Image search with OCR
    image: (extractedText, ocrConfidence, filters = {}) =>
      axiosInstance.post("/search", {
        mode: "image",
        extractedText,
        ocrConfidence,
        ...filters,
      }),

    // Fuzzy search for typos
    fuzzy: (query, threshold = 0.4, filters = {}) =>
      axiosInstance.post("/search", {
        mode: "fuzzy",
        query,
        threshold,
        ...filters,
      }),

    // Get search suggestions
    suggestions: (query) =>
      axiosInstance.get("/search/suggestions", {
        params: { query },
      }),
  },

  // Poet operations
  getAllPoets: () => axiosInstance.get("/poets"),
  getPoetById: (id) => axiosInstance.get(`/poets/${id}`),
  createPoet: (poetData) => axiosInstance.post("/poets", poetData),

  // Categories and metadata
  getCategories: () => axiosInstance.get("/categories"),
  getPoemStats: () => axiosInstance.get("/poems/stats"),

  // Missing functions for dashboard
  getSubmissions: (params = {}) =>
    axiosInstance.get("/poems/submissions", { params }),
  getContests: (params = {}) => axiosInstance.get("/contests", { params }),

  // Admin approval functions
  getPendingPoems: (params = {}) =>
    axiosInstance.get("/poems/pending", { params }),
  approvePoem: (id) => axiosInstance.put(`/poems/${id}/approve`),
  rejectPoem: (id, reason) =>
    axiosInstance.put(`/poems/${id}/reject`, { reason }),

  // Rating and review functions
  addRating: (id, ratingData) =>
    axiosInstance.post(`/poems/${id}/rating`, ratingData),
  getRatings: (id, params = {}) =>
    axiosInstance.get(`/poems/${id}/ratings`, { params }),

  // Bookmark/Favorites functions
  toggleBookmark: (id) => axiosInstance.post(`/poems/${id}/bookmark`),
  getBookmarkedPoems: async (params = {}) => {
    try {
      return await axiosInstance.get("/poems/bookmarks", { params });
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
  incrementView: (id) => axiosInstance.post(`/poems/${id}/view`),

  // Privacy functions
  togglePrivacy: (id) => axiosInstance.patch(`/poems/${id}/privacy`),

  // Recommendations
  getRecommendations: (params = {}) =>
    axiosInstance.get("/poems/recommendations", { params }),
};

//
// 🔹 Poet API
//
export const poetAPI = {
  // Get all poets with filtering and pagination
  getAllPoets: (params = {}) => axiosInstance.get("/poets", { params }),
  getPoetById: (id) => axiosInstance.get(`/poets/${id}`),
  getPoetProfile: (id) => axiosInstance.get(`/poets/${id}/profile`),
  getPoetPoems: (id, params = {}) =>
    axiosInstance.get(`/poets/${id}/poems`, { params }),

  // Search poets
  searchPoets: (query, filters = {}) =>
    axiosInstance.get("/poets", {
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
      return await axiosInstance.post("/search/text", {
        query,
        useAI: true, // Enable AI enhancement
        limit: 50,
        page: 1,
        ...filters,
      });
    } catch (error) {
      console.warn("🔍 Text search failed, trying basic search");
      // Fallback to basic search without AI
      return await axiosInstance.post("/search/text", {
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
    axiosInstance.post("/search/fuzzy", {
      query,
      limit,
    }),

  // Voice Search with transcription improvement
  voiceSearch: async (transcribedText, confidence = 0) => {
    try {
      return await axiosInstance.post("/search/voice", {
        transcribedText,
        confidence,
      });
    } catch (error) {
      console.warn("🎤 Voice search failed, falling back to text search");
      // Fallback to text search
      return await axiosInstance.post("/search/text", {
        query: transcribedText,
        useAI: false,
        limit: 30,
      });
    }
  },

  // Image Search with OCR and text analysis
  imageSearch: async (image) => {
    try {
      return await axiosInstance.post("/search/image", { image });
    } catch (error) {
      console.error("📷 Image search failed:", error);
      throw error;
    }
  },

  // Advanced Search with multiple filters
  advancedSearch: (searchParams) =>
    axiosInstance.post("/search/advanced", searchParams),

  // AI-powered Smart Suggestions
  getSmartSuggestions: async (partialQuery) => {
    try {
      return await axiosInstance.post("/search/suggestions", { partialQuery });
    } catch (error) {
      console.warn("💡 Smart suggestions failed");
      return { data: { success: false, suggestions: [] } };
    }
  },

  // Legacy text search (for backward compatibility)
  searchPoems: (query, filters = {}) =>
    axiosInstance.get("/poems", {
      params: { search: query, ...filters },
    }),
};

//
// 🔹 Contest API
//
export const contestAPI = {
  // Contest CRUD
  getAllContests: (params = {}) => axiosInstance.get("/contests", { params }),
  getContestById: (id) => axiosInstance.get(`/contests/${id}`),
  createContest: (contestData) => axiosInstance.post("/contests", contestData),
  updateContest: (id, contestData) =>
    axiosInstance.put(`/contests/${id}`, contestData),
  deleteContest: (id) => axiosInstance.delete(`/contests/${id}`),

  // Contest Management
  participateInContest: (id, poemId) =>
    axiosInstance.post(`/contests/${id}/participate`, { poemId }),
  voteForSubmission: (id, participantId, rating) =>
    axiosInstance.post(`/contests/${id}/vote`, { participantId, rating }),
  getContestLeaderboard: (id) =>
    axiosInstance.get(`/contests/${id}/leaderboard`),
  getContestParticipants: (id) =>
    axiosInstance.get(`/contests/${id}/participants`),

  // Contest Status Management (Admin)
  activateContest: (id) => axiosInstance.put(`/contests/${id}/activate`),
  completeContest: (id) => axiosInstance.put(`/contests/${id}/complete`),
  cancelContest: (id) => axiosInstance.put(`/contests/${id}/cancel`),
  announceWinners: (id, winners) =>
    axiosInstance.put(`/contests/${id}/winners`, { winners }),
};

//
// 🔹 Admin API
//
export const adminAPI = {
  // Dashboard
  getDashboardStats: () => axiosInstance.get("/admin/dashboard/stats"),
  getAnalytics: (period = "30d") =>
    axiosInstance.get(`/admin/analytics?period=${period}`),

  // Users Management
  getAllUsers: (params = {}) => axiosInstance.get("/admin/users", { params }),
  getUserById: (id) => axiosInstance.get(`/admin/users/${id}`),
  updateUser: (id, userData) =>
    axiosInstance.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => axiosInstance.delete(`/admin/users/${id}`),
  bulkUpdateUsers: (userIds, updateData) =>
    axiosInstance.put("/admin/users/bulk", { userIds, updateData }),
  exportUsers: (format = "csv", filters = {}) =>
    axiosInstance.get("/admin/users/export", {
      params: { format, ...filters },
      responseType: "blob",
    }),

  // User Approval System
  approveUser: (id, approvalData = {}) =>
    axiosInstance.put(`/admin/users/${id}/approve`, {
      approved: true,
      approvedBy: approvalData.approvedBy,
      approvedReason: approvalData.approvedReason,
    }),
  rejectUser: (id, rejectionData = {}) =>
    axiosInstance.put(`/admin/users/${id}/reject`, {
      rejected: true,
      rejectedBy: rejectionData.rejectedBy,
      rejectedReason: rejectionData.rejectedReason,
    }),
  suspendUser: (id, suspensionData = {}) =>
    axiosInstance.put(`/admin/users/${id}/suspend`, {
      status: "suspended",
      suspendedAt: new Date().toISOString(),
      ...suspensionData,
    }),
  getPendingUsers: (params = {}) =>
    axiosInstance.get("/admin/users/pending", { params }),
  bulkApproveUsers: (userIds) =>
    axiosInstance.put("/admin/users/bulk-approve", { userIds }),

  // Poet Verification
  getPendingPoets: () => axiosInstance.get("/admin/poets/pending"),
  verifyPoet: (id, action, reviewNotes) =>
    axiosInstance.put(`/admin/poets/${id}/verify`, {
      action,
      reviewNotes,
    }),

  // Content Moderation
  getFlaggedContent: (type = "all") =>
    axiosInstance.get(`/admin/content/flagged?type=${type}`),
  moderateContent: (type, id, action, moderationNotes) =>
    axiosInstance.put(`/admin/content/${type}/${id}/moderate`, {
      action,
      moderationNotes,
    }),
  bulkModerateContent: (items, action) =>
    axiosInstance.put("/admin/content/bulk-moderate", { items, action }),

  // System Settings
  getSettings: () => axiosInstance.get("/admin/settings"),
  updateSettings: (settings) => axiosInstance.put("/admin/settings", settings),
  getSystemHealth: () => axiosInstance.get("/admin/system/health"),
  performBackup: () => axiosInstance.post("/admin/system/backup"),
  getBackupHistory: () => axiosInstance.get("/admin/system/backups"),

  // Advanced Analytics
  getUserAnalytics: (period = "30d") =>
    axiosInstance.get(`/admin/analytics/users?period=${period}`),
  getContentAnalytics: (period = "30d") =>
    axiosInstance.get(`/admin/analytics/content?period=${period}`),
  getEngagementAnalytics: (period = "30d") =>
    axiosInstance.get(`/admin/analytics/engagement?period=${period}`),
  exportAnalytics: (type, period = "30d", format = "csv") =>
    axiosInstance.get(`/admin/analytics/${type}/export`, {
      params: { period, format },
      responseType: "blob",
    }),

  // Contest Management
  getAllContests: (params = {}) =>
    axiosInstance.get("/admin/contests", { params }),
  updateContestStatus: (id, status) =>
    axiosInstance.put(`/admin/contests/${id}/status`, { status }),
  getContestAnalytics: (id) =>
    axiosInstance.get(`/admin/contests/${id}/analytics`),
  exportContestData: (id, format = "csv") =>
    axiosInstance.get(`/admin/contests/${id}/export`, {
      params: { format },
      responseType: "blob",
    }),

  // Notification Management
  sendBulkNotification: (recipients, notification) =>
    axiosInstance.post("/admin/notifications/bulk", {
      recipients,
      notification,
    }),
  getNotificationHistory: (params = {}) =>
    axiosInstance.get("/admin/notifications/history", { params }),

  // Legacy (for backward compatibility)
  getStats: () => axiosInstance.get("/admin/dashboard/stats"),
  getAllPoems: () => axiosInstance.get("/admin/poems"),
  approvePoem: (id) => axiosInstance.put(`/admin/poems/${id}/approve`),
  deletePoem: (id) => axiosInstance.delete(`/admin/poems/${id}`),
  getAllPoets: () => axiosInstance.get("/admin/poets"),
  approvePoet: (id) => axiosInstance.put(`/admin/poets/${id}/approve`),
};

//
// 🔹 Dashboard API
//
export const dashboardAPI = {
  // Poet Dashboard
  getPoetDashboard: () => axiosInstance.get("/dashboard/poet"),
  getFollowers: () => axiosInstance.get("/dashboard/followers"),
  getFollowing: () => axiosInstance.get("/dashboard/following"),
  updateProfile: (profileData) =>
    axiosInstance.put("/auth/profile", profileData),
  uploadProfileImage: (formData) =>
    axiosInstance.post("/auth/profile/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  exportPoetData: () => axiosInstance.get("/dashboard/export"),

  // Notification Settings
  updateNotificationSettings: (notificationSettings) =>
    axiosInstance.put("/auth/profile/notifications", { notificationSettings }),
  sendTestEmail: () => axiosInstance.post("/auth/profile/test-email"),

  // User Statistics & Activity
  getUserStats: () => axiosInstance.get("/auth/user-stats"),
  getUserActivity: () => axiosInstance.get("/auth/user-activity"),

  // Admin Dashboard
  getAdminDashboard: () => axiosInstance.get("/dashboard/admin"),
  getModerationQueue: () => axiosInstance.get("/dashboard/moderation-queue"),
  approvePoem: (id) =>
    axiosInstance.patch(`/dashboard/admin/poems/${id}/approve`),
  rejectPoem: (id, reason) =>
    axiosInstance.patch(`/dashboard/admin/poems/${id}/reject`, { reason }),
  toggleUserStatus: (id) =>
    axiosInstance.patch(`/dashboard/admin/users/${id}/toggle-status`),
};

//
// 🔹 Rekhta API (External Classical Poets)
//
export const rekhtaAPI = {
  // Get list of supported classical poets
  getSupportedPoets: () => axiosInstance.get("/rekhta/poets"),

  // Get poems by poet from Rekhta
  getPoetPoems: (poetSlug, params = {}) =>
    axiosInstance.get(`/rekhta/${poetSlug}`, { params }),

  // Get poet biography from Rekhta
  getPoetBiography: (poetSlug) =>
    axiosInstance.get(`/rekhta/${poetSlug}/biography`),

  // Search poems in Rekhta
  searchPoems: (query, params = {}) =>
    axiosInstance.get("/rekhta/search", {
      params: { q: query, ...params },
    }),

  // Get poem details from Rekhta
  getPoemDetails: (poetSlug, poemId) =>
    axiosInstance.get(`/rekhta/${poetSlug}/poems/${poemId}`),
};

//
// 🔹 OpenAI API for AI features
//
export const openaiAPI = {
  // Generate text using OpenAI
  generateText: async (options) => {
    try {
      return await axiosInstance.post("/openai/generate", options);
    } catch (error) {
      console.error("OpenAI text generation failed:", error);
      throw error;
    }
  },

  // Summarize biography
  summarizeBiography: async (biography) => {
    try {
      return await axiosInstance.post("/openai/summarize", {
        text: biography,
        type: "biography",
      });
    } catch (error) {
      console.error("Biography summarization failed:", error);
      throw error;
    }
  },

  // Translate text to English
  translateToEnglish: async (text) => {
    try {
      return await axiosInstance.post("/openai/translate", {
        text,
        targetLanguage: "english",
      });
    } catch (error) {
      console.error("Translation failed:", error);
      throw error;
    }
  },

  // Translate poem with context
  translatePoem: async (poem, metadata) => {
    try {
      return await axiosInstance.post("/openai/translate-poem", {
        poem,
        metadata,
      });
    } catch (error) {
      console.error("Poem translation failed:", error);
      throw error;
    }
  },

  // Get related poems using AI
  getRelatedPoems: async (poem) => {
    try {
      return await axiosInstance.post("/openai/related-poems", { poem });
    } catch (error) {
      console.error("Related poems search failed:", error);
      throw error;
    }
  },

  // Generate search suggestions
  generateSearchSuggestions: async (query) => {
    try {
      return await axiosInstance.post("/openai/search-suggestions", { query });
    } catch (error) {
      console.error("Search suggestions failed:", error);
      throw error;
    }
  },
};

//
// 🔹 Test API Connection
//
export const checkAPIStatus = async () => {
  try {
    const response = await axiosInstance.get("/health");
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

//
// 🔹 Default export (main API object)
//
export default api;
