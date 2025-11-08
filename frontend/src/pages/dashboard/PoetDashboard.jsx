import React, { useState, useEffect } from "react";
import {
  Users,
  FileText,
  Award,
  TrendingUp,
  Settings,
  BarChart3,
  Eye,
  Heart,
  Plus,
  Star,
  BookOpen,
  Crown,
  RefreshCw,
  LogOut,
  User,
  Edit,
  Trash2,
  Upload,
  Camera,
  Download,
  MessageCircle,
  Sparkles,
  Brain,
  Globe,
  Calendar,
  Clock,
  Target,
  PieChart,
  Activity,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMessage } from "../../context/MessageContext";
import { useNavigate } from "react-router-dom";
import { poetryAPI } from "../../services/api";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Stats Card Component
const StatsCard = ({ title, value, change, icon: Icon, color, trend }) => (
  <div
    className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
        <p className="text-4xl font-bold mb-2">{value}</p>
        {change && (
          <div className="flex items-center space-x-1">
            <TrendingUp
              className={`w-4 h-4 ${
                trend === "up" ? "text-green-300" : "text-red-300"
              }`}
            />
            <p className="text-white/80 text-xs">{change}</p>
          </div>
        )}
      </div>
      <div className="relative">
        <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
        <Icon className="w-12 h-12 text-white/80 relative z-10" />
      </div>
    </div>
  </div>
);


