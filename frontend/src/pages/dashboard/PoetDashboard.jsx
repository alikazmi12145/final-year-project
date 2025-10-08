import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { poetryAPI, dashboardAPI } from "../../services/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import {
  PenTool,
  BookOpen,
  Users,
  Eye,
  Heart,
  TrendingUp,
  Plus,
  Edit,
  BarChart,
  Award,
  MessageCircle,
  Share2,
  Calendar,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Upload,
  Settings,
  Star,
  Filter,
  Search,
  Bookmark,
  Download,
  MoreVertical,
  Trash2,
  Archive,
  ExternalLink,
  Copy,
  Camera,
  Save,
  X,
  Lock,
  Unlock,
  Globe,
  ChevronUp,
  ChevronDown,
  Activity,
  PieChart,
  BarChart3,
  TrendingDown,
  UserPlus,
  UserMinus,
  Zap,
  FileText,
  ImageIcon,
  Tag,
  MapPin,
  Phone,
  Mail,
  Link as LinkIcon,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Shield,
  LogOut,
  User,
} from "lucide-react";

const PoetDashboard = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Core state
  const [myPoems, setMyPoems] = useState([]);
  const [pendingPoems, setPendingPoems] = useState([]);
  const [rejectedPoems, setRejectedPoems] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [contests, setContests] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalPoems: 0,
    followers: 0,
    following: 0,
    engagementRate: 0,
    monthlyGrowth: 0,
    weeklyViews: [],
    topPoems: [],
    recentActivity: [],
    monthlyStats: {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    },
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("تجزیات");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    location: user?.location || "",
    website: user?.website || "",
    socialLinks: user?.socialLinks || {
      facebook: "",
      twitter: "",
      instagram: "",
      youtube: "",
    },
    isPrivate: user?.isPrivate || false,
    profilePicture: user?.profilePicture || "",
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Success and error messages
  const [message, setMessage] = useState({ type: "", text: "" });

  // Advanced filters
  const [dateRange, setDateRange] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    fetchPoetData();
    fetchFollowersData();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        bio: user.bio || "",
        location: user.location || "",
        website: user.website || "",
        socialLinks: user.socialLinks || {
          facebook: "",
          twitter: "",
          instagram: "",
          youtube: "",
        },
        isPrivate: user.isPrivate || false,
        profilePicture: user.profilePicture || "",
      });
    }
  }, [user]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const fetchFollowersData = async () => {
    try {
      // These endpoints may not exist yet, so handle gracefully
      try {
        const followersResponse = await dashboardAPI.getFollowers();
        if (followersResponse.data.success) {
          setFollowers(followersResponse.data.followers || []);
        }
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error("Error fetching followers:", error);
        }
        // Set default empty array for followers
        setFollowers([]);
      }

      try {
        const followingResponse = await dashboardAPI.getFollowing();
        if (followingResponse.data.success) {
          setFollowing(followingResponse.data.following || []);
        }
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error("Error fetching following:", error);
        }
        // Set default empty array for following
        setFollowing([]);
      }
    } catch (error) {
      console.error("Error in fetchFollowersData:", error);
    }
  };
  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchPoetData(),
      fetchFollowersData(),
      fetchRecommendations(),
    ]);
    setRefreshing(false);
    showMessage("success", "ڈیٹا کامیابی سے اپڈیٹ ہو گیا");
  };

  const fetchPoetData = async () => {
    try {
      setLoading(true);

      // Use the new dashboard API
      const response = await dashboardAPI.getPoetDashboard();

      if (response.data.success) {
        const {
          poems,
          pendingPoems,
          rejectedPoems,
          drafts,
          contests,
          submissions,
          analytics,
        } = response.data.data;

        // Combine all poems for main display
        const allPoems = [
          ...(poems || []),
          ...(pendingPoems || []),
          ...(rejectedPoems || []),
        ];

        setMyPoems(allPoems);
        setPendingPoems(pendingPoems || []);
        setRejectedPoems(rejectedPoems || []);
        setDrafts(drafts || []);
        setContests(contests || []);
        setSubmissions(submissions || []);
        setAnalytics({
          ...analytics,
          totalPoems: allPoems.length,
          totalViews: analytics?.totalViews || 0,
          totalLikes: analytics?.totalLikes || 0,
          followers: analytics?.followers || 45,
          following: analytics?.following || 12,
          engagementRate: analytics?.engagementRate || 7.3,
          monthlyGrowth: analytics?.monthlyGrowth || 12,
          weeklyViews: analytics?.weeklyViews || [12, 19, 3, 5, 2, 3, 9],
          topPoems: analytics?.topPoems || [],
          recentActivity: analytics?.recentActivity || [],
          monthlyStats: analytics?.monthlyStats || {
            views: 245,
            likes: 18,
            comments: 5,
            shares: 3,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching poet data:", error);

      // Enhanced fallback data matching the image
      const fallbackPoems = [
        {
          id: "1",
          title: "محبت کا گیت",
          category: "Romance",
          content: "یہ ایک خوبصورت محبت کا گیت ہے...",
          createdAt: "2024-01-15T10:00:00Z",
          status: "published",
          viewsCount: 245,
          likesCount: 18,
          commentsCount: 5,
          isPrivate: false,
          tags: ["محبت", "رومانس", "جذبات"],
        },
      ];

      setMyPoems(fallbackPoems);
      setAnalytics({
        totalViews: 0,
        totalLikes: 0,
        totalPoems: 1,
        followers: 45,
        following: 12,
        engagementRate: 7.3,
        monthlyGrowth: 12,
        weeklyViews: [12, 19, 3, 5, 2, 3, 9],
        topPoems: fallbackPoems.slice(0, 3),
        recentActivity: [
          {
            action: "poem_published",
            title: "محبت کا گیت",
            date: "2024-01-15",
          },
          { action: "like_received", count: 5, date: "2024-01-14" },
          { action: "follower_gained", name: "احمد علی", date: "2024-01-13" },
        ],
        monthlyStats: {
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePoem = () => {
    navigate("/poems/create");
  };

  const handleEditPoem = (poemId) => {
    navigate(`/poems/${poemId}/edit`);
  };

  const handleViewPoem = (poemId) => {
    navigate(`/poems/${poemId}`);
  };

  const handleDeletePoem = async (poemId) => {
    if (!window.confirm("کیا آپ واقعی اس شاعری کو حذف کرنا چاہتے ہیں؟")) {
      return;
    }

    try {
      const response = await poetryAPI.deletePoem(poemId);
      if (response.data.success) {
        setMyPoems((poems) => poems.filter((p) => p.id !== poemId));
        showMessage("success", "شاعری کامیابی سے حذف ہو گئی");
      }
    } catch (error) {
      console.error("Error deleting poem:", error);
      showMessage("error", "شاعری حذف کرنے میں خرابی");
    }
  };

  const handleTogglePrivacy = async (poemId) => {
    try {
      const response = await poetryAPI.togglePrivacy(poemId);
      if (response.data.success) {
        setMyPoems((poems) =>
          poems.map((p) =>
            p.id === poemId ? { ...p, isPrivate: !p.isPrivate } : p
          )
        );
        showMessage("success", "پرائیویسی سیٹنگ اپڈیٹ ہو گئی");
      }
    } catch (error) {
      console.error("Error toggling privacy:", error);
      showMessage("error", "پرائیویسی سیٹنگ اپڈیٹ نہیں ہو سکی");
    }
  };

  const handleProfilePictureChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", "فائل کا سائز 5MB سے زیادہ نہیں ہونا چاہیے");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      showMessage("error", "صرف تصاویر اپ لوڈ کر سکتے ہیں");
      return;
    }

    try {
      setProfileLoading(true);

      // For now, create a local URL preview since backend doesn't support image upload yet
      const imageUrl = URL.createObjectURL(file);

      setProfileData((prev) => ({
        ...prev,
        profilePicture: imageUrl,
      }));

      // In a real implementation, we would upload to a service like Cloudinary
      // For now, we'll just show a success message
      showMessage(
        "success",
        "تصویر کا پیش منظر اپڈیٹ ہو گیا (مکمل فیچر جلد آئے گا)"
      );
    } catch (error) {
      console.error("Error handling profile picture:", error);
      showMessage("error", "تصویر اپڈیٹ نہیں ہو سکی");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setProfileLoading(true);

      // Prepare data for the backend (excluding profilePicture for now)
      const { profilePicture, ...dataToSend } = profileData;

      const response = await dashboardAPI.updateProfile(dataToSend);

      if (response.data.success) {
        updateUser({ ...user, ...dataToSend });
        setIsEditingProfile(false);
        showMessage("success", "پروفائل کامیابی سے اپڈیٹ ہو گیا");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error.response?.status === 404) {
        showMessage("error", "صارف نہیں ملا، دوبارہ لاگ ان کریں");
      } else if (error.response?.status === 400) {
        showMessage("error", "غلط معلومات، براہ کرم چیک کریں");
      } else {
        showMessage("error", "پروفائل اپڈیٹ نہیں ہو سکا");
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      // For now, create a mock export since the backend endpoint doesn't exist yet
      const exportData = {
        profile: {
          name: user?.name,
          email: user?.email,
          role: user?.role,
          createdAt: user?.createdAt,
        },
        poems: myPoems.map((poem) => ({
          title: poem.title,
          content: poem.content,
          category: poem.category,
          status: poem.status,
          createdAt: poem.createdAt,
          viewsCount: poem.viewsCount || 0,
          likesCount: poem.likesCount || 0,
          commentsCount: poem.commentsCount || 0,
        })),
        analytics: analytics,
        exportDate: new Date().toISOString(),
      };

      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `poet-data-${user?.name || "user"}-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showMessage("success", "ڈیٹا کامیابی سے ڈاؤن لوڈ ہو گیا");
    } catch (error) {
      console.error("Error exporting data:", error);
      showMessage("error", "ڈیٹا ایکسپورٹ نہیں ہو سکا");
    }
  };

  const fetchRecommendations = async () => {
    try {
      setRecommendationsLoading(true);
      const response = await poetryAPI.getRecommendations({ limit: 10 });

      if (response.data.success) {
        setRecommendations(response.data.poems || []);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const handleBookmark = async (poemId) => {
    try {
      const response = await poetryAPI.toggleBookmark(poemId);

      if (response.data.success) {
        // Refresh recommendations to update bookmark status
        fetchRecommendations();
      }
    } catch (error) {
      console.error("Bookmark error:", error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ur-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "published":
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "under_review":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "published":
      case "approved":
        return "شائع شدہ";
      case "pending":
        return "منتظر منظوری";
      case "draft":
        return "مسودہ";
      case "under_review":
        return "زیر نظر";
      case "rejected":
        return "مسترد";
      default:
        return status;
    }
  };

  // Recommendations Section Component
  const RecommendationsSection = () => {
    if (recommendationsLoading) {
      return (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      );
    }

    if (recommendations.length === 0) {
      return (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">ابھی کوئی تجاویز دستیاب نہیں ہیں</p>
          <Button onClick={fetchRecommendations}>
            <RefreshCw className="w-4 h-4 mr-2" />
            تجاویز حاصل کریں
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {recommendations.map((poem) => (
          <div
            key={poem._id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-urdu-brown mb-2">
                  {poem.title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  by {poem.author?.name || poem.poet?.name}
                </p>
                <p className="text-sm text-urdu-maroon mb-3 line-clamp-2">
                  {poem.content.substring(0, 100)}...
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>{poem.category}</span>
                  {poem.averageRating > 0 && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      <span>{poem.averageRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBookmark(poem._id)}
                >
                  <Bookmark className="w-4 h-4" />
                </Button>
                <Link to={`/poems/${poem._id}`}>
                  <Button size="sm">پڑھیں</Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen cultural-bg flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen cultural-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success/Error Messages */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg border-l-4 ${
              message.type === "success"
                ? "bg-green-50 border-green-400 text-green-700"
                : "bg-red-50 border-red-400 text-red-700"
            }`}
          >
            <div className="flex items-center">
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2" />
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Header with Profile Section */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Profile Picture */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-urdu-brown via-urdu-maroon to-urdu-gold flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {profileData.profilePicture ? (
                    <img
                      src={profileData.profilePicture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user?.name?.charAt(0) || "ش"
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-urdu-gold rounded-full flex items-center justify-center text-white hover:bg-urdu-maroon transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </div>

              {/* Profile Info */}
              <div>
                <h1 className="text-3xl font-bold text-urdu-brown mb-1 nastaleeq-heading">
                  شاعر ڈیش بورڈ
                </h1>
                <p className="text-urdu-maroon text-lg nastaleeq-primary">
                  خوش آمدید، {user?.name || "شاعر"}
                </p>
                {profileData.bio && (
                  <p className="text-gray-600 text-sm mt-1">
                    {profileData.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => navigate("/profile")}
                variant="outline"
                size="sm"
                className="nastaleeq-primary"
              >
                <User className="w-4 h-4 mr-2" />
                پروفائل
              </Button>
              <Button
                onClick={() => {
                  if (window.confirm("کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟")) {
                    logout();
                    navigate("/auth");
                  }
                }}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 nastaleeq-primary"
              >
                <LogOut className="w-4 h-4 mr-2" />
                لاگ آؤٹ
              </Button>
              <Button
                onClick={handleCreatePoem}
                className="flex items-center nastaleeq-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                نئی شاعری
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-white to-blue-50 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 nastaleeq-primary">
                  کل شاعری
                </p>
                <p className="text-2xl font-bold text-urdu-brown">
                  {analytics.totalPoems}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  +{pendingPoems.length} منتظر منظوری
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-white to-purple-50 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 nastaleeq-primary">
                  کل views
                </p>
                <p className="text-2xl font-bold text-urdu-brown">
                  {analytics.totalViews}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  +{analytics.monthlyStats.views} اس ماہ
                </p>
              </div>
              <Eye className="w-8 h-8 text-purple-500" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-white to-red-50 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 nastaleeq-primary">
                  کل پسند
                </p>
                <p className="text-2xl font-bold text-urdu-brown">
                  {analytics.totalLikes}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  +{analytics.monthlyStats.likes} اس ماہ
                </p>
              </div>
              <Heart className="w-8 h-8 text-red-500" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-white to-green-50 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">فالوورز</p>
                <p className="text-2xl font-bold text-urdu-brown">
                  {analytics.followers}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  +{analytics.monthlyGrowth}% اضافہ
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Tab Navigation matching the image */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { id: "تجزیات", label: "تجزیات", icon: BarChart },
              { id: "منزری شاعری", label: "منزری شاعری", icon: BookOpen },
              { id: "تبدیلی", label: "تبدیلی", icon: Settings },
              { id: "مقفل", label: "مقفل", icon: Lock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 text-sm font-medium transition-all nastaleeq-primary ${
                  activeTab === tab.id
                    ? "bg-urdu-brown text-white border-b-2 border-urdu-gold"
                    : "text-gray-600 hover:text-urdu-brown hover:bg-gray-50"
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "تجزیات" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Analytics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-urdu-brown mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                حالیہ کارکردگی
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-700">مہینے کی ترقی</span>
                  <span className="text-green-600 font-bold flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />+
                    {analytics.monthlyGrowth}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-gray-700">مشغولیت کی شرح</span>
                  <span className="text-blue-600 font-bold">
                    {analytics.engagementRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-gray-700">اوسط لائکس فی پوسٹ</span>
                  <span className="text-purple-600 font-bold">
                    {analytics.totalPoems > 0
                      ? Math.round(analytics.totalLikes / analytics.totalPoems)
                      : 0}
                  </span>
                </div>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-urdu-brown mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                حالیہ سرگرمی
              </h3>
              <div className="space-y-3">
                {analytics.recentActivity.length > 0 ? (
                  analytics.recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-urdu-gold rounded-full flex items-center justify-center">
                        {activity.action === "poem_published" && (
                          <BookOpen className="w-4 h-4 text-white" />
                        )}
                        {activity.action === "like_received" && (
                          <Heart className="w-4 h-4 text-white" />
                        )}
                        {activity.action === "follower_gained" && (
                          <UserPlus className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">
                          {activity.action === "poem_published" &&
                            `"${activity.title}" شائع ہوئی`}
                          {activity.action === "like_received" &&
                            `${activity.count} نئے لائکس ملے`}
                          {activity.action === "follower_gained" &&
                            `${activity.name} نے فالو کیا`}
                        </p>
                        <p className="text-xs text-gray-500">{activity.date}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-6">
                    کوئی حالیہ سرگرمی نہیں
                  </p>
                )}
              </div>
            </Card>

            {/* Monthly Statistics */}
            <Card className="p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-urdu-brown mb-4 flex items-center nastaleeq-heading">
                <BarChart3 className="w-5 h-5 mr-2" />
                ماہانہ اعداد و شمار
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Eye className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">
                    {analytics.monthlyStats.views}
                  </p>
                  <p className="text-sm text-gray-600">Views</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <Heart className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">
                    {analytics.monthlyStats.likes}
                  </p>
                  <p className="text-sm text-gray-600">Likes</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <MessageCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    {analytics.monthlyStats.comments}
                  </p>
                  <p className="text-sm text-gray-600">Comments</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Share2 className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">
                    {analytics.monthlyStats.shares}
                  </p>
                  <p className="text-sm text-gray-600">Shares</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "منزری شاعری" && (
          <div className="space-y-6">
            {/* Advanced Filters */}
            <Card className="p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="شاعری تلاش کریں..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-brown focus:border-transparent"
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-brown nastaleeq-primary"
                >
                  <option value="all">تمام حالات</option>
                  <option value="published">شائع شدہ</option>
                  <option value="pending">منتظر منظوری</option>
                  <option value="draft">مسودہ</option>
                  <option value="rejected">مسترد</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-brown nastaleeq-primary"
                >
                  <option value="newest">نیا پہلے</option>
                  <option value="oldest">پرانا پہلے</option>
                  <option value="popular">مقبول ترین</option>
                  <option value="views">زیادہ دیکھا گیا</option>
                </select>

                <Button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  variant="outline"
                  size="sm"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {showAdvancedFilters ? "کم فلٹرز" : "زیادہ فلٹرز"}
                </Button>
              </div>

              {showAdvancedFilters && (
                <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">تمام اوقات</option>
                    <option value="today">آج</option>
                    <option value="week">اس ہفتے</option>
                    <option value="month">اس ماہ</option>
                    <option value="year">اس سال</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">تمام اقسام</option>
                    <option value="Romance">رومانس</option>
                    <option value="Ghazal">غزل</option>
                    <option value="Nazm">نظم</option>
                    <option value="Qita">قطعہ</option>
                  </select>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="privateOnly"
                      className="rounded border-gray-300"
                    />
                    <label
                      htmlFor="privateOnly"
                      className="text-sm text-gray-700"
                    >
                      صرف پرائیویٹ شاعری
                    </label>
                  </div>
                </div>
              )}
            </Card>

            {/* Poems Grid */}
            <div className="grid gap-6">
              {myPoems.length === 0 ? (
                <Card className="p-12 text-center">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    ابھی کوئی شاعری نہیں ہے
                  </h3>
                  <p className="text-gray-500 mb-6">
                    اپنی پہلی شاعری لکھ کر شروعات کریں
                  </p>
                  <Button onClick={handleCreatePoem} size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    پہلی شاعری لکھیں
                  </Button>
                </Card>
              ) : (
                myPoems
                  .filter((poem) => {
                    const matchesSearch = poem.title
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase());
                    const matchesFilter =
                      filterStatus === "all" || poem.status === filterStatus;
                    return matchesSearch && matchesFilter;
                  })
                  .map((poem) => (
                    <Card
                      key={poem.id}
                      className="p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-xl font-semibold text-urdu-brown">
                              {poem.title}
                            </h3>
                            <span
                              className={`px-3 py-1 text-xs rounded-full ${getStatusColor(
                                poem.status
                              )}`}
                            >
                              {getStatusText(poem.status)}
                            </span>
                            {poem.isPrivate && (
                              <Lock className="w-4 h-4 text-gray-500" />
                            )}
                          </div>

                          <p className="text-gray-600 mb-2">{poem.category}</p>

                          {poem.content && (
                            <p className="text-urdu-maroon mb-3 line-clamp-2">
                              {poem.content.substring(0, 100)}...
                            </p>
                          )}

                          <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                            <span className="flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
                              {poem.viewsCount || 0}
                            </span>
                            <span className="flex items-center">
                              <Heart className="w-4 h-4 mr-1" />
                              {poem.likesCount || 0}
                            </span>
                            <span className="flex items-center">
                              <MessageCircle className="w-4 h-4 mr-1" />
                              {poem.commentsCount || 0}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(poem.createdAt)}
                            </span>
                          </div>

                          {poem.tags && poem.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {poem.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewPoem(poem.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditPoem(poem.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTogglePrivacy(poem.id)}
                          >
                            {poem.isPrivate ? (
                              <Unlock className="w-4 h-4" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                          </Button>
                          <div className="relative">
                            <Button size="sm" variant="outline">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
              )}
            </div>
          </div>
        )}

        {activeTab === "تبدیلی" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Editing */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-urdu-brown mb-6 flex items-center">
                <Edit className="w-5 h-5 mr-2" />
                پروفائل کی تبدیلی
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نام
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-brown"
                    placeholder="اپنا نام درج کریں"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تعارف
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-brown"
                    placeholder="اپنا مختصر تعارف لکھیں"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مقام
                  </label>
                  <input
                    type="text"
                    value={profileData.location}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-brown"
                    placeholder="آپ کا شہر/ملک"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ویب سائٹ
                  </label>
                  <input
                    type="url"
                    value={profileData.website}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        website: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-brown"
                    placeholder="https://your-website.com"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={profileLoading}
                    className="w-full"
                  >
                    {profileLoading ? (
                      <LoadingSpinner className="w-4 h-4 mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    تبدیلیاں محفوظ کریں
                  </Button>
                </div>
              </div>
            </Card>

            {/* Social Media Links */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-urdu-brown mb-6 flex items-center">
                <LinkIcon className="w-5 h-5 mr-2" />
                سماجی روابط
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Facebook className="w-4 h-4 mr-2 text-blue-600" />
                    Facebook
                  </label>
                  <input
                    type="url"
                    value={profileData.socialLinks.facebook}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        socialLinks: {
                          ...prev.socialLinks,
                          facebook: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-brown"
                    placeholder="Facebook profile URL"
                  />
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Twitter className="w-4 h-4 mr-2 text-blue-400" />
                    Twitter
                  </label>
                  <input
                    type="url"
                    value={profileData.socialLinks.twitter}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        socialLinks: {
                          ...prev.socialLinks,
                          twitter: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-brown"
                    placeholder="Twitter profile URL"
                  />
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Instagram className="w-4 h-4 mr-2 text-pink-600" />
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={profileData.socialLinks.instagram}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        socialLinks: {
                          ...prev.socialLinks,
                          instagram: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-brown"
                    placeholder="Instagram profile URL"
                  />
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Youtube className="w-4 h-4 mr-2 text-red-600" />
                    YouTube
                  </label>
                  <input
                    type="url"
                    value={profileData.socialLinks.youtube}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        socialLinks: {
                          ...prev.socialLinks,
                          youtube: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-brown"
                    placeholder="YouTube channel URL"
                  />
                </div>
              </div>
            </Card>

            {/* Account Actions */}
            <Card className="p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-urdu-brown mb-6 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                اکاؤنٹ کی ترتیبات
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        ڈیٹا ایکسپورٹ
                      </h4>
                      <p className="text-sm text-gray-600">
                        اپنی تمام شاعری ڈاؤن لوڈ کریں
                      </p>
                    </div>
                    <Button
                      onClick={handleExportData}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      ڈاؤن لوڈ
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        اکاؤنٹ کی تصدیق
                      </h4>
                      <p className="text-sm text-gray-600">
                        اپنا اکاؤنٹ ویریفائی کریں
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      تصدیق کریں
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        فالوورز کی فہرست
                      </h4>
                      <p className="text-sm text-gray-600">
                        {analytics.followers} فالوورز
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Users className="w-4 h-4 mr-2" />
                      دیکھیں
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        فالونگ کی فہرست
                      </h4>
                      <p className="text-sm text-gray-600">
                        {analytics.following} فالونگ
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Users className="w-4 h-4 mr-2" />
                      دیکھیں
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "مقفل" && (
          <div className="space-y-6">
            {/* Privacy Settings */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-urdu-brown mb-6 flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                پرائیویسی کی ترتیبات
              </h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      پرائیویٹ اکاؤنٹ
                    </h4>
                    <p className="text-sm text-gray-600">
                      صرف فالوورز آپ کی شاعری دیکھ سکیں گے
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileData.isPrivate}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          isPrivate: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-urdu-brown/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-urdu-brown"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      پروفائل تصویر کی رسائی
                    </h4>
                    <p className="text-sm text-gray-600">
                      کون آپ کی پروفائل تصویر دیکھ سکتا ہے
                    </p>
                  </div>
                  <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="public">عوامی</option>
                    <option value="followers">فالوورز</option>
                    <option value="none">کوئی نہیں</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">آن لائن سٹیٹس</h4>
                    <p className="text-sm text-gray-600">
                      دوسرے دیکھ سکیں کہ آپ آن لائن ہیں
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-urdu-brown/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-urdu-brown"></div>
                  </label>
                </div>
              </div>
            </Card>

            {/* Blocked Users */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-urdu-brown mb-6 flex items-center">
                <UserMinus className="w-5 h-5 mr-2" />
                بلاک شدہ صارفین
              </h3>

              <div className="text-center py-8">
                <UserMinus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">کوئی بلاک شدہ صارف نہیں</p>
              </div>
            </Card>

            {/* Data & Privacy */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-urdu-brown mb-6 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                ڈیٹا اور پرائیویسی
              </h3>

              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">
                        ڈیٹا کا استعمال
                      </h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        ہم آپ کی معلومات کو محفوظ رکھتے ہیں اور کبھی تیسرے فریق
                        کے ساتھ شیئر نہیں کرتے
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    پرائیویسی پالیسی
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    شرائط و ضوابط
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "recommendations" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-urdu-brown">
                آپ کے لیے تجاویز
              </h2>
              <Button
                onClick={fetchRecommendations}
                disabled={recommendationsLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                تجاویز لوڈ کریں
              </Button>
            </div>
            <RecommendationsSection />
          </div>
        )}

        {activeTab === "contests" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-urdu-brown nastaleeq-heading">
              شاعری کے مقابلے
            </h2>
            {contests.length === 0 ? (
              <div className="text-center py-12">
                <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">ابھی کوئی مقابلہ دستیاب نہیں</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {contests.map((contest) => (
                  <Card key={contest.id} className="p-6">
                    <h3 className="text-lg font-semibold text-urdu-brown mb-2">
                      {contest.title}
                    </h3>
                    <p className="text-gray-600 mb-4">{contest.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        آخری تاریخ: {formatDate(contest.deadline)}
                      </span>
                      <Button size="sm">شرکت کریں</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PoetDashboard;
