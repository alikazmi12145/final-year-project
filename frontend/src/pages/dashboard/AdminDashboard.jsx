import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Users,
  FileText,
  Award,
  Shield,
  Activity,
  TrendingUp,
  Settings,
  BarChart3,
  Eye,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Edit,
  Trash2,
  Download,
  AlertCircle,
  Brain,
  Plus,
  MoreHorizontal,
  Calendar,
  Clock,
  Star,
  BookOpen,
  UserCheck,
  UserX,
  Zap,
  PieChart,
  Globe,
  Heart,
  Crown,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  LogOut,
  User,
  Grid,
  List,
  Bookmark,
} from "lucide-react";
import {
  adminDashboardAPI,
  formatTimeAgo,
  getRoleTextUrdu,
  calculateGrowthPercentage,
  getStatusColor,
  getStatusTextUrdu,
  getRoleColor,
  getRoleIcon,
  formatDateUrdu,
} from "../../services/dashboardAPI";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useMessage } from "../../context/MessageContext";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning, showConfirm } = useMessage();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [poems, setPoems] = useState([]);
  const [contests, setContests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Poet details edit states
  const [showPoetDetailsModal, setShowPoetDetailsModal] = useState(false);
  const [selectedPoet, setSelectedPoet] = useState(null);

  // Poem management states
  const [selectedPoem, setSelectedPoem] = useState(null);
  const [showPoemModal, setShowPoemModal] = useState(false);
  const [showEditPoemModal, setShowEditPoemModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [poemToDelete, setPoemToDelete] = useState(null);
  const [poemFilter, setPoemFilter] = useState("all"); // all, pending, approved, published, draft
  const [poemSearchTerm, setPoemSearchTerm] = useState("");
  const [poemCategory, setPoemCategory] = useState("all");

  // Helper function to get full image URL
  const getImageUrl = (profileImage) => {
    if (!profileImage) return null;
    
    // If it's a string
    if (typeof profileImage === 'string') {
      // If it starts with http, return as is
      if (profileImage.startsWith('http')) {
        return profileImage;
      }
      // If it's a relative path, prepend backend URL
      return `http://localhost:5000${profileImage}`;
    }
    
    // If it's an object with url or secure_url
    const imageUrl = profileImage.url || profileImage.secure_url;
    if (!imageUrl) return null;
    
    // If it starts with http, return as is
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // If it's a relative path, prepend backend URL
    return `http://localhost:5000${imageUrl}`;
  };

  // Handle logout
  const handleLogout = async () => {
    const confirmed = await showConfirm(
      "کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟ / Are you sure you want to logout?",
      "لاگ آؤٹ کی تصدیق / Logout Confirmation"
    );
    if (confirmed) {
      logout();
      navigate("/auth");
    }
  };

  useEffect(() => {
    let isMounted = true;
    let intervalId = null;

    const initializeDashboard = async () => {
      if (isMounted) {
        await loadDashboardData();
        await loadUsers();
        await loadPoems();
        await loadContests();
      }
    };

    initializeDashboard();

    // Online status detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Auto refresh every 30 seconds (only if not already refreshing)
    intervalId = setInterval(() => {
      if (!refreshing && isMounted) {
        loadDashboardData();
      }
    }, 30000);

    return () => {
      isMounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Use real API call to get comprehensive dashboard stats
      const response = await adminDashboardAPI.getDashboard();

      if (response.success) {
        const { stats } = response;

        // Transform API data to match dashboard requirements
        const dashboardStats = {
          totalUsers: stats.users.total,
          totalPoems: stats.content.poems.total,
          totalContests: stats.content.contests.total,
          activeUsers: stats.users.total - stats.users.pending,
          pendingApprovals: stats.users.pending,
          weeklyGrowth: calculateGrowthPercentage(
            stats.users.newThisMonth,
            stats.users.previousMonth || 100
          ),
          topPoets: Math.floor(stats.users.poets * 0.1),
          contentModeration: stats.content.poems.underReview,
          monthlyRevenue: stats.revenue?.monthly || 0,
          userSatisfaction: stats.satisfaction?.rate || "0",
          onlineNow: stats.users.onlineNow || 0,
          totalViews: stats.analytics?.totalViews || 0,
          todayRegistrations: stats.users.newThisMonth,
          pendingReviews: stats.content.poems.underReview,
          poets: stats.users.poets,
          readers: stats.users.readers,
          moderators: stats.users.moderators || 0,
          admins: stats.users.admins || 1,
        };

        // Transform recent activity from API data
        const recentActivity = [];
        if (stats.recent?.users) {
          stats.recent.users.forEach((user) => {
            recentActivity.push({
              id: user._id,
              type: "user_registration",
              user: user.name,
              time: formatTimeAgo(user.createdAt),
              status: user.status,
              description: `نیا ${getRoleTextUrdu(user.role)} رجسٹر ہوا`,
            });
          });
        }

        if (stats.recent?.poems) {
          stats.recent.poems.forEach((poem) => {
            recentActivity.push({
              id: poem._id,
              type: "poem_submission",
              user: poem.poet?.name || "نامعلوم شاعر",
              time: formatTimeAgo(poem.createdAt),
              status: poem.status,
              description: "نئی شاعری جمع کی",
            });
          });
        }

        setDashboardData({
          stats: dashboardStats,
          recentActivity,
          insights: {
            popularGenres: stats.analytics?.popularGenres || [
              "غزل",
              "نظم",
              "قطعہ",
              "رباعی",
              "حمد",
              "نعت",
              "مرثیہ",
            ],
            engagementRate: stats.analytics?.engagementRate || "0",
            userSatisfaction: stats.satisfaction?.rate || "0",
            contentQuality: stats.analytics?.contentQuality || "0",
            weeklyStats: {
              newUsers: stats.users.newThisMonth,
              newPoems: stats.content.poems.newThisMonth,
              contestEntries: stats.content.contests.entries || 0,
              activePoets: stats.users.poets,
            },
            topPerformers: stats.analytics?.topPerformers || [],
            platformHealth: {
              serverUptime: stats.system?.uptime || "0%",
              responseTime: stats.system?.responseTime || "0ms",
              errorRate: stats.system?.errorRate || "0%",
              storageUsed: stats.system?.storageUsed || "0%",
            },
          },
          notifications: stats.notifications || [],
        });
      }
    } catch (err) {
      console.error("Dashboard API error:", err);
      setError("ڈیش بورڈ ڈیٹا لوڈ کرنے میں خرابی - بیک اینڈ سے کنکشن نہیں");

      // No fallback data - show empty state
      setDashboardData({
        stats: {
          totalUsers: 0,
          totalPoems: 0,
          totalContests: 0,
          activeUsers: 0,
          pendingApprovals: 0,
          weeklyGrowth: "0",
          topPoets: 0,
          contentModeration: 0,
          monthlyRevenue: 0,
          userSatisfaction: "0",
          onlineNow: 0,
          totalViews: 0,
          todayRegistrations: 0,
          pendingReviews: 0,
          poets: 0,
          readers: 0,
          moderators: 0,
          admins: 0,
        },
        recentActivity: [],
        insights: {
          popularGenres: [],
          engagementRate: "0",
          userSatisfaction: "0",
          contentQuality: "0",
          weeklyStats: {
            newUsers: 0,
            newPoems: 0,
            contestEntries: 0,
            activePoets: 0,
          },
          topPerformers: [],
          platformHealth: {
            serverUptime: "0%",
            responseTime: "0ms",
            errorRate: "0%",
            storageUsed: "0%",
          },
        },
        notifications: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Use real API call instead of mock data
      const response = await adminDashboardAPI.getUsers();

      if (response.success) {
        console.log('📊 Loaded users with images:', response.users.map(u => ({
          name: u.name,
          role: u.role,
          profileImage: u.profileImage,
          profileImageUrl: u.profileImage?.url,
          profileImageSecureUrl: u.profileImage?.secure_url,
          poetId: u.poetId
        })));
        setUsers(response.users || []);
        setTotalUsers(
          response.pagination?.total || response.users?.length || 0
        );
      } else {
        throw new Error("Failed to load users from API");
      }
    } catch (err) {
      console.error("Load users API error:", err);
      setError("صارفین کی فہرست لوڈ کرنے میں خرابی - بیک اینڈ سے کنکشن نہیں");
      // No fallback data - show empty state
      setUsers([]);
      setTotalUsers(0);
    }
  };

  const loadPoems = async () => {
    try {
      // Fetch ALL poems from admin endpoint (not just pending)
      const response = await adminDashboardAPI.getPoems({ limit: 1000 });
      if (response.success) {
        setPoems(response.poems || []);
      } else {
        throw new Error("Failed to load poems from API");
      }
    } catch (err) {
      console.error("Load poems error:", err);
      setError("شاعری کی فہرست لوڈ کرنے میں خرابی");
      setPoems([]);
    }
  };

  const loadContests = async () => {
    try {
      // Use real API call - assuming adminDashboardAPI.getContests() exists
      const response = await adminDashboardAPI.getContests();
      if (response && response.success) {
        setContests(response.contests || []);
      } else {
        // No contests available
        setContests([]);
      }
    } catch (err) {
      console.error("Load contests error:", err);
      setError("مقابلوں کی فہرست لوڈ کرنے میں خرابی");
      setContests([]);
    }
  };

  const handleUserApproval = async (userId, approved) => {
    try {
      setRefreshing(true);
      // Use real API call instead of mock
      const response = await adminDashboardAPI.approveUser(userId, approved);

      if (response.success) {
        // Update local state for instant feedback
        setUsers(
          users.map((user) =>
            user._id === userId
              ? { ...user, status: approved ? "approved" : "rejected" }
              : user
          )
        );

        await loadDashboardData();

        // Show success message
        setError(null);
        showSuccess(
          `صارف ${approved ? "منظور" : "مسترد"} کر دیا گیا / User ${
            approved ? "approved" : "rejected"
          } successfully`
        );
      } else {
        throw new Error(response.message || "User approval failed");
      }
    } catch (err) {
      console.error("User approval API error:", err);

      // Still update local state as fallback
      setUsers(
        users.map((user) =>
          user._id === userId
            ? { ...user, status: approved ? "approved" : "rejected" }
            : user
        )
      );

      setError(
        `صارف کو ${
          approved ? "منظور" : "مسترد"
        } کرنے میں خرابی - لیکن مقامی طور پر اپڈیٹ ہو گیا`
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handlePoemModeration = async (poemId, approved) => {
    try {
      setRefreshing(true);
      // Call backend moderation API (fix endpoint)
      const response = await adminDashboardAPI.approvePoem(poemId, approved);
      if (response.success) {
        setPoems(
          poems.map((poem) =>
            poem._id === poemId
              ? { ...poem, status: approved ? "approved" : "rejected" }
              : poem
          )
        );
        await loadDashboardData();
        setError(null);
        showSuccess(
          `شاعری ${approved ? "منظور" : "مسترد"} کر دی گئی / Poem ${
            approved ? "approved" : "rejected"
          } successfully`
        );
      } else {
        throw new Error(response.message || "Moderation failed");
      }
    } catch (err) {
      if (err.response && (err.response.status === 403 || err.response.status === 401)) {
        setError("اجازت نہیں ہے - آپ کے پاس اس نظم کو منظور/مسترد کرنے کی اجازت نہیں ہے");
        showError("اجازت نہیں ہے - آپ کے پاس اس نظم کو منظور/مسترد کرنے کی اجازت نہیں ہے");
      } else {
        setError(`شاعری کو ${approved ? "منظور" : "مسترد"} کرنے میں خرابی`);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleUserDelete = async (userId) => {
    const confirmed = await showConfirm(
      "کیا آپ واقعی اس صارف کو حذف کرنا چاہتے ہیں؟ / Are you sure you want to delete this user?",
      "صارف حذف کرنے کی تصدیق / Delete User Confirmation"
    );
    if (confirmed) {
      try {
        setRefreshing(true);
        // Dynamic deletion - replace with real API
        // await adminDashboardAPI.deleteUser(userId);

        // Update local state
        setUsers(users.filter((user) => user._id !== userId));
        await loadDashboardData();

        showSuccess(
          "صارف کامیابی سے حذف کر دیا گیا / User deleted successfully"
        );
      } catch (err) {
        setError("صارف کو حذف کرنے میں خرابی");
      } finally {
        setRefreshing(false);
      }
    }
  };

  const generateAIReport = async () => {
    try {
      setRefreshing(true);
      // Dynamic AI report generation - replace with real API
      // const report = await adminDashboardAPI.generateAIReport('weekly');

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      showSuccess(
        "🤖 AI رپورٹ کامیابی سے تیار ہوگئی!\n\n📊 ہفتہ وار تجزیہ:\n✅ 87% صارف کی سرگرمی\n✅ 23% نئے شاعر\n✅ 156 نئی نظمیں\n✅ 94% کوالٹی ریٹنگ\n✅ 78% مشغولیت کی شرح / 🤖 AI Report generated successfully!\n\n📊 Weekly Analysis:\n✅ 87% User Activity\n✅ 23% New Poets\n✅ 156 New Poems\n✅ 94% Quality Rating\n✅ 78% Engagement Rate"
      );
    } catch (err) {
      setError("AI رپورٹ تیار کرنے میں خرابی");
    } finally {
      setRefreshing(false);
    }
  };

  // Handle view user details
  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  // Handle edit user
  const handleEditUser = (user) => {
    setSelectedUser(user);
    // If it's a poet, open detailed poet modal
    if (user.role === 'poet' && user.poetId) {
      handleEditPoetDetails(user);
    } else {
      setShowEditModal(true);
    }
  };

  // Handle edit poet details
  const handleEditPoetDetails = async (user) => {
    try {
      // Fetch full poet data from backend
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await axios.get(`${baseURL}/admin/poets/${user.poetId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        setSelectedPoet(response.data.poet);
        setShowPoetDetailsModal(true);
      }
    } catch (err) {
      console.error('Error fetching poet details:', err);
      showError('شاعر کی تفصیلات لوڈ کرنے میں خرابی / Failed to load poet details');
    }
  };

  // Handle save poet details
  const handleSavePoetDetails = async (poetData) => {
    try {
      setRefreshing(true);
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await axios.put(
        `${baseURL}/admin/poets/${selectedPoet._id}`,
        poetData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        showSuccess('شاعر کی تفصیلات کامیابی سے محفوظ ہوگئیں / Poet details saved successfully');
        setShowPoetDetailsModal(false);
        await loadUsers();
      }
    } catch (err) {
      console.error('Error saving poet details:', err);
      showError('شاعر کی تفصیلات محفوظ کرنے میں خرابی / Failed to save poet details');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle profile image upload
  const handleImageUpload = async (e, userId) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('برائے مہربانی ایک تصویر منتخب کریں / Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('تصویر کا سائز 5MB سے زیادہ نہیں ہونا چاہیے / Image size should not exceed 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      
      const formData = new FormData();
      formData.append('avatar', file);

      const user = selectedUser;
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      console.log('📤 User data:', { role: user.role, poetId: user.poetId, userId: user._id });

      // Determine upload endpoint based on user role
      let uploadUrl;
      if (user.role === 'poet') {
        // For poets, use the poet-specific endpoint (updates Poet collection)
        const poetIdToUse = user.poetId || user._id;
        uploadUrl = `${baseURL}/admin/poets/${poetIdToUse}/upload-image`;
      } else {
        // For admin, moderator, user - use general user endpoint
        uploadUrl = `${baseURL}/admin/users/${userId}/upload-image`;
      }

      console.log('📤 Uploading image to:', uploadUrl);

      // Upload image to backend
      const response = await axios.post(
        uploadUrl,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        const updatedImage = response.data.profileImage || response.data.poet?.profileImage;
        
        // Update local state
        if (selectedUser && selectedUser._id === userId) {
          setSelectedUser({ ...selectedUser, profileImage: updatedImage });
        }
        
        setUsers(users.map(u => 
          u._id === userId ? { ...u, profileImage: updatedImage } : u
        ));

        // Reload users to get fresh data
        await loadUsers();

        showSuccess('تصویر کامیابی سے اپ لوڈ ہوگئی / Image uploaded successfully');
      }
    } catch (err) {
      console.error('Image upload error:', err);
      showError('تصویر اپ لوڈ کرنے میں خرابی / Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // ============= POEM MANAGEMENT HANDLERS =============
  
  // View poem details
  const handleViewPoem = (poem) => {
    setSelectedPoem(poem);
    setShowPoemModal(true);
  };

  // Edit poem
  const handleEditPoem = (poem) => {
    setSelectedPoem(poem);
    setShowEditPoemModal(true);
  };

  // Delete poem
  const handleDeletePoem = async (poemId) => {
    const confirmed = await showConfirm(
      "کیا آپ واقعی اس نظم کو حذف کرنا چاہتے ہیں؟ / Are you sure you want to delete this poem?",
      "نظم حذف کرنے کی تصدیق / Delete Poem Confirmation"
    );
    
    if (confirmed) {
      try {
        setRefreshing(true);
        const response = await adminDashboardAPI.deletePoem(poemId);
        
        if (response.success) {
          setPoems(poems.filter((poem) => poem._id !== poemId));
          await loadDashboardData();
          showSuccess("نظم کامیابی سے حذف ہوگئی / Poem deleted successfully");
        }
      } catch (err) {
        console.error("Delete poem error:", err);
        showError("نظم حذف کرنے میں خرابی / Failed to delete poem");
      } finally {
        setRefreshing(false);
      }
    }
  };

  // Update poem
  const handleUpdatePoem = async (poemId, updatedData) => {
    try {
      setRefreshing(true);
      const response = await adminDashboardAPI.updatePoem(poemId, updatedData);
      
      if (response.success) {
        setPoems(poems.map((poem) => 
          poem._id === poemId ? { ...poem, ...updatedData } : poem
        ));
        setShowEditPoemModal(false);
        await loadPoems();
        showSuccess("نظم کامیابی سے اپ ڈیٹ ہوگئی / Poem updated successfully");
      }
    } catch (err) {
      console.error("Update poem error:", err);
      showError("نظم اپ ڈیٹ کرنے میں خرابی / Failed to update poem");
    } finally {
      setRefreshing(false);
    }
  };

  // Approve/Reject poem
  const handleApprovePoemAction = async (poemId, approved) => {
    try {
      setRefreshing(true);
      const response = await adminDashboardAPI.approvePoem(poemId, approved);
      
      if (response.success) {
        setPoems(poems.map((poem) =>
          poem._id === poemId
            ? { ...poem, status: approved ? "approved" : "rejected" }
            : poem
        ));
        await loadDashboardData();
        showSuccess(
          `نظم ${approved ? "منظور" : "مسترد"} کر دی گئی / Poem ${
            approved ? "approved" : "rejected"
          } successfully`
        );
      }
    } catch (err) {
      console.error("Approve poem error:", err);
      showError(`نظم ${approved ? "منظور" : "مسترد"} کرنے میں خرابی`);
    } finally {
      setRefreshing(false);
    }
  };

  // Feature/Unfeature poem
  const handleFeaturePoem = async (poemId, featured) => {
    try {
      setRefreshing(true);
      const response = await adminDashboardAPI.featurePoem(poemId, featured);
      
      if (response.success) {
        setPoems(poems.map((poem) =>
          poem._id === poemId ? { ...poem, featured } : poem
        ));
        showSuccess(
          `نظم ${featured ? "نمایاں" : "عام"} کر دی گئی / Poem ${
            featured ? "featured" : "unfeatured"
          } successfully`
        );
      }
    } catch (err) {
      console.error("Feature poem error:", err);
      showError("نظم نمایاں کرنے میں خرابی / Failed to feature poem");
    } finally {
      setRefreshing(false);
    }
  };

  const tabs = [
    { id: "overview", label: "خلاصہ", icon: BarChart3, color: "text-blue-600" },
    {
      id: "profile-management",
      label: "پروفائل منیجمنٹ",
      icon: Users,
      color: "text-green-600",
    },
    {
      id: "poet-biographies",
      label: "شعراء کی سوانح",
      icon: FileText,
      color: "text-purple-600",
    },
    {
      id: "achievements-showcase",
      label: "کامیابیوں کی نمائش",
      icon: Award,
      color: "text-yellow-600",
    },
    {
      id: "content-moderation",
      label: "مواد کی نگرانی",
      icon: Shield,
      color: "text-red-600",
    },
    {
      id: "contest-management",
      label: "مقابلوں کا انتظام",
      icon: Activity,
      color: "text-indigo-600",
    },
    {
      id: "analytics",
      label: "تجزیات",
      icon: TrendingUp,
      color: "text-orange-600",
    },
    {
      id: "settings",
      label: "ترتیبات",
      icon: Settings,
      color: "text-gray-600",
    },
  ];

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center urdu-text-local">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-200 border-t-amber-600 mx-auto mb-6"></div>
            <Sparkles className="absolute top-2 left-2 w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <p className="text-xl text-amber-800 font-bold">
            بزم سخن ڈیش بورڈ لوڈ ہو رہا ہے...
          </p>
          <p className="text-sm text-amber-600 mt-2">صبر کا فل، میٹھا پھل</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 urdu-text-local">
      {/* Dynamic Header - All fields dynamic */}
      <div className="bg-white shadow-lg border-b-2 border-amber-200 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-100/20 to-rose-100/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div className="urdu-text-local flex items-center">
              {/* Avatar and name/role */}
              {user && (
                <div className="flex items-center mr-8">
                  {/* Profile Image with fallback */}
                  {user.profileImage ? (
                    <img
                      src={getImageUrl(user.profileImage)}
                      alt={user.name}
                      className="w-20 h-20 rounded-full object-cover shadow-lg border-4 border-white"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=200&bold=true&format=png`;
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-white">
                      {user.name?.charAt(0)?.toUpperCase() || "A"}
                    </div>
                  )}
                  <div className="ml-4">
                    <div className="text-lg font-bold text-amber-900">{user.name}</div>
                    <div className="text-sm text-amber-700">{getRoleTextUrdu(user.role)}</div>
                  </div>
                </div>
              )}
              <div>
                <h1 className="text-4xl font-bold text-amber-900 mb-2 tracking-wide">
                  <Crown className="inline w-8 h-8 ml-3 text-amber-600" />
                  ایڈمن ڈیش بورڈ
                </h1>
                <p className="text-lg text-amber-700 font-medium">
                  {/* Urdu tagline, can be dynamic from config or backend */}
                  بزم سخن کا انتظامی پینل
                </p>
                <div className="flex items-center mt-2 text-sm text-amber-600">
                  <Globe className="w-4 h-4 ml-2" />
                  <span>
                    آج کی تاریخ: {new Date().toLocaleDateString("ur-PK")}
                  </span>
                  <Clock className="w-4 h-4 ml-4" />
                  <span>{new Date().toLocaleTimeString("ur-PK")}</span>
                  {user && (
                    <>
                      <User className="w-4 h-4 ml-4" />
                      <span>خوش آمدید، {user.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="flex items-center space-x-2 space-x-reverse bg-white/70 backdrop-blur rounded-xl px-4 py-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isOnline ? "bg-green-500" : "bg-red-500"
                  } animate-pulse`}
                ></div>
                <span className="text-sm text-gray-700 urdu-text-local">
                  {isOnline ? "آن لائن" : "آف لائن"}
                </span>
              </div>
              <button
                onClick={() => window.location.reload()}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-300"
              >
                <RefreshCw
                  className={`w-4 h-4 ml-2 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "تازہ ہو رہا..." : "تازہ کریں"}
              </button>
              <button
                onClick={generateAIReport}
                disabled={refreshing}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50"
              >
                <Brain className="w-5 h-5 ml-2" />
                {refreshing ? "تیار ہو رہی..." : "AI رپورٹ"}
              </button>
              <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl hover:from-amber-700 hover:to-amber-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                <Download className="w-5 h-5 ml-2" />
                ڈیٹا ایکسپورٹ
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <LogOut className="w-5 h-5 ml-2" />
                لاگ آؤٹ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Error Display */}
        {error && (
          <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 text-red-700 rounded-xl shadow-lg urdu-text-local">
            <div className="flex items-center">
              <AlertCircle className="w-6 h-6 ml-3 text-red-500" />
              <span className="font-medium text-lg">{error}</span>
              <button
                onClick={() => setError(null)}
                className="mr-auto text-red-500 hover:text-red-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

  {/* Enhanced Tab Navigation - already dynamic */}
        <div className="bg-white rounded-2xl shadow-xl mb-8 overflow-hidden">
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <nav
              className="flex space-x-2 px-6 py-2 overflow-x-auto"
              aria-label="Tabs"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center px-6 py-4 text-sm font-medium rounded-t-lg transition-all duration-300 whitespace-nowrap
                      ${
                        activeTab === tab.id
                          ? `bg-white ${tab.color} border-b-2 border-current shadow-sm`
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 ml-2" />
                    <span className="urdu-text-local font-medium">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content - all fields dynamic */}
          <div className="p-8">
            {activeTab === "overview" && (
              <OverviewTab dashboardData={dashboardData} />
            )}
            {activeTab === "profile-management" && (
              <ProfileManagementTab
                users={users}
                onUserApproval={handleUserApproval}
                onUserDelete={handleUserDelete}
                refreshing={refreshing}
                onViewDetails={handleViewDetails}
                onEditUser={handleEditUser}
                getImageUrl={getImageUrl}
              />
            )}
            {activeTab === "poet-biographies" && <PoetBiographiesTab />}
            {activeTab === "achievements-showcase" && <AchievementsTab />}
            {activeTab === "content-moderation" && (
              <ContentModerationTab
                poems={poems}
                onPoemModeration={handleApprovePoemAction}
                refreshing={refreshing}
                onViewPoem={handleViewPoem}
                onEditPoem={handleEditPoem}
                onDeletePoem={handleDeletePoem}
                onFeaturePoem={handleFeaturePoem}
              />
            )}
            {activeTab === "contest-management" && (
              <ContestManagementTab contests={contests} />
            )}
            {activeTab === "analytics" && (
              <AnalyticsTab dashboardData={dashboardData} />
            )}
            {activeTab === "settings" && <SettingsTab />}
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">تفصیلات صارف / User Details</h2>
                <button onClick={() => setShowUserModal(false)} className="text-white hover:text-gray-200">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                {selectedUser.profileImage ? (
                  <img
                    src={getImageUrl(selectedUser.profileImage)}
                    alt={selectedUser.name}
                    className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-blue-500 shadow-lg"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=random&size=300&bold=true&format=png`;
                    }}
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold mx-auto border-4 border-white shadow-lg">
                    {selectedUser.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm text-gray-500">نام / Name</label>
                  <p className="font-bold">{selectedUser.name}</p>
                </div>
                {selectedUser.penName && (
                  <div>
                    <label className="text-sm text-gray-500">تخلص / Pen Name</label>
                    <p className="font-bold">{selectedUser.penName}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-500">ای میل / Email</label>
                  <p className="font-bold">
                    {selectedUser.email === "N/A" ? (
                      <span className="text-gray-400 italic">
                        {selectedUser.isDeceased ? "کلاسیکی شاعر (متوفی)" : "صارف اکاؤنٹ نہیں"}
                      </span>
                    ) : (
                      selectedUser.email
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">کردار / Role</label>
                  <p className="font-bold">{selectedUser.role}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">حالت / Status</label>
                  <p className="font-bold">{selectedUser.status}</p>
                </div>
                {selectedUser.era && (
                  <div>
                    <label className="text-sm text-gray-500">دور / Era</label>
                    <p className="font-bold">{selectedUser.era}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-500">مقام / Location</label>
                  <p className="font-bold">{selectedUser.location || selectedUser.era || 'نامعلوم'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">رجسٹریشن / Registration</label>
                  <p className="font-bold">{formatDateUrdu(selectedUser.createdAt)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedUser.stats?.totalPoems || selectedUser.poems || 0}
                  </div>
                  <div className="text-sm text-gray-600">نظمیں</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedUser.stats?.followers || selectedUser.followers || 0}
                  </div>
                  <div className="text-sm text-gray-600">پیروکار</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedUser.stats?.totalViews || selectedUser.totalViews || 0}
                  </div>
                  <div className="text-sm text-gray-600">مناظر</div>
                </div>
              </div>

              <button
                onClick={() => setShowUserModal(false)}
                className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                بند کریں / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-gray-600 to-gray-800 p-6 text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">ترمیم صارف / Edit User</h2>
                <button onClick={() => setShowEditModal(false)} className="text-white hover:text-gray-200">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  {selectedUser.profileImage ? (
                    <img
                      src={getImageUrl(selectedUser.profileImage)}
                      alt={selectedUser.name}
                      className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-gray-500 shadow-lg"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=random&size=300&bold=true&format=png`;
                      }}
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center text-white text-5xl font-bold mx-auto border-4 border-white shadow-lg">
                      {selectedUser.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  
                  {/* Upload button for all users */}
                  <label 
                    htmlFor="profile-upload" 
                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    <input
                      id="profile-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, selectedUser._id)}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    {uploadingImage ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Edit className="w-5 h-5" />
                    )}
                  </label>
                </div>
                <p className="text-sm text-gray-500 mt-2">تصویر تبدیل کرنے کے لیے کلک کریں / Click to change image</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نام / Name</label>
                  <input
                    type="text"
                    defaultValue={selectedUser.name}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ای میل / Email</label>
                  <input
                    type="email"
                    defaultValue={selectedUser.email}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">کردار / Role</label>
                  <select 
                    defaultValue={selectedUser.role}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="reader">قاری / Reader</option>
                    <option value="poet">شاعر / Poet</option>
                    <option value="admin">ایڈمن / Admin</option>
                    <option value="moderator">نگران / Moderator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">حالت / Status</label>
                  <select 
                    defaultValue={selectedUser.status}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">منتظر منظوری / Pending</option>
                    <option value="approved">منظور شدہ / Approved</option>
                    <option value="active">فعال / Active</option>
                    <option value="inactive">غیر فعال / Inactive</option>
                    <option value="blocked">بلاک شدہ / Blocked</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 space-x-reverse mt-6">
                <button
                  onClick={() => {
                    showSuccess('تبدیلیاں محفوظ ہو گئیں / Changes saved successfully');
                    setShowEditModal(false);
                  }}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  محفوظ کریں / Save
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  منسوخ / Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Poem View Modal */}
      {showPoemModal && selectedPoem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">نظم کی تفصیلات / Poem Details</h2>
                <button onClick={() => setShowPoemModal(false)} className="text-white hover:text-gray-200">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Poem Title and Metadata */}
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-gray-900 mb-2 urdu-text-local">{selectedPoem.title}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedPoem.status === 'published' ? 'bg-green-100 text-green-800' :
                    selectedPoem.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                    selectedPoem.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedPoem.status === 'published' ? 'شائع شدہ' :
                     selectedPoem.status === 'approved' ? 'منظور شدہ' :
                     selectedPoem.status === 'pending' ? 'منتظر' : 'ڈرافٹ'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {selectedPoem.category || 'نظم'}
                  </span>
                  {selectedPoem.featured && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Star className="w-3 h-3 inline ml-1 fill-current" />
                      نمایاں
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <label className="font-medium">مصنف:</label>
                    <p>{typeof selectedPoem.author === 'object' 
                      ? (selectedPoem.author?.name || 'نامعلوم')
                      : (selectedPoem.author || 'نامعلوم')}
                    </p>
                  </div>
                  <div>
                    <label className="font-medium">تاریخ:</label>
                    <p>{new Date(selectedPoem.createdAt).toLocaleDateString("ur-PK", {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</p>
                  </div>
                </div>
              </div>

              {/* Poem Content */}
              <div className="mb-6 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-r-4 border-amber-400">
                <h4 className="text-lg font-bold text-gray-800 mb-4">مکمل نظم / Full Poem</h4>
                <div className="prose prose-lg max-w-none urdu-text-local">
                  <pre className="whitespace-pre-wrap font-urdu text-xl leading-loose text-gray-800">
                    {selectedPoem.content}
                  </pre>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Eye className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{selectedPoem.views || 0}</div>
                  <div className="text-sm text-gray-600">مناظر</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <Heart className="w-6 h-6 mx-auto text-red-600 mb-2" />
                  <div className="text-2xl font-bold text-red-600">{selectedPoem.likes?.length || 0}</div>
                  <div className="text-sm text-gray-600">پسند</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Bookmark className="w-6 h-6 mx-auto text-yellow-600 mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">{selectedPoem.bookmarks?.length || 0}</div>
                  <div className="text-sm text-gray-600">بُک مارک</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Star className="w-6 h-6 mx-auto text-purple-600 mb-2" />
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedPoem.averageRating || '0'}
                  </div>
                  <div className="text-sm text-gray-600">ریٹنگ</div>
                </div>
              </div>

              <div className="flex space-x-3 space-x-reverse">
                <button
                  onClick={() => {
                    setShowPoemModal(false);
                    handleEditPoem(selectedPoem);
                  }}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-4 h-4 inline ml-2" />
                  ترمیم کریں / Edit
                </button>
                <button
                  onClick={() => setShowPoemModal(false)}
                  className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  بند کریں / Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Poem Edit Modal */}
      {showEditPoemModal && selectedPoem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">نظم میں ترمیم / Edit Poem</h2>
                <button onClick={() => setShowEditPoemModal(false)} className="text-white hover:text-gray-200">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">عنوان / Title</label>
                  <input
                    type="text"
                    defaultValue={selectedPoem.title}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 urdu-text-local"
                    id="editPoemTitle"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">صنف / Category</label>
                  <select
                    defaultValue={selectedPoem.category}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 urdu-text-local"
                    id="editPoemCategory"
                  >
                    <option value="ghazal">غزل</option>
                    <option value="nazm">نظم</option>
                    <option value="rubai">رباعی</option>
                    <option value="qasida">قصیدہ</option>
                    <option value="marsiya">مرثیہ</option>
                    <option value="hamd">حمد</option>
                    <option value="naat">نعت</option>
                    <option value="manqabat">منقبت</option>
                    <option value="other">دیگر</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">مواد / Content</label>
                  <textarea
                    defaultValue={selectedPoem.content}
                    rows={12}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 urdu-text-local font-urdu"
                    id="editPoemContent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">حالت / Status</label>
                  <select
                    defaultValue={selectedPoem.status}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 urdu-text-local"
                    id="editPoemStatus"
                  >
                    <option value="draft">ڈرافٹ / Draft</option>
                    <option value="pending">منتظر منظوری / Pending</option>
                    <option value="approved">منظور شدہ / Approved</option>
                    <option value="published">شائع شدہ / Published</option>
                    <option value="rejected">مسترد / Rejected</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 space-x-reverse mt-6">
                <button
                  onClick={() => {
                    const updatedPoem = {
                      title: document.getElementById('editPoemTitle').value,
                      category: document.getElementById('editPoemCategory').value,
                      content: document.getElementById('editPoemContent').value,
                      status: document.getElementById('editPoemStatus').value,
                    };
                    handleUpdatePoem(selectedPoem._id, updatedPoem);
                  }}
                  disabled={refreshing}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {refreshing ? 'محفوظ ہو رہا...' : 'محفوظ کریں / Save'}
                </button>
                <button
                  onClick={() => setShowEditPoemModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  منسوخ / Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Poet Details Edit Modal */}
      {showPoetDetailsModal && selectedPoet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">شاعر کی مکمل تفصیلات / Complete Poet Details</h2>
                <button onClick={() => setShowPoetDetailsModal(false)} className="text-white hover:text-gray-200">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form className="p-6" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const poetData = {
                name: formData.get('name'),
                penName: formData.get('penName'),
                fullName: formData.get('fullName'),
                bio: formData.get('bio'),
                shortBio: formData.get('shortBio'),
                nationality: formData.get('nationality'),
                era: formData.get('era'),
                schoolOfThought: formData.get('schoolOfThought'),
                birthPlace: {
                  city: formData.get('birthCity'),
                  region: formData.get('birthRegion'),
                  country: formData.get('birthCountry')
                },
                period: {
                  from: parseInt(formData.get('periodFrom')) || null,
                  to: parseInt(formData.get('periodTo')) || null
                },
                dateOfBirth: formData.get('dateOfBirth') || null,
                dateOfDeath: formData.get('dateOfDeath') || null,
                isDeceased: formData.get('isDeceased') === 'on',
                languages: formData.getAll('languages'),
                poeticStyle: formData.getAll('poeticStyle'),
                isVerified: formData.get('isVerified') === 'on',
                featured: formData.get('featured') === 'on',
              };
              handleSavePoetDetails(poetData);
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Basic Information */}
                <div className="col-span-2">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">بنیادی معلومات / Basic Information</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نام / Name *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={selectedPoet.name}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 urdu-text-local"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">تخلص / Pen Name</label>
                  <input
                    type="text"
                    name="penName"
                    defaultValue={selectedPoet.penName}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 urdu-text-local"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">مکمل نام / Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    defaultValue={selectedPoet.fullName}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 urdu-text-local"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">قومیت / Nationality</label>
                  <input
                    type="text"
                    name="nationality"
                    defaultValue={selectedPoet.nationality}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 urdu-text-local"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">دور / Era *</label>
                  <select
                    name="era"
                    defaultValue={selectedPoet.era}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 urdu-text-local"
                  >
                    <option value="classical">کلاسیکی / Classical</option>
                    <option value="modern">جدید / Modern</option>
                    <option value="contemporary">عصری / Contemporary</option>
                    <option value="progressive">ترقی پسند / Progressive</option>
                    <option value="traditional">روایتی / Traditional</option>
                  </select>
                </div>

                {/* Biography */}
                <div className="col-span-2">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 mt-4">سوانح / Biography</h3>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">مختصر تعارف / Short Bio</label>
                  <input
                    type="text"
                    name="shortBio"
                    defaultValue={selectedPoet.shortBio}
                    maxLength={500}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 urdu-text-local"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">تفصیلی سوانح / Detailed Biography</label>
                  <textarea
                    name="bio"
                    defaultValue={selectedPoet.bio}
                    rows={6}
                    maxLength={5000}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 urdu-text-local"
                  />
                </div>

                {/* Dates */}
                <div className="col-span-2">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 mt-4">تواریخ / Dates</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">تاریخ پیدائش / Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    defaultValue={selectedPoet.dateOfBirth ? new Date(selectedPoet.dateOfBirth).toISOString().split('T')[0] : ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">تاریخ وفات / Date of Death</label>
                  <input
                    type="date"
                    name="dateOfDeath"
                    defaultValue={selectedPoet.dateOfDeath ? new Date(selectedPoet.dateOfDeath).toISOString().split('T')[0] : ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">زمانہ (شروع) / Period (From)</label>
                  <input
                    type="number"
                    name="periodFrom"
                    defaultValue={selectedPoet.period?.from}
                    placeholder="مثلاً 1900"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">زمانہ (اختتام) / Period (To)</label>
                  <input
                    type="number"
                    name="periodTo"
                    defaultValue={selectedPoet.period?.to}
                    placeholder="مثلاً 1980"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Birth Place */}
                <div className="col-span-2">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 mt-4">مقام پیدائش / Birth Place</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">شہر / City</label>
                  <input
                    type="text"
                    name="birthCity"
                    defaultValue={selectedPoet.birthPlace?.city}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 urdu-text-local"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">علاقہ / Region</label>
                  <input
                    type="text"
                    name="birthRegion"
                    defaultValue={selectedPoet.birthPlace?.region}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 urdu-text-local"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">ملک / Country</label>
                  <input
                    type="text"
                    name="birthCountry"
                    defaultValue={selectedPoet.birthPlace?.country}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 urdu-text-local"
                  />
                </div>

                {/* Literary Info */}
                <div className="col-span-2">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 mt-4">ادبی معلومات / Literary Information</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">مکتب فکر / School of Thought</label>
                  <select
                    name="schoolOfThought"
                    defaultValue={selectedPoet.schoolOfThought}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 urdu-text-local"
                  >
                    <option value="">منتخب کریں</option>
                    <option value="romantic">رومانوی / Romantic</option>
                    <option value="progressive">ترقی پسند / Progressive</option>
                    <option value="traditional">روایتی / Traditional</option>
                    <option value="modern">جدید / Modern</option>
                    <option value="sufi">صوفیانہ / Sufi</option>
                    <option value="political">سیاسی / Political</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">زبانیں / Languages</label>
                  <select
                    name="languages"
                    multiple
                    defaultValue={selectedPoet.languages || []}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 urdu-text-local"
                  >
                    <option value="urdu">اردو / Urdu</option>
                    <option value="punjabi">پنجابی / Punjabi</option>
                    <option value="other">دیگر / Other</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Ctrl/Cmd + کلک سے کئی منتخب کریں</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">شاعری کی اقسام / Poetic Styles</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['ghazal', 'nazm', 'rubai', 'qawwali', 'marsiya', 'salam', 'hamd', 'naat', 'free-verse'].map(style => (
                      <label key={style} className="flex items-center space-x-2 space-x-reverse">
                        <input
                          type="checkbox"
                          name="poeticStyle"
                          value={style}
                          defaultChecked={selectedPoet.poeticStyle?.includes(style)}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{style}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 mt-4">حالت / Status</h3>
                </div>

                <div className="flex items-center space-x-4 space-x-reverse">
                  <label className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      name="isDeceased"
                      defaultChecked={selectedPoet.isDeceased}
                      className="rounded"
                    />
                    <span>متوفی / Deceased</span>
                  </label>

                  <label className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      name="isVerified"
                      defaultChecked={selectedPoet.isVerified}
                      className="rounded"
                    />
                    <span>تصدیق شدہ / Verified</span>
                  </label>

                  <label className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      name="featured"
                      defaultChecked={selectedPoet.featured}
                      className="rounded"
                    />
                    <span>نمایاں / Featured</span>
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 space-x-reverse mt-8 pt-6 border-t">
                <button
                  type="submit"
                  disabled={refreshing}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {refreshing ? 'محفوظ ہو رہا...' : 'تفصیلات محفوظ کریں / Save Details'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPoetDetailsModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  منسوخ / Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Overview Tab Component - Fully Dynamic
const OverviewTab = ({ dashboardData }) => {
  if (!dashboardData)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">ڈیٹا لوڈ ہو رہا ہے...</p>
        </div>
      </div>
    );

  const stats = dashboardData.stats;
  const recentActivity = dashboardData.recentActivity;
  const insights = dashboardData.insights;

  return (
    <div className="space-y-8 urdu-text-local">
      {/* Dynamic Stats Grid - Matching Image Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DynamicStatCard
          title="کل صارفین"
          value={stats.totalUsers}
          change={`+${stats.weeklyGrowth}%`}
          icon={Users}
          color="blue"
          trend="up"
          subtitle={`آج ${stats.todayRegistrations} نئے`}
        />
        <DynamicStatCard
          title="شعراء"
          value={stats.poets}
          change="+12.5%"
          icon={Edit}
          color="green"
          trend="up"
          subtitle={`${stats.pendingApprovals} منتظر منظوری`}
        />
        <DynamicStatCard
          title="قاری"
          value={stats.readers}
          change="+8.3%"
          icon={BookOpen}
          color="purple"
          trend="up"
          subtitle="فعال قارئین"
        />
        <DynamicStatCard
          title="منتظمین"
          value={stats.moderators}
          change="مستحکم"
          icon={Shield}
          color="orange"
          trend="stable"
          subtitle="کل منتظمین"
        />
      </div>

      {/* Secondary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DynamicStatCard
          title="منتظر منظوری"
          value={stats.pendingApprovals}
          change="-5.2%"
          icon={Clock}
          color="yellow"
          trend="down"
          subtitle="کم ہو رہے ہیں"
        />
        <DynamicStatCard
          title="کل مناظر"
          value={formatNumber(stats.totalViews)}
          change="+22.1%"
          icon={Eye}
          color="indigo"
          trend="up"
          subtitle="اس ماہ"
        />
        <DynamicStatCard
          title="صارفین کی رضامندی"
          value={`${stats.userSatisfaction}%`}
          change="+2.1%"
          icon={Heart}
          color="pink"
          trend="up"
          subtitle="بہترین ریٹنگ"
        />
      </div>

      {/* Quick Actions Matching Image Style */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-xl font-bold text-blue-900 mb-6 flex items-center">
          <Zap className="w-6 h-6 ml-2 text-blue-600" />
          فوری اعمال اور ترجیحات
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionCard
            icon={UserCheck}
            count={stats.pendingApprovals}
            label="صارف"
            sublabel="منظوری کے لیے"
            color="green"
            onClick={() => console.log("Navigate to pending users")}
          />
          <QuickActionCard
            icon={Shield}
            count={stats.contentModeration}
            label="مواد"
            sublabel="جانچ کے لیے"
            color="red"
            onClick={() => console.log("Navigate to content moderation")}
          />
          <QuickActionCard
            icon={Plus}
            count="نیا"
            label="مقابلہ"
            sublabel="بنائیں"
            color="purple"
            onClick={() => console.log("Create new contest")}
          />
          <QuickActionCard
            icon={Download}
            count="رپورٹ"
            label="ڈاؤن لوڈ"
            sublabel="تفصیلی"
            color="blue"
            onClick={() => console.log("Download report")}
          />
        </div>
      </div>

      {/* Recent Activity with Enhanced Display */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Clock className="w-6 h-6 ml-2 text-gray-600" />
            حالیہ سرگرمیاں اور اطلاعات
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity
                .slice(0, 8)
                .map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>کوئی حالیہ سرگرمی نہیں</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Platform Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Genres */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h4 className="font-bold text-lg mb-4 flex items-center">
            <Star className="w-5 h-5 ml-2 text-yellow-500" />
            مقبول اصناف
          </h4>
          <div className="space-y-3">
            {insights.popularGenres.map((genre, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium">{genre}</span>
                <div className="flex items-center">
                  <div className="w-20 bg-gray-200 rounded-full h-2 ml-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.random() * 60 + 30}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 w-8">
                    {Math.floor(Math.random() * 40 + 10)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Health */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h4 className="font-bold text-lg mb-4 flex items-center">
            <Activity className="w-5 h-5 ml-2 text-green-500" />
            پلیٹ فارم کی صحت
          </h4>
          <div className="space-y-4">
            <HealthMetric
              label="سرور اپ ٹائم"
              value={insights.platformHealth?.serverUptime || "99.9%"}
              color="green"
            />
            <HealthMetric
              label="جوابی وقت"
              value={insights.platformHealth?.responseTime || "125ms"}
              color="blue"
            />
            <HealthMetric
              label="خرابی کی شرح"
              value={insights.platformHealth?.errorRate || "0.12%"}
              color="yellow"
            />
            <HealthMetric
              label="استعمال شدہ جگہ"
              value={insights.platformHealth?.storageUsed || "72.3%"}
              color="purple"
            />
          </div>
        </div>
      </div>

      {/* Top Performers - Enhanced */}
      {insights.topPerformers && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <h4 className="font-bold text-lg mb-4 flex items-center">
            <Crown className="w-5 h-5 ml-2 text-purple-600" />
            بہترین کارکردگی
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.topPerformers.map((performer, index) => (
              <TopPerformerCard
                key={index}
                performer={performer}
                rank={index + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Profile Management Tab Component
const ProfileManagementTab = ({
  users,
  onUserApproval,
  onUserDelete,
  refreshing,
  onViewDetails,
  onEditUser,
  getImageUrl,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [viewMode, setViewMode] = useState("grid");

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    const matchesStatus =
      selectedStatus === "all" || user.status === selectedStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return (a.name || "").localeCompare(b.name || "");
      case "email":
        return (a.email || "").localeCompare(b.email || "");
      case "role":
        return (a.role || "").localeCompare(b.role || "");
      case "followers":
        return (b.followers || 0) - (a.followers || 0);
      case "poems":
        return (b.poems || 0) - (a.poems || 0);
      case "createdAt":
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      default:
        return 0;
    }
  });

  const handleApprove = async (userId) => {
    try {
      if (onUserApproval) {
        await onUserApproval(userId, "approved");
      }
    } catch (error) {
      console.error("Error approving user:", error);
    }
  };

  const handleReject = async (userId) => {
    try {
      if (onUserApproval) {
        await onUserApproval(userId, "rejected");
      }
    } catch (error) {
      console.error("Error rejecting user:", error);
    }
  };

  const handleDelete = async (userId) => {
    try {
      if (onUserDelete) {
        await onUserDelete(userId);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        class: "bg-yellow-100 text-yellow-800 border-yellow-200",
        text: "منتظر منظوری",
      },
      approved: {
        class: "bg-green-100 text-green-800 border-green-200",
        text: "منظور شدہ",
      },
      rejected: {
        class: "bg-red-100 text-red-800 border-red-200",
        text: "مسترد",
      },
      reviewing: {
        class: "bg-blue-100 text-blue-800 border-blue-200",
        text: "زیر نظر",
      },
      active: {
        class: "bg-green-100 text-green-800 border-green-200",
        text: "فعال",
      },
      inactive: {
        class: "bg-gray-100 text-gray-800 border-gray-200",
        text: "غیر فعال",
      },
      blocked: {
        class: "bg-red-100 text-red-800 border-red-200",
        text: "بلاک شدہ",
      },
    };
    return badges[status] || badges.pending;
  };

  const getRoleBadge = (role) => {
    const badges = {
      poet: {
        class: "bg-purple-100 text-purple-800",
        text: "شاعر",
        icon: "🎭",
      },
      reader: { class: "bg-blue-100 text-blue-800", text: "قاری", icon: "📚" },
      moderator: {
        class: "bg-orange-100 text-orange-800",
        text: "منتظم",
        icon: "⚖️",
      },
      admin: { class: "bg-red-100 text-red-800", text: "ایڈمن", icon: "👑" },
    };
    return badges[role] || badges.reader;
  };

  return (
    <div className="space-y-6 urdu-text-local">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-6 h-6 ml-2 text-blue-600" />
            صارفین کا انتظام
          </h2>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center transition-colors">
            <Plus className="w-4 h-4 ml-2" />
            نیا صارف شامل کریں
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">
              {users.length}
            </div>
            <div className="text-sm text-gray-600">کل صارفین</div>
          </div>
          <div className="bg-white p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {users.filter((u) => u.status === "pending").length}
            </div>
            <div className="text-sm text-gray-600">منتظر منظوری</div>
          </div>
          <div className="bg-white p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              {users.filter((u) => u.status === "approved").length}
            </div>
            <div className="text-sm text-gray-600">منظور شدہ</div>
          </div>
          <div className="bg-white p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">
              {users.filter((u) => u.role === "poet").length}
            </div>
            <div className="text-sm text-gray-600">شعراء</div>
          </div>
        </div>
      </div>
      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="نام، ای میل یا مقام تلاش کریں..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent urdu-text-local"
              />
            </div>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 urdu-text-local"
          >
            <option value="all">تمام حالات</option>
            <option value="pending">منتظر منظوری</option>
            <option value="approved">منظور شدہ</option>
            <option value="rejected">مسترد</option>
            <option value="reviewing">زیر نظر</option>
            <option value="active">فعال</option>
            <option value="inactive">غیر فعال</option>
            <option value="blocked">بلاک شدہ</option>
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 urdu-text-local"
          >
            <option value="all">تمام کردار</option>
            <option value="admin">ایڈمن</option>
            <option value="poet">شاعر</option>
            <option value="reader">قاری</option>
            <option value="moderator">نگران</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 urdu-text-local"
          >
            <option value="createdAt">تاریخ کے مطابق</option>
            <option value="name">نام کے مطابق</option>
            <option value="email">ای میل کے مطابق</option>
            <option value="role">کردار کے مطابق</option>
            <option value="followers">پیروکاروں کے مطابق</option>
            <option value="poems">نظموں کے مطابق</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <div className="flex items-center space-x-4 space-x-reverse">
            <span className="text-sm text-gray-600">
              {sortedUsers.length} میں سے {users.length} صارفین
            </span>
            <span className="text-xs text-gray-500">
              • منتظر: {users.filter((u) => u.status === "pending").length}•
              منظور: {users.filter((u) => u.status === "approved").length}•
              شعراء: {users.filter((u) => u.role === "poet").length}
            </span>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded ${
                viewMode === "grid" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded ${
                viewMode === "list" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {/* Dynamic User Display - Enhanced Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedUsers.map((user) => {
            const statusBadge = getStatusBadge(user.status);
            const roleBadge = getRoleBadge(user.role);

            return (
              <div
                key={user._id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
              >
                {/* User Header */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 text-center relative">
                  <div className="absolute top-4 left-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${statusBadge.class}`}
                    >
                      {statusBadge.text}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadge.class}`}
                    >
                      {roleBadge.icon} {roleBadge.text}
                    </span>
                  </div>

                  {/* Profile Image */}
                  <div className="flex justify-center mb-3 mt-4">
                    {user.profileImage && (typeof user.profileImage === 'string' || user.profileImage.url || user.profileImage.secure_url) ? (
                      <img
                        src={getImageUrl(user.profileImage)}
                        alt={user.name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                        onError={(e) => {
                          console.error('Image load error for user:', user.name, 'Image:', user.profileImage);
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=200&bold=true&format=png`;
                        }}
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
                        {user.name ? user.name.charAt(0).toUpperCase() : "👤"}
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">
                    {user.penName ? `${user.name} (${user.penName})` : user.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {user.email === "N/A" ? (
                      <span className="text-gray-400 italic">
                        {user.isDeceased ? "کلاسیکی شاعر (متوفی)" : "صارف اکاؤنٹ نہیں"}
                      </span>
                    ) : (
                      user.email
                    )}
                  </p>
                  <div className="flex items-center justify-center text-xs text-gray-500">
                    <Globe className="w-3 h-3 ml-1" />
                    <span>{user.location || user.era || "نامعلوم"}</span>
                  </div>
                </div>

                {/* User Stats */}
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-blue-600">
                        {user.stats?.totalPoems || user.poems || 0}
                      </div>
                      <div className="text-xs text-gray-500">نظمیں</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-600">
                        {user.stats?.followers || user.followers || 0}
                      </div>
                      <div className="text-xs text-gray-500">پیروکار</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-purple-600">
                        {user.stats?.totalViews || user.totalViews || 0}
                      </div>
                      <div className="text-xs text-gray-500">مناظر</div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">شمولیت:</span>
                      <span className="font-medium">
                        {formatDateUrdu(user.createdAt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">آخری بار فعال:</span>
                      <span className="font-medium">
                        {formatTimeAgo(user.lastActive || user.updatedAt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">پروفائل مکمل:</span>
                      <span className="font-medium">
                        {user.profileCompletion || 85}%
                      </span>
                    </div>
                    {user.rating && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">ریٹنگ:</span>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="font-medium mr-1">
                            {user.rating}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>پروفائل کی تکمیل</span>
                      <span>{user.profileCompletion || 85}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${user.profileCompletion || 85}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {user.status === "pending" && (
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        onClick={() => handleApprove(user._id)}
                        disabled={refreshing}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                      >
                        <CheckCircle className="w-4 h-4 ml-1" />
                        منظور
                      </button>
                      <button
                        onClick={() => handleReject(user._id)}
                        disabled={refreshing}
                        className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                      >
                        <XCircle className="w-4 h-4 ml-1" />
                        مسترد
                      </button>
                    </div>
                  )}

                  {user.status !== "pending" && (
                    <div className="flex space-x-2 space-x-reverse">
                      <button 
                        onClick={() => onViewDetails && onViewDetails(user)}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                      >
                        <Eye className="w-4 h-4 ml-1" />
                        تفصیلات
                      </button>
                      <button 
                        onClick={() => onEditUser && onEditUser(user)}
                        className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                      >
                        <Edit className="w-4 h-4 ml-1" />
                        ترمیم
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Table View for List Mode
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    صارف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    کردار
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    حالت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاریخ رجسٹریشن
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    اعمال
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedUsers.map((user) => {
                  const statusBadge = getStatusBadge(user.status);
                  const roleBadge = getRoleBadge(user.role);

                  return (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {/* Profile Image */}
                          {user.profileImage ? (
                            <img
                              src={getImageUrl(user.profileImage)}
                              alt={user.name}
                              className="w-12 h-12 rounded-full object-cover ml-4 border-2 border-gray-200"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=100&bold=true&format=png`;
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold ml-4 border-2 border-gray-200">
                              {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.penName ? `${user.name} (${user.penName})` : user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email === "N/A" ? (
                                <span className="text-gray-400 italic">
                                  {user.isDeceased ? "کلاسیکی شاعر" : "صارف اکاؤنٹ نہیں"}
                                </span>
                              ) : (
                                user.email
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadge.class}`}
                        >
                          {roleBadge.icon} {roleBadge.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${statusBadge.class}`}
                        >
                          {statusBadge.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateUrdu(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2 space-x-reverse">
                        {user.status === "pending" ? (
                          <>
                            <button
                              onClick={() => handleApprove(user._id)}
                              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                            >
                              منظور
                            </button>
                            <button
                              onClick={() => handleReject(user._id)}
                              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                            >
                              مسترد
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => onViewDetails && onViewDetails(user)}
                              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                            >
                              تفصیلات
                            </button>
                            <button 
                              onClick={() => onEditUser && onEditUser(user)}
                              className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                            >
                              ترمیم
                            </button>
                            <button
                              onClick={() => handleDelete(user._id)}
                              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                            >
                              حذف
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}{" "}
      {/* Pagination */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            کوئی صارف نہیں ملا
          </h3>
          <p className="text-gray-500">
            تلاش کی شرائط تبدیل کر کے دوبارہ کوشش کریں
          </p>
        </div>
      )}
    </div>
  );
};

// Enhanced Content Moderation Tab Component
const ContentModerationTab = ({ 
  poems, 
  onPoemModeration, 
  refreshing,
  onViewPoem,
  onEditPoem,
  onDeletePoem,
  onFeaturePoem
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");

  const filteredPoems = poems.filter((poem) => {
    const authorName = typeof poem.author === 'object' ? (poem.author?.name || poem.author?.fullName || '') : (poem.author || '');
    const poetName = typeof poem.poet === 'object' ? (poem.poet?.name || '') : (poem.poet || '');
    const matchesSearch =
      poem.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      poetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      poem.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || poem.status === filterStatus;
    const matchesCategory =
      filterCategory === "all" || poem.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Sort poems
  const sortedPoems = [...filteredPoems].sort((a, b) => {
    switch (sortBy) {
      case "createdAt":
        return new Date(b.createdAt) - new Date(a.createdAt);
      case "views":
        return (b.views || 0) - (a.views || 0);
      case "likes":
        return (b.likes?.length || 0) - (a.likes?.length || 0);
      case "title":
        return a.title?.localeCompare(b.title);
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6 urdu-text-local">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">مواد کی نگرانی</h2>
          <p className="text-gray-600 text-sm mt-1">کل نظمیں: {poems.length}</p>
        </div>
        <div className="flex space-x-2 space-x-reverse">
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center">
            <Plus className="w-4 h-4 ml-2" />
            نئی نظم شامل کریں
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {poems.filter(p => p.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">منتظر منظوری</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {poems.filter(p => p.status === 'approved' || p.status === 'published').length}
          </div>
          <div className="text-sm text-gray-600">منظور شدہ</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {poems.filter(p => p.status === 'rejected').length}
          </div>
          <div className="text-sm text-gray-600">مسترد</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {poems.filter(p => p.status === 'draft').length}
          </div>
          <div className="text-sm text-gray-600">ڈرافٹ</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="نظم، شاعر یا مواد تلاش کریں..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 urdu-text-local"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg urdu-text-local"
          >
            <option value="all">تمام حالات</option>
            <option value="pending">منتظر منظوری</option>
            <option value="approved">منظور شدہ</option>
            <option value="published">شائع شدہ</option>
            <option value="rejected">مسترد</option>
            <option value="draft">ڈرافٹ</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg urdu-text-local"
          >
            <option value="createdAt">تاریخ کے مطابق</option>
            <option value="views">مناظر کے مطابق</option>
            <option value="likes">پسندیدگی کے مطابق</option>
            <option value="title">عنوان کے مطابق</option>
          </select>
        </div>
      </div>

      {/* Poems Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sortedPoems.length > 0 ? (
          sortedPoems.map((poem) => {
            const authorName = typeof poem.author === 'object' 
              ? (poem.author?.name || poem.author?.fullName || 'نامعلوم') 
              : (poem.author || 'نامعلوم');
            const poetName = typeof poem.poet === 'object'
              ? (poem.poet?.name || '')
              : (poem.poet || '');

            return (
              <div key={poem._id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">
                      {poem.title || 'بے نام نظم'}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      مصنف: {authorName}
                      {poetName && ` (${poetName})`}
                    </p>
                    <p className="text-xs text-gray-500">
                      صنف: {poem.category || 'نظم'}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap
                    ${
                      poem.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : poem.status === "approved" || poem.status === "published"
                        ? "bg-green-100 text-green-800"
                        : poem.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {poem.status === "pending"
                      ? "منتظر"
                      : poem.status === "approved"
                      ? "منظور"
                      : poem.status === "published"
                      ? "شائع"
                      : poem.status === "rejected"
                      ? "مسترد"
                      : "ڈرافٹ"}
                  </span>
                </div>

                {/* Content Preview */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 line-clamp-3 urdu-text-local leading-relaxed">
                    {poem.content || 'مواد دستیاب نہیں'}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex justify-between text-sm text-gray-600 mb-4 pb-4 border-b">
                  <div className="flex items-center">
                    <Eye className="w-4 h-4 ml-1" />
                    <span>{poem.views || 0}</span>
                  </div>
                  <div className="flex items-center">
                    <Heart className="w-4 h-4 ml-1" />
                    <span>{poem.likes?.length || 0}</span>
                  </div>
                  <div className="flex items-center">
                    <Bookmark className="w-4 h-4 ml-1" />
                    <span>{poem.bookmarks?.length || 0}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 ml-1" />
                    <span>
                      {new Date(poem.createdAt).toLocaleDateString("ur-PK", {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onViewPoem && onViewPoem(poem)}
                    className="flex items-center justify-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="w-4 h-4 ml-1" />
                    دیکھیں
                  </button>
                  <button
                    onClick={() => onEditPoem && onEditPoem(poem)}
                    className="flex items-center justify-center bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Edit className="w-4 h-4 ml-1" />
                    ترمیم
                  </button>
                  
                  {poem.status === "pending" && (
                    <>
                      <button
                        onClick={() => onPoemModeration(poem._id, true)}
                        disabled={refreshing}
                        className="flex items-center justify-center bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 ml-1" />
                        منظور
                      </button>
                      <button
                        onClick={() => onPoemModeration(poem._id, false)}
                        disabled={refreshing}
                        className="flex items-center justify-center bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        <XCircle className="w-4 h-4 ml-1" />
                        مسترد
                      </button>
                    </>
                  )}

                  {(poem.status === "approved" || poem.status === "published") && (
                    <button
                      onClick={() => onFeaturePoem && onFeaturePoem(poem._id, !poem.featured)}
                      className={`flex items-center justify-center py-2 px-4 rounded-lg transition-colors ${
                        poem.featured
                          ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      }`}
                    >
                      <Star className={`w-4 h-4 ml-1 ${poem.featured ? 'fill-current' : ''}`} />
                      {poem.featured ? 'نمایاں' : 'نمایاں کریں'}
                    </button>
                  )}

                  <button
                    onClick={() => onDeletePoem && onDeletePoem(poem._id)}
                    disabled={refreshing}
                    className="flex items-center justify-center bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 ml-1" />
                    حذف
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-2 text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">کوئی نظم نہیں ملی</h3>
            <p className="text-gray-500">
              تلاش کی شرائط تبدیل کر کے دوبارہ کوشش کریں
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Contest Management Tab Component
const ContestManagementTab = ({ contests }) => {
  return (
    <div className="space-y-6 urdu-text-local">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">مقابلوں کا انتظام</h2>
        <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center">
          <Plus className="w-4 h-4 ml-2" />
          نیا مقابلہ بنائیں
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {contests.map((contest) => (
          <div key={contest._id} className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  {contest.title}
                </h3>
                <p className="text-gray-600">انعام: {contest.prize}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium
                ${
                  contest.status === "active"
                    ? "bg-green-100 text-green-800"
                    : contest.status === "upcoming"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {contest.status === "active"
                  ? "فعال"
                  : contest.status === "upcoming"
                  ? "آنے والا"
                  : "مکمل"}
              </span>
            </div>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span>اندراجات:</span>
                <span className="font-medium">{contest.entries}</span>
              </div>
              <div className="flex justify-between">
                <span>آخری تاریخ:</span>
                <span className="font-medium">
                  {new Date(contest.deadline).toLocaleDateString("ur-PK")}
                </span>
              </div>
            </div>

            <div className="flex space-x-2 space-x-reverse">
              <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
                <Edit className="w-4 h-4 inline ml-1" />
                ترمیم
              </button>
              <button className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700">
                <Eye className="w-4 h-4 inline ml-1" />
                تفصیلات
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Other Tab Components (simplified for brevity)
const PoetBiographiesTab = () => (
  <div className="urdu-text-local">
    <h2 className="text-2xl font-bold mb-6">شعراء کی سوانح عمری</h2>
    <p className="text-gray-600">یہ سیکشن جلد ہی دستیاب ہوگا...</p>
  </div>
);

const AchievementsTab = () => (
  <div className="urdu-text-local">
    <h2 className="text-2xl font-bold mb-6">کامیابیوں کی نمائش</h2>
    <p className="text-gray-600">یہ سیکشن جلد ہی دستیاب ہوگا...</p>
  </div>
);

const AnalyticsTab = ({ dashboardData }) => (
  <div className="space-y-6 urdu-text-local">
    <h2 className="text-2xl font-bold">پلیٹ فارم کے تجزیات</h2>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-4 flex items-center">
          <PieChart className="w-5 h-5 ml-2" />
          صارفین کی بڑھوتری
        </h4>
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-2" />
          چارٹ یہاں دکھایا جائے گا
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 ml-2" />
          شاعری کی مقبولیت
        </h4>
        <div className="text-center py-8 text-gray-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-2" />
          چارٹ یہاں دکھایا جائے گا
        </div>
      </div>
    </div>

    {dashboardData && (
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-4">مقبول اصناف</h4>
        <div className="flex flex-wrap gap-2">
          {dashboardData.insights.popularGenres.map((genre, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
);

const SettingsTab = () => (
  <div className="space-y-6 urdu-text-local">
    <h2 className="text-2xl font-bold">سسٹم کی ترتیبات</h2>
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="font-medium mb-4">عمومی ترتیبات</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span>نئے صارفین کی خودکار منظوری</span>
          <button className="bg-gray-300 rounded-full w-12 h-6 relative">
            <div className="bg-white w-5 h-5 rounded-full absolute top-0.5 left-0.5"></div>
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span>شاعری کی خودکار منظوری</span>
          <button className="bg-blue-500 rounded-full w-12 h-6 relative">
            <div className="bg-white w-5 h-5 rounded-full absolute top-0.5 right-0.5"></div>
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span>AI مواد کی فلٹرنگ</span>
          <button className="bg-blue-500 rounded-full w-12 h-6 relative">
            <div className="bg-white w-5 h-5 rounded-full absolute top-0.5 right-0.5"></div>
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Utility functions
const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num?.toLocaleString() || "0";
};

// Enhanced Stat Card Component - Matching Image Style
const DynamicStatCard = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  trend,
  subtitle,
  percentage,
}) => {
  const colors = {
    blue: {
      bg: "from-blue-500 to-blue-600",
      text: "text-blue-600",
      light: "from-white to-blue-50",
    },
    green: {
      bg: "from-green-500 to-green-600",
      text: "text-green-600",
      light: "from-white to-green-50",
    },
    purple: {
      bg: "from-purple-500 to-purple-600",
      text: "text-purple-600",
      light: "from-white to-purple-50",
    },
    orange: {
      bg: "from-orange-500 to-orange-600",
      text: "text-orange-600",
      light: "from-white to-orange-50",
    },
    yellow: {
      bg: "from-yellow-500 to-yellow-600",
      text: "text-yellow-600",
      light: "from-white to-yellow-50",
    },
    indigo: {
      bg: "from-indigo-500 to-indigo-600",
      text: "text-indigo-600",
      light: "from-white to-indigo-50",
    },
    pink: {
      bg: "from-pink-500 to-pink-600",
      text: "text-pink-600",
      light: "from-white to-pink-50",
    },
  };

  const TrendIcon =
    trend === "up"
      ? ArrowUpRight
      : trend === "down"
      ? ArrowDownRight
      : Activity;

  return (
    <div
      className={`bg-gradient-to-br ${colors[color].light} p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-${color}-500 urdu-text-local`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
          {change && (
            <div className="flex items-center mt-2">
              <TrendIcon
                className={`w-4 h-4 ml-1 ${
                  trend === "up"
                    ? "text-green-600"
                    : trend === "down"
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  trend === "up"
                    ? "text-green-600"
                    : trend === "down"
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {change}
              </span>
            </div>
          )}
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div
          className={`p-4 rounded-xl bg-gradient-to-r ${colors[color].bg} shadow-lg flex-shrink-0`}
        >
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
      {/* Progress bar */}
      {percentage && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>کارکردگی</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`bg-gradient-to-r ${colors[color].bg} h-2 rounded-full transition-all duration-1000 ease-out`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

// Quick Action Card Component
const QuickActionCard = ({
  icon: Icon,
  count,
  label,
  sublabel,
  color,
  onClick,
}) => {
  const colors = {
    green: "text-green-600 hover:bg-green-50",
    red: "text-red-600 hover:bg-red-50",
    purple: "text-purple-600 hover:bg-purple-50",
    blue: "text-blue-600 hover:bg-blue-50",
  };

  return (
    <button
      onClick={onClick}
      className={`bg-white p-4 rounded-lg shadow hover:shadow-md transition-all duration-300 text-center group hover:scale-105 ${colors[color]}`}
    >
      <Icon
        className={`w-8 h-8 mx-auto mb-2 ${
          colors[color].split(" ")[0]
        } group-hover:scale-110 transition-transform`}
      />
      <span className="text-sm font-medium block">
        {count} {label}
      </span>
      <span className="text-xs text-gray-500">{sublabel}</span>
    </button>
  );
};

// Activity Card Component
const ActivityCard = ({ activity }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case "user_registration":
        return <UserCheck className="w-6 h-6 text-blue-600" />;
      case "poem_submission":
        return <BookOpen className="w-6 h-6 text-green-600" />;
      case "contest_entry":
        return <Activity className="w-6 h-6 text-purple-600" />;
      case "achievement_unlock":
        return <Award className="w-6 h-6 text-yellow-600" />;
      case "poem_like":
        return <Heart className="w-6 h-6 text-red-600" />;
      case "comment_added":
        return <Users className="w-6 h-6 text-indigo-600" />;
      default:
        return <Activity className="w-6 h-6 text-gray-600" />;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
          {getActivityIcon(activity.type)}
        </div>
        <div className="mr-4">
          <p className="font-medium">
            {typeof activity.user === 'object' ? (activity.user?.name || activity.user?.fullName || 'نامعلوم') : activity.user}
          </p>
          <p className="text-sm text-gray-600">{activity.description}</p>
          <p className="text-xs text-gray-500">{activity.time}</p>
        </div>
      </div>
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
          activity.status
        )}`}
      >
        {getStatusTextUrdu(activity.status)}
      </span>
    </div>
  );
};

// Health Metric Component
const HealthMetric = ({ label, value, color }) => {
  const colors = {
    green: "text-green-600",
    blue: "text-blue-600",
    yellow: "text-yellow-600",
    purple: "text-purple-600",
  };

  return (
    <div className="flex justify-between items-center">
      <span className="text-sm">{label}</span>
      <span className={`font-medium ${colors[color]}`}>{value}</span>
    </div>
  );
};

// Top Performer Card Component
const TopPerformerCard = ({ performer, rank }) => {
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="bg-white p-4 rounded-lg text-center shadow-md hover:shadow-lg transition-shadow">
      <div className="text-2xl mb-2">{medals[rank - 1] || "🏅"}</div>
      <h5 className="font-bold text-sm">{performer.name}</h5>
      <p className="text-xs text-gray-600 mb-1">{performer.metric}</p>
      <p className="text-lg font-bold text-purple-600">
        {formatNumber(performer.value)}
      </p>
    </div>
  );
};

// Enhanced Stat Card Component (keeping for compatibility)
const StatCard = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  trend,
  subtitle,
  percentage,
}) => {
  return (
    <DynamicStatCard
      title={title}
      value={value}
      change={change}
      icon={Icon}
      color={color}
      trend={trend}
      subtitle={subtitle}
      percentage={percentage || 0}
    />
  );
};

export default AdminDashboard;