// Poem Card Component
const PoemCard = ({ poem, onEdit, onDelete, onView }) => {
  const getStatusBadge = (status) => {
    const badges = {
      published: { text: "شائع شدہ", class: "bg-green-100 text-green-800" },
      pending: { text: "زیر نظر", class: "bg-yellow-100 text-yellow-800" },
      rejected: { text: "مسترد", class: "bg-red-100 text-red-800" },
    };
    return badges[status] || badges.pending;
  };

  const statusBadge = getStatusBadge(poem.status);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-1 urdu-text">
            {poem.title}
          </h3>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusBadge.class}`}
          >
            {statusBadge.text}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(poem)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="ترمیم"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(poem._id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="حذف کریں"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Poem Content Preview */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed urdu-text" dir="rtl">
        {poem.content?.substring(0, 150)}
        {poem.content?.length > 150 && "..."}
      </p>

      {/* Stats and Info */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span className="flex items-center">
            <Eye className="w-4 h-4 ml-1" />
            {poem.views || 0}
          </span>
          <span className="flex items-center">
            <Heart className="w-4 h-4 ml-1" />
            {poem.bookmarks?.length || 0}
          </span>
        </div>
        <button
          onClick={() => onView(poem)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium urdu-text"
        >
          تفصیل دیکھیں
        </button>
      </div>

      {/* Date */}
      <div className="mt-2 text-xs text-gray-400 text-right">
        {new Date(poem.createdAt).toLocaleDateString("ur-PK")}
      </div>
    </div>
  );
};

// Poem Form Modal Component
const urduToEnglishCategory = {
  "غزل": "ghazal",
  "نظم": "nazm",
  "قطعہ": "rubai",
  "رباعی": "rubai",
  "حمد": "hamd",
  "نعت": "naat",
  "مرثیہ": "marsiya",
};

const PoemFormModal = ({ isOpen, onClose, poem, onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
    poetryLanguage: "urdu",
  });
  const [loading, setLoading] = useState(false);
  const [apiErrors, setApiErrors] = useState([]);

  useEffect(() => {
    if (poem) {
      setFormData({
        title: poem.title || "",
        content: poem.content || "",
        category: poem.category || "",
        poetryLanguage: poem.poetryLanguage || "urdu",
      });
    } else {
      setFormData({
        title: "",
        content: "",
        category: "",
        poetryLanguage: "urdu",
      });
    }
    setApiErrors([]);
  }, [poem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setApiErrors([]);
    // Map Urdu category to English
    const mappedCategory = urduToEnglishCategory[formData.category] || formData.category;
    const submitData = {
      ...formData,
      category: mappedCategory,
    };
    try {
      await onSave(submitData, setApiErrors);
      if (apiErrors.length === 0) {
        onClose();
      }
    } catch (error) {
      console.error("Error saving poem:", error);
      if (error.response?.data?.errors) {
        setApiErrors(error.response.data.errors.map((err) => err.msg));
      } else if (error.response?.data?.message) {
        setApiErrors([error.response.data.message]);
      } else {
        setApiErrors(["نظم محفوظ کرنے میں خرابی"]);
      }
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-right">
          {poem ? "نظم میں تبدیلی" : "نئی نظم"}
        </h2>

        {/* API Error Display */}
        {apiErrors.length > 0 && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded text-red-700">
            <ul className="mt-2 list-disc pl-5">
              {apiErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-2">
              عنوان
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full p-4 border-2 border-gray-200 rounded-xl text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              required
              minLength={2}
              maxLength={200}
              dir="rtl"
              placeholder="نظم کا عنوان / Poem title"
            />
            <p className="text-xs text-gray-500 text-right mt-1">
              {formData.title.length} / 200 حروف
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-2">
              نظم
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              rows="8"
              className="w-full p-4 border-2 border-gray-200 rounded-xl text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
              required
              minLength={10}
              maxLength={10000}
              dir="rtl"
              placeholder="کم از کم 10 حروف / Minimum 10 characters"
            />
            <p className="text-xs text-gray-500 text-right mt-1">
              {formData.content.length} / 10000 حروف
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                قسم
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full p-4 border-2 border-gray-200 rounded-xl text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                required
                dir="rtl"
              >
                <option value="">قسم منتخب کریں</option>
                <option value="غزل">غزل</option>
                <option value="نظم">نظم</option>
                <option value="قطعہ">قطعہ</option>
                <option value="رباعی">رباعی</option>
                <option value="حمد">حمد</option>
                <option value="نعت">نعت</option>
                <option value="مرثیہ">مرثیہ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                زبان
              </label>
              <select
                value={formData.poetryLanguage}
                onChange={(e) =>
                  setFormData({ ...formData, poetryLanguage: e.target.value })
                }
                className="w-full p-4 border-2 border-gray-200 rounded-xl text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                dir="rtl"
              >
                <option value="urdu">اردو</option>
                <option value="english">انگریزی</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              منسوخ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50"
            >
              {loading ? "محفوظ ہو رہا ہے..." : "محفوظ کریں"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PoetDashboard = () => {
  const { user, logout } = useAuth();
  const { showConfirm, showSuccess } = useMessage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [poems, setPoems] = useState([]);
  const [selectedPoem, setSelectedPoem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch dynamic data from poet dashboard API
      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/auth");
        return;
      }

      console.log("Fetching dashboard data from:", API_BASE_URL);

      // Fetch overview data from backend
      const overviewResponse = await axios.get(
        `${API_BASE_URL}/poet-dashboard/overview`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const overviewData = overviewResponse.data.data;
      console.log("Overview data:", overviewData);

      // Fetch poems data
      const poemsResponse = await axios.get(
        `${API_BASE_URL}/poet-dashboard/poems`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 20, sortBy: "createdAt", sortOrder: "desc" },
        }
      );

      const poetPoems = poemsResponse.data.data.poems || [];
      console.log("Poems fetched:", poetPoems.length);
      setPoems(poetPoems);

      // Use backend overview data for statistics
      const totalPoems = overviewData.overview.totalPoems;
      const publishedPoems = overviewData.overview.publishedPoems;
      const pendingPoems = overviewData.overview.pendingPoems;
      const totalViews = overviewData.overview.totalViews;
      const totalFavorites = overviewData.overview.totalFavorites;
      
      // Calculate likes and comments from poems array (not in overview)
      const totalLikes = poetPoems.reduce(
        (sum, poem) => sum + (poem.likesCount || poem.likes || poem.stats?.likes || 0),
        0
      );
      const totalComments = poetPoems.reduce(
        (sum, poem) => sum + (poem.commentsCount || poem.comments?.length || poem.stats?.comments || 0),
        0
      );

      // Calculate top performing poems based on engagement score
      const poemsWithScore = poetPoems.map((poem) => {
        const views = poem.viewsCount || poem.views || poem.stats?.views || 0;
        const likes = poem.likesCount || poem.likes || poem.stats?.likes || 0;
        const favorites = poem.stats?.favorites || 0;
        const comments = poem.commentsCount || poem.comments?.length || poem.stats?.comments || 0;

        // Engagement score calculation
        const engagementScore = views + (likes * 2) + (favorites * 3) + (comments * 5);

        return {
          ...poem,
          views,
          likes,
          favorites,
          comments,
          score: engagementScore,
        };
      });

      // Sort by engagement score and get top poems
      const topPoems = [...poemsWithScore]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      // Calculate category distribution
      const categoryCount = {};
      poetPoems.forEach((poem) => {
        const cat = poem.category || "دیگر";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
      const categoryDistribution = Object.entries(categoryCount).map(([name, count]) => ({
        name,
        count,
      }));

      // Mock analytics data for views over time (until we have real time-series data)
      const mockAnalytics = {
        viewsOverTime: [
          { _id: "1 Jan", views: 45 },
          { _id: "15 Jan", views: 52 },
          { _id: "1 Feb", views: 61 },
          { _id: "15 Feb", views: 58 },
          { _id: "1 Mar", views: 67 },
          { _id: "15 Mar", views: 74 },
        ],
        topPerformingPoems: topPoems,
        categoryDistribution: categoryDistribution,
      };


      // Fetch profile data
      const profileResponse = await axios.get(
        `${API_BASE_URL}/poet-dashboard/profile`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const profileData = profileResponse.data.data;

      // Set dashboard data with real API response
      setDashboardData({
        totalPoems,
        publishedPoems,
        pendingPoems,
        totalViews,
        totalLikes: totalFavorites, // Use favorites from backend overview
        totalComments,
        followers: user?.followers?.length || 0,
        avgRating:
          totalPoems > 0
            ? poetPoems.reduce((sum, poem) => sum + (poem.rating || poem.averageRating || 0), 0) / totalPoems
            : 0,
        topPoems: topPoems, // Add top poems to dashboard data
      });

      console.log("Dashboard data set:", {
        totalPoems,
        publishedPoems,
        pendingPoems,
        totalViews,
        totalFavorites,
      });

      // Set analytics with real data
      setAnalytics({
        viewsOverTime: mockAnalytics.viewsOverTime || [],
        favoritesOverTime: mockAnalytics.favoritesOverTime || [],
        topPerformingPoems: mockAnalytics.topPerformingPoems || [],
        categoryDistribution: mockAnalytics.categoryDistribution || [],
        poemGrowth: mockAnalytics.poemGrowth || [],
      });

      // Set profile with real data
      console.log("Profile data loaded:", profileData);
      console.log("Profile avatar:", profileData.profileImage?.url);
      setProfile(profileData);

    } catch (error) {
      console.error("Error loading dashboard:", error);

      // Fallback to basic user data if API fails
      setDashboardData({

        totalPoems: 0,
        publishedPoems: 0,
        pendingPoems: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        followers: 0,
        avgRating: 0,
        topPoems: [],
      });
      setPoems([]);
      setAnalytics({ viewsOverTime: [], topPerformingPoems: [], categoryDistribution: [] });

      setProfile({
        name: user?.name || "",
        email: user?.email || "",
        profile: {
          bio: "",
          location: "",
          avatar: "",
        },
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleSavePoem = async (poemData, setApiErrors) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const token = localStorage.getItem("token");

      if (selectedPoem) {

        // Update existing poem using poetryAPI
        const response = await poetryAPI.updatePoem(selectedPoem._id, poemData);
        if (response.data.success) {
          toast.success("نظم کامیابی سے اپ ڈیٹ ہوئی / Poem updated successfully");
          loadDashboardData(); // Reload data
          setSelectedPoem(null);
          setIsModalOpen(false);
        }
      } else {
        // Create new poem using poetryAPI
        const response = await poetryAPI.createPoem(poemData);
        if (response.data.success) {
          toast.success("نظم کامیابی سے جمع ہوئی / Poem submitted successfully");
          loadDashboardData(); // Reload data
          setSelectedPoem(null);
          setIsModalOpen(false);
        }
      }
    } catch (error) {
      console.error("Error saving poem:", error);

      // Show specific error message
      const errorMessage = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg;
      if (errorMessage) {
        toast.error(errorMessage);
      } else if (error.response?.status === 403) {
        toast.error("آپ کے اکاؤنٹ کی منظوری باقی ہے / Your account is pending approval");
      } else if (error.response?.status === 401) {
        toast.error("براہ کرم دوبارہ لاگ ان کریں / Please login again");
      } else {
        toast.error("نظم محفوظ کرنے میں خرابی / Error saving poem");
      }
      throw error; // Re-throw to be caught by modal's error handling

    }
  };

  const handleDeletePoem = async (poemId) => {
    const confirmed = await showConfirm(
      "کیا آپ واقعی اس نظم کو حذف کرنا چاہتے ہیں؟ / Are you sure you want to delete this poem?",
      "نظم حذف کرنے کی تصدیق / Delete Poem Confirmation"
    );
    if (!confirmed) return;

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const token = localStorage.getItem("token");

      await axios.delete(
        `${API_BASE_URL}/poet-dashboard/poems/${poemId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      showSuccess("نظم کامیابی سے حذف ہوئی / Poem deleted successfully");
      loadDashboardData(); // Reload data
    } catch (error) {
      console.error("Error deleting poem:", error);
      showSuccess("نظم حذف کرنے میں خرابی / Error deleting poem", "error");
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showSuccess("برائے مہربانی ایک تصویر منتخب کریں / Please select an image file", "error");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showSuccess("تصویر کا سائز 5MB سے زیادہ نہیں ہونا چاہیے / Image size should not exceed 5MB", "error");
      return;
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const token = localStorage.getItem("token");

      if (!token) {
        showSuccess("براہ کرم دوبارہ لاگ ان کریں / Please login again", "error");
        navigate("/auth");
        return;
      }

      const formData = new FormData();
      formData.append('avatar', file);

      const response = await axios.post(
        `${API_BASE_URL}/poet-dashboard/profile/avatar`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
        }
      );

      if (response.data.success) {
        showSuccess("تصویر کامیابی سے اپ لوڈ ہوئی / Image uploaded successfully");
        console.log("Upload response:", response.data);
        console.log("New avatar URL:", response.data.data?.avatar);
        
        // Update profile state immediately with new avatar
        if (response.data.data?.avatar) {
          setProfile(prev => ({
            ...prev,
            profileImage: {
              url: response.data.data.avatar,
              publicId: response.data.data.poet?.profileImage?.publicId
            }
          }));
        }
        
        // Also reload full dashboard data
        await loadDashboardData();
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      console.error("Error response:", error.response?.data);
      
      // Handle token expiration
      if (error.response?.status === 401 || error.response?.data?.code === 'TOKEN_EXPIRED') {
        showSuccess("آپ کا سیشن ختم ہو گیا ہے، براہ کرم دوبارہ لاگ ان کریں / Your session has expired, please login again", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        setTimeout(() => {
          navigate("/auth");
        }, 2000);
        return;
      }
      
      const errorMsg = error.response?.data?.message || error.response?.data?.error || "تصویر اپ لوڈ کرنے میں خرابی / Error uploading image";
      showSuccess(errorMsg, "error");
    }
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const profileData = {
      name: formData.get('name'),
      email: formData.get('email'),
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
    };

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const token = localStorage.getItem("token");

      if (!token) {
        showSuccess("براہ کرم دوبارہ لاگ ان کریں / Please login again", "error");
        navigate("/auth");
        return;
      }

      const response = await axios.put(
        `${API_BASE_URL}/poet-dashboard/profile`,
        profileData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        showSuccess("پروفائل کامیابی سے اپ ڈیٹ ہوئی / Profile updated successfully");
        loadDashboardData(); // Reload profile data
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      
      // Handle token expiration
      if (error.response?.status === 401 || error.response?.data?.code === 'TOKEN_EXPIRED') {
        showSuccess("آپ کا سیشن ختم ہو گیا ہے، براہ کرم دوبارہ لاگ ان کریں / Your session has expired, please login again", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        setTimeout(() => {
          navigate("/auth");
        }, 2000);
        return;
      }
      
      showSuccess(
        error.response?.data?.message || "پروفائل اپ ڈیٹ کرنے میں خرابی / Error updating profile",
        "error"
      );
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50 flex items-center justify-center"
        dir="rtl"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">ڈیش بورڈ لوڈ ہو رہا ہے...</p>
        </div>
      </div>
    );
  }
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50"
      dir="rtl"
    >

      {/* Approval Status Notice */}
      {user?.status === "pending" && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong className="font-medium">منظوری کے انتظار میں / Pending Approval:</strong> آپ کا شاعر اکاؤنٹ ایڈمن کی منظوری کے انتظار میں ہے۔ آپ نظمیں لکھ سکتے ہیں لیکن وہ منظوری کے بعد ہی شائع ہوں گی۔ / Your poet account is pending admin approval. You can write poems but they will be published after approval.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Header with Beautiful Gradient */}
      <div className="relative bg-gradient-to-r from-amber-100 via-rose-100 to-purple-100 shadow-xl border-b border-amber-200">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-100/20 to-rose-100/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            {/* Poet Profile Image and Name */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={profile?.profileImage?.url 
                    ? (profile.profileImage.url.startsWith('http') 
                        ? profile.profileImage.url 
                        : `http://localhost:5000${profile.profileImage.url}`)
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Poet')}&background=random&size=128`
                  }
                  alt={user?.name || "شاعر"}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                />
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 urdu-text">{user?.name || "شاعر"}</h1>
                <p className="text-gray-600 urdu-text">{user?.email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-red-600 rounded-xl hover:bg-red-50 shadow-md hover:shadow-lg transition-all duration-300 border border-red-200"
            >
              <span className="font-medium urdu-text">لاگ آؤٹ</span>
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Navigation Tabs - Matching Image Design */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1">
            {[
              {
                id: "poems",
                label: "نظمیں",
                icon: BookOpen,
                color: "from-green-500 to-teal-600",
              },
              {
                id: "ai",
                label: "AI مدد",
                icon: Brain,
                color: "from-purple-500 to-indigo-600",
              },
              {
                id: "profile",
                label: "پروفائل",
                icon: User,
                color: "from-blue-500 to-cyan-600",
              },
              {
                id: "achievements",
                label: "منتخبات",
                icon: Award,
                color: "from-yellow-500 to-orange-600",
              },
              {
                id: "settings",
                label: "ترتیبات",
                icon: Settings,
                color: "from-gray-500 to-gray-700",
              },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-6 font-medium text-sm transition-all duration-300 border-b-4 ${
                    activeTab === tab.id
                      ? "border-green-500 text-green-600 bg-green-50"
                      : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="urdu-text">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && dashboardData && (
          <div className="space-y-8 urdu-text-local">
            {/* Enhanced Statistics Cards with Real Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="کل نظمیں"
                value={dashboardData.totalPoems || 0}
                change={`${dashboardData.publishedPoems || 0} شائع شدہ`}
                icon={FileText}
                color="from-blue-500 via-purple-600 to-indigo-700"
                trend="up"
              />

              <StatsCard
                title="کل نظارات"
                value={dashboardData.totalViews || 0}
                change={`${dashboardData.pendingPoems || 0} زیر نظر`}
                icon={Eye}
                color="from-green-500 via-teal-600 to-emerald-700"
                trend="up"
              />

              <StatsCard
                title="پسندیدگی"
                value={dashboardData.totalLikes || 0}
                change={`${dashboardData.totalPoems > 0 ? Math.round((dashboardData.totalLikes / dashboardData.totalPoems) * 100) / 100 : 0} اوسط`}
                icon={Heart}
                color="from-pink-500 via-red-600 to-rose-700"
                trend="up"
              />

              <StatsCard
                title="پیروکار"
                value={dashboardData.followers || 0}
                change={`${dashboardData.avgRating ? dashboardData.avgRating.toFixed(1) : 0}⭐ درجہ`}
                icon={Users}
                color="from-orange-500 via-yellow-600 to-amber-700"
                trend="up"
              />
            </div>

            {/* Recent Poems and Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Poems */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <Clock className="w-6 h-6 ml-3 text-blue-600" />
                  حالیہ نظمیں
                </h3>
                <div className="space-y-4">
                  {poems.slice(0, 5).map((poem, index) => (
                    <div
                      key={poem._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium text-gray-800">
                          {poem.title}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {new Date(poem.createdAt).toLocaleDateString("ur-PK")}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          poem.status === "published"
                            ? "bg-green-100 text-green-800"
                            : poem.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {poem.status === "published"
                          ? "شائع"
                          : poem.status === "pending"
                          ? "زیر نظر"
                          : "مسترد"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Performing Poems */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <Target className="w-6 h-6 ml-3 text-green-600" />
                  بہترین نظمیں
                </h3>
                <div className="space-y-4">
                  {dashboardData.topPoems && dashboardData.topPoems.length > 0 ? (
                    dashboardData.topPoems.slice(0, 5).map((poem, index) => (
                      <div
                        key={poem._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              index === 0
                                ? "bg-yellow-500"
                                : index === 1
                                ? "bg-gray-400"
                                : index === 2
                                ? "bg-amber-600"
                                : "bg-blue-500"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-800">
                              {poem.title}
                            </h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <Eye className="w-3 h-3 mr-1" />
                                {poem.views || 0}
                              </span>
                              <span className="flex items-center">
                                <Heart className="w-3 h-3 mr-1" />
                                {poem.favorites || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">ابھی کوئی نظم نہیں</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Analytics Chart */}
            {analytics && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <Activity className="w-6 h-6 ml-3 text-purple-600" />
                  ماہانہ کارکردگی
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.viewsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="_id" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="#8884d8"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Poems Management Tab - Matching Image Design */}
        {activeTab === "poems" && (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 urdu-text flex items-center">
                <BookOpen className="w-7 h-7 ml-3 text-green-600" />
                نظموں کا انتظام
              </h2>
              <button
                onClick={() => {
                  setSelectedPoem(null);
                  setIsModalOpen(true);
                }}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium urdu-text">نئی نظم</span>
              </button>
            </div>

            {/* Poems Grid */}
            {poems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {poems.map((poem) => (
                  <PoemCard
                    key={poem._id}
                    poem={poem}
                    onEdit={(poem) => {
                      setSelectedPoem(poem);
                      setIsModalOpen(true);
                    }}
                    onDelete={handleDeletePoem}
                    onView={(poem) => {
                      navigate(`/poems/${poem._id}`);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-500 mb-2 urdu-text">
                  ابھی کوئی نظم نہیں
                </h3>
                <p className="text-gray-400 mb-6 urdu-text">
                  اپنی پہلی نظم شامل کریں
                </p>
                <button
                  onClick={() => {
                    setSelectedPoem(null);
                    setIsModalOpen(true);
                  }}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-md urdu-text"
                >
                  نئی نظم لکھیں
                </button>
              </div>
            )}

            {/* Pagination if needed */}
            {poems.length > 0 && (
              <div className="flex justify-center items-center space-x-2 bg-white p-4 rounded-xl shadow-sm">
                <span className="text-sm text-gray-600 urdu-text">
                  کل {poems.length} نظمیں
                </span>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && analytics && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-800 flex items-center">
              <TrendingUp className="w-8 h-8 ml-3 text-orange-600" />
              تفصیلی تجزیات
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Views Over Time */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  نظارات کا رجحان
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.viewsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="_id" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="#10b981"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Distribution */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  اقسام کی تقسیم
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={analytics.categoryDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analytics.categoryDistribution?.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={`hsl(${index * 45}, 70%, 60%)`}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top Performing Poems Table */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                بہترین کارکردگی
              </h3>
              {analytics.topPerformingPoems && analytics.topPerformingPoems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-right py-3 px-4">نظم</th>
                        <th className="text-right py-3 px-4">نظارات</th>
                        <th className="text-right py-3 px-4">پسندیدہ</th>
                        <th className="text-right py-3 px-4">تبصرے</th>
                        <th className="text-right py-3 px-4">اسکور</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topPerformingPoems.map((poem, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-3 px-4 font-medium">{poem.title}</td>
                          <td className="py-3 px-4">{poem.views || 0}</td>
                          <td className="py-3 px-4">{poem.favorites || 0}</td>
                          <td className="py-3 px-4">{poem.comments || 0}</td>
                          <td className="py-3 px-4">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                              {poem.score || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">ابھی کوئی تجزیات نہیں</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && profile && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-800 flex items-center">
              <User className="w-8 h-8 ml-3 text-purple-600" />
              پروفائل کا انتظام
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Picture */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                  پروفائل تصویر
                </h3>
                <div className="text-center">
                  {profile.profileImage?.url ? (
                    <>
                      <img
                        src={profile.profileImage.url.startsWith('http') 
                          ? profile.profileImage.url 
                          : `http://localhost:5000${profile.profileImage.url}`}
                        alt={profile.name}
                        className="w-32 h-32 rounded-full object-cover mx-auto mb-4 border-4 border-purple-200"
                        onError={(e) => {
                          console.error('Image failed to load:', e.target.src);
                          e.target.style.display = 'none';
                          if (e.target.nextElementSibling) {
                            e.target.nextElementSibling.style.display = 'flex';
                          }
                        }}
                        onLoad={(e) => {
                          console.log('Image loaded successfully:', e.target.src);
                        }}
                      />
                      <div 
                        className="w-32 h-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-4xl mx-auto mb-4"
                        style={{ display: 'none' }}
                      >
                        {profile.name?.charAt(0) || "ش"}
                      </div>
                    </>
                  ) : (
                    <div 
                      className="w-32 h-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-4xl mx-auto mb-4"
                    >
                      {profile.name?.charAt(0) || "ش"}
                    </div>
                  )}
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button 
                    type="button"
                    onClick={() => document.getElementById('avatar-upload').click()}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto hover:from-blue-600 hover:to-purple-700 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>تصویر اپ لوڈ کریں</span>
                  </button>
                </div>
              </div>

              {/* Profile Information */}
              <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  مکمل شاعر تفصیلات
                </h3>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  
                  {/* Basic Information */}
                  <div className="border-b pb-4">
                    <h4 className="text-lg font-semibold text-gray-700 mb-4">بنیادی معلومات</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          نام *
                        </label>
                        <input
                          type="text"
                          name="name"
                          defaultValue={profile.name || ""}
                          className="w-full p-3 border border-gray-300 rounded-lg text-right urdu-text-local"
                          dir="rtl"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          تخلص / Pen Name
                        </label>
                        <input
                          type="text"
                          name="penName"
                          defaultValue={profile.penName || ""}
                          className="w-full p-3 border border-gray-300 rounded-lg text-right urdu-text-local"
                          dir="rtl"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          مکمل نام / Full Name
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          defaultValue={profile.fullName || ""}
                          className="w-full p-3 border border-gray-300 rounded-lg text-right urdu-text-local"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          ای میل
                        </label>
                        <input
                          type="email"
                          name="email"
                          defaultValue={profile.email || ""}
                          className="w-full p-3 border border-gray-300 rounded-lg text-right"
                          dir="rtl"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          قومیت / Nationality
                        </label>
                        <input
                          type="text"
                          name="nationality"
                          defaultValue={profile.nationality || ""}
                          className="w-full p-3 border border-gray-300 rounded-lg text-right urdu-text-local"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          دور / Era *
                        </label>
                        <select
                          name="era"
                          defaultValue={profile.era || "contemporary"}
                          className="w-full p-3 border border-gray-300 rounded-lg text-right urdu-text-local"
                          dir="rtl"
                          required
                        >
                          <option value="classical">کلاسیکی / Classical</option>
                          <option value="modern">جدید / Modern</option>
                          <option value="contemporary">عصری / Contemporary</option>
                          <option value="progressive">ترقی پسند / Progressive</option>
                          <option value="traditional">روایتی / Traditional</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Biography */}
                  <div className="border-b pb-4">
                    <h4 className="text-lg font-semibold text-gray-700 mb-4">سوانح / Biography</h4>
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          مختصر تعارف / Short Bio (500 حروف)
                        </label>
                        <input
                          type="text"
                          name="shortBio"
                          maxLength={500}
                          defaultValue={profile.shortBio || ""}
                          className="w-full p-3 border border-gray-300 rounded-lg text-right urdu-text-local"
                          placeholder="ایک مختصر تعارف..."
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          تفصیلی تعارف / Detailed Biography (5000 حروف)
                        </label>
                        <textarea
                          name="bio"
                          rows="6"
                          maxLength={5000}
                          defaultValue={profile.bio || ""}
                          className="w-full p-3 border border-gray-300 rounded-lg text-right urdu-text-local"
                          placeholder="اپنے بارے میں تفصیل سے بتائیں..."
                          dir="rtl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="border-b pb-4">
                    <h4 className="text-lg font-semibold text-gray-700 mb-4">تواریخ / Dates</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          تاریخ پیدائش / Date of Birth
                        </label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          defaultValue={profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : ""}
                          className="w-full p-3 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          تاریخ وفات / Date of Death
                        </label>
                        <input
                          type="date"
                          name="dateOfDeath"
                          defaultValue={profile.dateOfDeath ? new Date(profile.dateOfDeath).toISOString().split('T')[0] : ""}
                          className="w-full p-3 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          زمانہ (شروع) / Period From
                        </label>
                        <input
                          type="number"
                          name="periodFrom"
                          defaultValue={profile.period?.from || ""}
                          placeholder="مثلاً 1900"
                          className="w-full p-3 border border-gray-300 rounded-lg text-right"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          زمانہ (اختتام) / Period To
                        </label>
                        <input
                          type="number"
                          name="periodTo"
                          defaultValue={profile.period?.to || ""}
                          placeholder="مثلاً 1980"
                          className="w-full p-3 border border-gray-300 rounded-lg text-right"
                          dir="rtl"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center space-x-2 space-x-reverse justify-end">
                          <span className="text-sm font-medium text-gray-700">متوفی / Deceased</span>
                          <input
                            type="checkbox"
                            name="isDeceased"
                            defaultChecked={profile.isDeceased || false}
                            className="rounded"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Birth Place */}
                  <div className="border-b pb-4">
                    <h4 className="text-lg font-semibold text-gray-700 mb-4">مقام پیدائش / Birth Place</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          شہر / City
                        </label>
                        <input
                          type="text"
                          name="birthCity"
                          defaultValue={profile.birthPlace?.city || ""}
                          className="w-full p-3 border border-gray-300 rounded-lg text-right urdu-text-local"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          علاقہ / Region
                        </label>
                        <input
                          type="text"
                          name="birthRegion"
                          defaultValue={profile.birthPlace?.region || ""}
                          className="w-full p-3 border border-gray-300 rounded-lg text-right urdu-text-local"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          ملک / Country
                        </label>
                        <input
                          type="text"
                          name="birthCountry"
                          defaultValue={profile.birthPlace?.country || ""}
                          className="w-full p-3 border border-gray-300 rounded-lg text-right urdu-text-local"
                          dir="rtl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Literary Information */}
                  <div className="border-b pb-4">
                    <h4 className="text-lg font-semibold text-gray-700 mb-4">ادبی معلومات / Literary Info</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          مکتب فکر / School of Thought
                        </label>
                        <select
                          name="schoolOfThought"
                          defaultValue={profile.schoolOfThought || ""}
                          className="w-full p-3 border border-gray-300 rounded-lg text-right urdu-text-local"
                          dir="rtl"
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
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          زبانیں / Languages (Ctrl+Click)
                        </label>
                        <select
                          name="languages"
                          multiple
                          defaultValue={profile.languages || []}
                          className="w-full p-3 border border-gray-300 rounded-lg text-right urdu-text-local"
                          dir="rtl"
                          style={{ height: '80px' }}
                        >
                          <option value="urdu">اردو / Urdu</option>
                          <option value="punjabi">پنجابی / Punjabi</option>
                          <option value="english">انگریزی / English</option>
                          <option value="other">دیگر / Other</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                          شاعری کی اقسام / Poetic Styles
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {['ghazal', 'nazm', 'rubai', 'qawwali', 'marsiya', 'salam', 'hamd', 'naat', 'free-verse'].map(style => (
                            <label key={style} className="flex items-center space-x-2 space-x-reverse justify-end">
                              <span className="text-sm capitalize">{style}</span>
                              <input
                                type="checkbox"
                                name="poeticStyle"
                                value={style}
                                defaultChecked={profile.poeticStyle?.includes(style)}
                                className="rounded"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button 
                      type="submit"
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all flex items-center space-x-2"
                    >
                      <span>تبدیلیاں محفوظ کریں</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* AI Assistance Tab */}
        {activeTab === "ai" && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-800 flex items-center">
              <Brain className="w-8 h-8 ml-3 text-indigo-600" />
              AI شاعری مدد گار
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Poem Suggestions */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <Sparkles className="w-5 h-5 ml-2 text-yellow-500" />
                  نظم کی بہتری
                </h3>
                <textarea
                  rows="6"
                  className="w-full p-4 border border-gray-300 rounded-lg text-right mb-4"
                  placeholder="اپنی نظم یہاں لکھیں تاکہ AI آپ کو مشورے دے سکے..."
                  dir="rtl"
                />
                <button className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-lg w-full">
                  AI سے مشورہ لیں
                </button>
              </div>

              {/* Translation */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <Globe className="w-5 h-5 ml-2 text-blue-500" />
                  ترجمہ
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                      اصل نظم
                    </label>
                    <textarea
                      rows="4"
                      className="w-full p-3 border border-gray-300 rounded-lg text-right"
                      placeholder="ترجمے کے لیے نظم لکھیں..."
                      dir="rtl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      className="p-3 border border-gray-300 rounded-lg text-right"
                      dir="rtl"
                    >
                      <option>اردو سے</option>
                      <option>انگریزی سے</option>
                    </select>
                    <select
                      className="p-3 border border-gray-300 rounded-lg text-right"
                      dir="rtl"
                    >
                      <option>انگریزی میں</option>
                      <option>اردو میں</option>
                    </select>
                  </div>
                  <button className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-3 rounded-lg w-full">
                    ترجمہ کریں
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === "achievements" && dashboardData && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 urdu-text flex items-center">
              <Award className="w-7 h-7 ml-3 text-yellow-600" />
              منتخبات اور کامیابیاں
            </h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-8 h-8 opacity-80" />
                  <span className="text-3xl font-bold">
                    {dashboardData.overview?.totalPoems || 0}
                  </span>
                </div>
                <p className="text-sm opacity-90 urdu-text">کل نظمیں</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Eye className="w-8 h-8 opacity-80" />
                  <span className="text-3xl font-bold">
                    {dashboardData.overview?.totalViews || 0}
                  </span>
                </div>
                <p className="text-sm opacity-90 urdu-text">کل نظارات</p>
              </div>

              <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Heart className="w-8 h-8 opacity-80" />
                  <span className="text-3xl font-bold">
                    {dashboardData.overview?.totalFavorites || 0}
                  </span>
                </div>
                <p className="text-sm opacity-90 urdu-text">پسندیدہ</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Star className="w-8 h-8 opacity-80" />
                  <span className="text-3xl font-bold">
                    {dashboardData.overview?.publishedPoems || 0}
                  </span>
                </div>
                <p className="text-sm opacity-90 urdu-text">شائع شدہ</p>
              </div>
            </div>

            {/* Recent and Top Poems */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Poems */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4 urdu-text">
                  حالیہ نظمیں
                </h3>
                <div className="space-y-3">
                  {dashboardData.recentPoems?.slice(0, 5).map((poem) => (
                    <div
                      key={poem._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 urdu-text">
                          {poem.title}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {new Date(poem.createdAt).toLocaleDateString("ur-PK")}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          poem.status === "published"
                            ? "bg-green-100 text-green-800"
                            : poem.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {poem.status === "published"
                          ? "شائع"
                          : poem.status === "pending"
                          ? "زیر نظر"
                          : "مسترد"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Poems */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4 urdu-text">
                  مقبول نظمیں
                </h3>
                <div className="space-y-3">
                  {dashboardData.topPoems?.slice(0, 5).map((poem, index) => (
                    <div
                      key={poem._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            index === 0
                              ? "bg-yellow-500"
                              : index === 1
                              ? "bg-gray-400"
                              : index === 2
                              ? "bg-amber-600"
                              : "bg-blue-500"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800 urdu-text">
                            {poem.title}
                          </h4>
                          <div className="flex items-center space-x-3 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Eye className="w-3 h-3 ml-1" />
                              {poem.views || 0}
                            </span>
                            <span className="flex items-center">
                              <Heart className="w-3 h-3 ml-1" />
                              {poem.bookmarks?.length || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "settings" && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-800 flex items-center">
              <Settings className="w-8 h-8 ml-3 text-gray-600" />
              ترتیبات
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Notification Settings */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  اطلاعات کی ترتیبات
                </h3>
                <div className="space-y-4">
                  {[
                    { label: "نئے پیروکار", enabled: true },
                    { label: "نظم پر تبصرے", enabled: true },
                    { label: "نظم کو پسند", enabled: false },
                    { label: "ای میل اطلاعات", enabled: true },
                  ].map((setting, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-gray-700 font-medium">
                        {setting.label}
                      </span>
                      <div
                        className={`w-12 h-6 ${
                          setting.enabled ? "bg-green-500" : "bg-gray-300"
                        } rounded-full relative cursor-pointer transition-colors`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                            setting.enabled
                              ? "translate-x-6"
                              : "translate-x-0.5"
                          }`}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  پرائیویسی
                </h3>
                <div className="space-y-4">
                  {[
                    { label: "پروفائل عوامی ہے", enabled: true },
                    { label: "نظمیں عوامی ہیں", enabled: true },
                    { label: "پیروکاروں کی فہرست چھپائیں", enabled: false },
                    { label: "تجزیات چھپائیں", enabled: false },
                  ].map((setting, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-gray-700 font-medium">
                        {setting.label}
                      </span>
                      <div
                        className={`w-12 h-6 ${
                          setting.enabled ? "bg-green-500" : "bg-gray-300"
                        } rounded-full relative cursor-pointer transition-colors`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                            setting.enabled
                              ? "translate-x-6"
                              : "translate-x-0.5"
                          }`}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Poem Form Modal */}
      <PoemFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        poem={selectedPoem}
        onSave={handleSavePoem}
      />
    </div>
  );
};

export default PoetDashboard;

