import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useMessage } from "../../context/MessageContext";
import { poetryAPI, dashboardAPI } from "../../services/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import {
  BookOpen,
  Heart,
  Eye,
  Star,
  Bookmark,
  TrendingUp,
  Users,
  MessageCircle,
  Share2,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Award,
  Trophy,
  Clock,
  ChevronRight,
  BookmarkPlus,
  User,
  LogOut,
  Settings,
  History,
  Download,
  FileText,
  Tag,
  Globe,
  Zap,
  Activity,
  PieChart,
  BarChart3,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Target,
  Sparkles,
  Coffee,
  Music,
  Palette,
  Camera,
} from "lucide-react";

const ReaderDashboard = () => {
  const { user, logout } = useAuth();
  const { showConfirm } = useMessage();
  const navigate = useNavigate();

  // Core state
  const [poems, setPoems] = useState([]);
  const [bookmarkedPoems, setBookmarkedPoems] = useState([]);
  const [readingHistory, setReadingHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [followedPoets, setFollowedPoets] = useState([]);
  const [contests, setContests] = useState([]);
  const [categories, setCategories] = useState([]);

  // Analytics state
  const [readerStats, setReaderStats] = useState({
    totalPoemsRead: 0,
    totalReadingTime: 0,
    favoriteCategory: "غزل",
    favoritePoet: "",
    readingStreak: 0,
    bookmarksCount: 0,
    commentsCount: 0,
    likesGiven: 0,
    contestsParticipated: 0,
    monthlyActivity: {
      poemsRead: 0,
      timeSpent: 0,
      likes: 0,
      comments: 0,
    },
    weeklyReadingData: [5, 8, 12, 6, 9, 15, 11],
    topCategories: [
      { category: "غزل", count: 25, percentage: 35 },
      { category: "نظم", count: 18, percentage: 25 },
      { category: "رومانس", count: 15, percentage: 21 },
      { category: "قطعہ", count: 14, percentage: 19 },
    ],
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("خلاصہ");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchReaderData();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const fetchReaderData = async () => {
    try {
      setLoading(true);

      // Try to use the dashboard API first
      try {
        const response = await dashboardAPI.getReaderDashboard();
        if (response.data.success) {
          const {
            poems,
            bookmarks,
            readingHistory,
            recommendations,
            followedPoets,
            contests,
            analytics,
          } = response.data.data;

          setPoems(poems || []);
          setBookmarkedPoems(bookmarks || []);
          setReadingHistory(readingHistory || []);
          setRecommendations(recommendations || []);
          setFollowedPoets(followedPoets || []);
          setContests(contests || []);
          setReaderStats({
            ...readerStats,
            ...analytics,
          });
        }
      } catch (apiError) {
        // If dashboard API doesn't exist, fall back to individual APIs
        await fetchFallbackData();
      }
    } catch (error) {
      console.error("Error fetching reader data:", error);
      setMessage({
        type: "error",
        text: "ڈیٹا لوڈ کرنے میں خرابی ہوئی",
      });
      // Use fallback data for demo
      setPoems([
        {
          _id: "1",
          title: "محبت کا گیت",
          poet: { name: "احمد فراز" },
          category: "غزل",
          content: "یہ ایک خوبصورت محبت کا گیت ہے...",
          views: 245,
          likes: 18,
          averageRating: 4.5,
          publishedAt: "2024-01-15",
          isBookmarked: false,
        },
        {
          _id: "2",
          title: "وطن کی مٹی",
          poet: { name: "علامہ اقبال" },
          category: "نظم",
          content: "اے وطن کی مٹی، تجھ پر لٹ جائیں...",
          views: 189,
          likes: 24,
          averageRating: 4.8,
          publishedAt: "2024-01-12",
          isBookmarked: true,
        },
        {
          _id: "3",
          title: "بارش کی رات",
          poet: { name: "پروین شاکر" },
          category: "رومانس",
          content: "بارش کی رات میں تیری یاد آئی...",
          views: 156,
          likes: 12,
          averageRating: 4.2,
          publishedAt: "2024-01-10",
          isBookmarked: false,
        },
      ]);

      setReaderStats({
        totalPoemsRead: 47,
        totalReadingTime: 125,
        favoriteCategory: "غزل",
        favoritePoet: "احمد فراز",
        readingStreak: 7,
        bookmarksCount: 12,
        commentsCount: 8,
        likesGiven: 23,
        contestsParticipated: 2,
        monthlyActivity: {
          poemsRead: 15,
          timeSpent: 45,
          likes: 8,
          comments: 3,
        },
        weeklyReadingData: [5, 8, 12, 6, 9, 15, 11],
        topCategories: [
          { category: "غزل", count: 25, percentage: 35 },
          { category: "نظم", count: 18, percentage: 25 },
          { category: "رومانس", count: 15, percentage: 21 },
          { category: "قطعہ", count: 14, percentage: 19 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFallbackData = async () => {
    // Fetch poems
    const poemsRes = await poetryAPI.getAllPoems();
    if (poemsRes.data && poemsRes.data.poems) {
      setPoems(poemsRes.data.poems);
    }

    // Fetch bookmarks (if API exists)
    try {
      const bookmarksRes = await poetryAPI.getBookmarks();
      if (bookmarksRes.data.success) {
        setBookmarkedPoems(bookmarksRes.data.bookmarks || []);
      }
    } catch (error) {
      console.log("Bookmarks API not available");
    }

    // Fetch recommendations
    try {
      const recommendationsRes = await poetryAPI.getRecommendations();
      if (recommendationsRes.data.success) {
        setRecommendations(recommendationsRes.data.poems || []);
      }
    } catch (error) {
      console.log("Recommendations API not available");
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchReaderData();
    setRefreshing(false);
    showMessage("success", "ڈیٹا کامیابی سے اپڈیٹ ہو گیا");
  };

  const handleBookmark = async (poemId) => {
    try {
      const response = await poetryAPI.toggleBookmark(poemId);
      if (response.data.success) {
        setPoems((prevPoems) =>
          prevPoems.map((poem) =>
            poem._id === poemId
              ? { ...poem, isBookmarked: !poem.isBookmarked }
              : poem
          )
        );
        showMessage("success", "بُک مارک اپڈیٹ ہو گیا");
      }
    } catch (error) {
      console.error("Bookmark error:", error);
      showMessage("error", "بُک مارک اپڈیٹ نہیں ہو سکا");
    }
  };

  const handleLike = async (poemId) => {
    try {
      const response = await poetryAPI.likePoem(poemId);
      if (response.data.success) {
        setPoems((prevPoems) =>
          prevPoems.map((poem) =>
            poem._id === poemId
              ? {
                  ...poem,
                  likes: poem.isLiked ? poem.likes - 1 : poem.likes + 1,
                  isLiked: !poem.isLiked,
                }
              : poem
          )
        );
        showMessage("success", "پسند اپڈیٹ ہو گیا");
      }
    } catch (error) {
      console.error("Like error:", error);
      showMessage("error", "پسند اپڈیٹ نہیں ہو سکا");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ur-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color = "blue" }) => (
    <Card className="p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1 nastaleeq-primary">
            {title}
          </p>
          <p className="text-3xl font-bold text-urdu-brown">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1 nastaleeq-primary">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-4 bg-${color}-100 rounded-xl`}>
          <Icon className={`w-8 h-8 text-${color}-600`} />
        </div>
      </div>
    </Card>
  );

  const TabButton = ({ id, label, icon: Icon, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-3 px-6 py-3 rounded-lg font-medium transition-all duration-300 nastaleeq-primary ${
        isActive
          ? "bg-urdu-maroon text-white shadow-lg"
          : "text-urdu-brown hover:bg-urdu-maroon/10 hover:shadow-md"
      }`}
    >
      <Icon size={20} />
      <span className="font-semibold">{label}</span>
    </button>
  );

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

        {/* Header Section */}
        <div className="mb-8 bg-gradient-to-r from-urdu-brown to-urdu-maroon rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
                {user?.name?.charAt(0) || "ق"}
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2 nastaleeq-heading">
                  قاری ڈیش بورڈ
                </h1>
                <p className="text-xl opacity-90 nastaleeq-primary">
                  خوش آمدید، {user?.name || "قاری"}
                </p>
                <p className="text-lg opacity-75 mt-1">
                  شاعری کی دنیا میں آپ کا سفر
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={refreshData}
                disabled={refreshing}
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-urdu-brown"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                تازہ کریں
              </Button>
              <Button
                onClick={() => navigate("/profile")}
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-urdu-brown"
              >
                <User className="w-4 h-4 mr-2" />
                پروفائل
              </Button>
              <Button
                onClick={async () => {
                  const confirmed = await showConfirm(
                    "کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟ / Are you sure you want to logout?",
                    "لاگ آؤٹ کی تصدیق / Logout Confirmation"
                  );
                  if (confirmed) {
                    logout();
                    navigate("/auth");
                  }
                }}
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                لاگ آؤٹ
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="پڑھی گئی شاعری"
            value={readerStats.totalPoemsRead}
            subtitle={`+${readerStats.monthlyActivity.poemsRead} اس ماہ`}
            icon={BookOpen}
            color="blue"
          />
          <StatCard
            title="بُک مارکس"
            value={readerStats.bookmarksCount}
            subtitle="محفوظ شدہ شاعری"
            icon={Bookmark}
            color="purple"
          />
          <StatCard
            title="پسندیدہ شاعری"
            value={readerStats.likesGiven}
            subtitle={`+${readerStats.monthlyActivity.likes} اس ماہ`}
            icon={Heart}
            color="red"
          />
          <StatCard
            title="پڑھنے کا سلسلہ"
            value={`${readerStats.readingStreak} دن`}
            subtitle="مسلسل مطالعہ"
            icon={Target}
            color="green"
          />
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-8 p-2">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "خلاصہ", label: "خلاصہ", icon: Activity },
              { id: "شاعری", label: "تازہ شاعری", icon: BookOpen },
              { id: "بُک مارکس", label: "بُک مارکس", icon: Bookmark },
              { id: "تجاویز", label: "تجاویز", icon: Sparkles },
              { id: "شاعر", label: "پسندیدہ شاعر", icon: Users },
              { id: "تجزیات", label: "میرے اعداد و شمار", icon: BarChart3 },
            ].map((tab) => (
              <TabButton
                key={tab.id}
                id={tab.id}
                label={tab.label}
                icon={tab.icon}
                isActive={activeTab === tab.id}
                onClick={setActiveTab}
              />
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "خلاصہ" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reading Progress */}
            <Card className="p-6 lg:col-span-2">
              <h3 className="text-xl font-semibold text-urdu-brown mb-6 flex items-center">
                <Activity className="w-6 h-6 mr-3" />
                حالیہ سرگرمی
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">
                      {readerStats.monthlyActivity.poemsRead}
                    </div>
                    <div className="text-sm text-gray-600">اس ماہ پڑھا</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">
                      {readerStats.monthlyActivity.timeSpent}
                    </div>
                    <div className="text-sm text-gray-600">منٹ خرچ کیے</div>
                  </div>
                </div>

                {/* Weekly Reading Chart */}
                <div>
                  <h4 className="text-lg font-medium text-urdu-brown mb-4">
                    ہفتہ وار مطالعہ
                  </h4>
                  <div className="flex items-end justify-between h-32 gap-2">
                    {readerStats.weeklyReadingData.map((count, index) => (
                      <div
                        key={index}
                        className="flex flex-col items-center flex-1"
                      >
                        <div
                          className="bg-gradient-to-t from-urdu-maroon to-urdu-gold rounded-t w-full min-h-[8px] transition-all duration-500"
                          style={{
                            height: `${Math.max(
                              8,
                              (count /
                                Math.max(...readerStats.weeklyReadingData)) *
                                100
                            )}%`,
                          }}
                        ></div>
                        <div className="text-xs text-urdu-brown mt-2 font-medium">
                          {
                            [
                              "اتوار",
                              "پیر",
                              "منگل",
                              "بدھ",
                              "جمعرات",
                              "جمعہ",
                              "ہفتہ",
                            ][index]
                          }
                        </div>
                        <div className="text-xs text-gray-500">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-urdu-brown mb-6 flex items-center">
                <PieChart className="w-6 h-6 mr-3" />
                پسندیدہ اقسام
              </h3>
              <div className="space-y-4">
                {readerStats.topCategories.map((category, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-urdu-brown font-medium">
                        {category.category}
                      </span>
                      <span className="text-sm text-gray-500">
                        {category.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-urdu-maroon to-urdu-gold rounded-full transition-all duration-1000"
                        style={{ width: `${category.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {category.count} شاعری
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Achievements */}
            <Card className="p-6 lg:col-span-3">
              <h3 className="text-xl font-semibold text-urdu-brown mb-6 flex items-center">
                <Award className="w-6 h-6 mr-3" />
                حالیہ کامیابیاں
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center p-4 bg-yellow-50 rounded-xl">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-yellow-800">
                      ہفتہ وار چیمپین
                    </div>
                    <div className="text-sm text-yellow-600">
                      7 دن مسلسل مطالعہ
                    </div>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-blue-50 rounded-xl">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-blue-800">
                      شاعری کا دوست
                    </div>
                    <div className="text-sm text-blue-600">50+ شاعری پڑھی</div>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-purple-50 rounded-xl">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                    <Heart className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-purple-800">
                      محبت کنندہ
                    </div>
                    <div className="text-sm text-purple-600">25+ پسند</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "شاعری" && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <Card className="p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="شاعری تلاش کریں..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-brown focus:border-transparent text-lg"
                  />
                </div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-brown nastaleeq-primary"
                >
                  <option value="all">تمام اقسام</option>
                  <option value="غزل">غزل</option>
                  <option value="نظم">نظم</option>
                  <option value="رومانس">رومانس</option>
                  <option value="قطعہ">قطعہ</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-brown nastaleeq-primary"
                >
                  <option value="recent">تازہ ترین</option>
                  <option value="popular">مقبول ترین</option>
                  <option value="rating">بہترین ریٹنگ</option>
                  <option value="views">زیادہ دیکھا گیا</option>
                </select>
              </div>
            </Card>

            {/* Poems Grid */}
            <div className="grid gap-6">
              {poems.length === 0 ? (
                <Card className="p-12 text-center">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    کوئی شاعری نہیں ملی
                  </h3>
                  <p className="text-gray-500">
                    براہ کرم اپنا تلاش کا معیار تبدیل کریں
                  </p>
                </Card>
              ) : (
                poems
                  .filter((poem) => {
                    const matchesSearch = poem.title
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase());
                    const matchesCategory =
                      filterCategory === "all" ||
                      poem.category === filterCategory;
                    return matchesSearch && matchesCategory;
                  })
                  .map((poem) => (
                    <Card
                      key={poem._id}
                      className="p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-urdu-gold"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-2xl font-semibold text-urdu-brown">
                              {poem.title}
                            </h3>
                            <span className="px-3 py-1 bg-urdu-maroon/10 text-urdu-maroon text-sm rounded-full">
                              {poem.category}
                            </span>
                          </div>

                          <p className="text-urdu-maroon text-lg mb-2">
                            شاعر:{" "}
                            {poem.poet?.name || poem.poetName || "نامعلوم"}
                          </p>

                          {poem.content && (
                            <p className="text-gray-700 mb-4 line-clamp-3 text-lg leading-relaxed">
                              {poem.content.substring(0, 150)}...
                            </p>
                          )}

                          <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                            <span className="flex items-center">
                              <Eye className="w-4 h-4 mr-2" />
                              {poem.views || 0} مناظر
                            </span>
                            <span className="flex items-center">
                              <Heart className="w-4 h-4 mr-2" />
                              {poem.likes || 0} پسند
                            </span>
                            {poem.averageRating > 0 && (
                              <div className="flex items-center">
                                <Star className="w-4 h-4 mr-1 text-yellow-400 fill-current" />
                                <span>{poem.averageRating.toFixed(1)}</span>
                              </div>
                            )}
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2" />
                              {formatDate(poem.publishedAt)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center space-y-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBookmark(poem._id)}
                            className={
                              poem.isBookmarked
                                ? "bg-yellow-100 text-yellow-600 border-yellow-300"
                                : ""
                            }
                          >
                            <Bookmark
                              className={`w-4 h-4 ${
                                poem.isBookmarked ? "fill-current" : ""
                              }`}
                            />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLike(poem._id)}
                            className={
                              poem.isLiked
                                ? "bg-red-100 text-red-600 border-red-300"
                                : ""
                            }
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                poem.isLiked ? "fill-current" : ""
                              }`}
                            />
                          </Button>
                          <Link to={`/poems/${poem._id}`}>
                            <Button size="sm" className="nastaleeq-primary">
                              مکمل پڑھیں
                              <ChevronRight className="w-4 h-4 mr-2" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  ))
              )}
            </div>
          </div>
        )}

        {activeTab === "بُک مارکس" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-urdu-brown nastaleeq-heading">
                محفوظ شدہ شاعری
              </h2>
              <div className="text-sm text-gray-600">
                {bookmarkedPoems.length} محفوظ شدہ آئٹمز
              </div>
            </div>

            {bookmarkedPoems.length === 0 ? (
              <Card className="p-12 text-center">
                <Bookmark className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  کوئی بُک مارک نہیں
                </h3>
                <p className="text-gray-500 mb-6">
                  اپنی پسندیدہ شاعری کو محفوظ کرنے کے لیے بُک مارک کا استعمال
                  کریں
                </p>
                <Button onClick={() => setActiveTab("شاعری")}>
                  <BookmarkPlus className="w-4 h-4 mr-2" />
                  شاعری تلاش کریں
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {bookmarkedPoems.map((poem) => (
                  <Card
                    key={poem._id}
                    className="p-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-urdu-brown mb-1">
                          {poem.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {poem.poet?.name}
                        </p>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {poem.category}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBookmark(poem._id)}
                        >
                          <Bookmark className="w-4 h-4 fill-current text-yellow-600" />
                        </Button>
                        <Link to={`/poems/${poem._id}`}>
                          <Button size="sm">پڑھیں</Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "تجاویز" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-urdu-brown nastaleeq-heading">
                آپ کے لیے تجاویز
              </h2>
              <Button onClick={fetchReaderData}>
                <Sparkles className="w-4 h-4 mr-2" />
                نئی تجاویز
              </Button>
            </div>

            {recommendations.length === 0 ? (
              <Card className="p-12 text-center">
                <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  تجاویز لوڈ ہو رہی ہیں
                </h3>
                <p className="text-gray-500">
                  آپ کی پسند کے مطابق شاعری تلاش کی جا رہی ہے
                </p>
              </Card>
            ) : (
              <div className="grid gap-6">
                {recommendations.map((poem) => (
                  <Card
                    key={poem._id}
                    className="p-6 hover:shadow-lg transition-shadow border-l-4 border-urdu-gold"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-xl font-semibold text-urdu-brown mb-2">
                          {poem.title}
                        </h4>
                        <p className="text-urdu-maroon mb-2">
                          {poem.poet?.name || poem.author?.name}
                        </p>
                        <p className="text-gray-700 mb-3 line-clamp-2">
                          {poem.content?.substring(0, 120)}...
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{poem.category}</span>
                          {poem.averageRating > 0 && (
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                              <span>{poem.averageRating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
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
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "شاعر" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-urdu-brown nastaleeq-heading">
              پسندیدہ شاعر
            </h2>

            {followedPoets.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  کوئی فالو شدہ شاعر نہیں
                </h3>
                <p className="text-gray-500 mb-6">
                  اپنے پسندیدہ شاعروں کو فالو کریں تاکہ ان کی نئی شاعری کی اطلاع
                  مل سکے
                </p>
                <Button onClick={() => setActiveTab("شاعری")}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  شاعر تلاش کریں
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {followedPoets.map((poet) => (
                  <Card key={poet._id} className="p-6 text-center">
                    <div className="w-16 h-16 bg-urdu-maroon rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                      {poet.name.charAt(0)}
                    </div>
                    <h4 className="font-semibold text-urdu-brown mb-2">
                      {poet.name}
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">{poet.bio}</p>
                    <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 mb-4">
                      <span>{poet.poemsCount || 0} شاعری</span>
                      <span>{poet.followersCount || 0} فالوورز</span>
                    </div>
                    <Button size="sm" variant="outline">
                      پروفائل دیکھیں
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "تجزیات" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reading Analytics */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-urdu-brown mb-6 flex items-center">
                <BarChart3 className="w-6 h-6 mr-3" />
                مطالعے کا تجزیہ
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-3xl font-bold text-blue-600">
                      {readerStats.totalPoemsRead}
                    </div>
                    <div className="text-sm text-gray-600">کل شاعری</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <div className="text-3xl font-bold text-green-600">
                      {readerStats.totalReadingTime}
                    </div>
                    <div className="text-sm text-gray-600">منٹ</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">پسندیدہ قسم</span>
                    <span className="font-semibold text-urdu-brown">
                      {readerStats.favoriteCategory}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">پسندیدہ شاعر</span>
                    <span className="font-semibold text-urdu-brown">
                      {readerStats.favoritePoet}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">اوسط روزانہ</span>
                    <span className="font-semibold text-urdu-brown">
                      {Math.round(readerStats.totalPoemsRead / 30)} شاعری
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Engagement Stats */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-urdu-brown mb-6 flex items-center">
                <Activity className="w-6 h-6 mr-3" />
                تعامل کے اعداد و شمار
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <Heart className="w-5 h-5 text-red-500 mr-3" />
                    <span className="text-gray-700">پسند کی گئی</span>
                  </div>
                  <span className="font-bold text-red-600">
                    {readerStats.likesGiven}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <MessageCircle className="w-5 h-5 text-blue-500 mr-3" />
                    <span className="text-gray-700">تبصرے</span>
                  </div>
                  <span className="font-bold text-blue-600">
                    {readerStats.commentsCount}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center">
                    <Bookmark className="w-5 h-5 text-yellow-500 mr-3" />
                    <span className="text-gray-700">بُک مارکس</span>
                  </div>
                  <span className="font-bold text-yellow-600">
                    {readerStats.bookmarksCount}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <Trophy className="w-5 h-5 text-purple-500 mr-3" />
                    <span className="text-gray-700">مقابلوں میں حصہ</span>
                  </div>
                  <span className="font-bold text-purple-600">
                    {readerStats.contestsParticipated}
                  </span>
                </div>
              </div>
            </Card>

            {/* Category Breakdown */}
            <Card className="p-6 lg:col-span-2">
              <h3 className="text-xl font-semibold text-urdu-brown mb-6 flex items-center">
                <PieChart className="w-6 h-6 mr-3" />
                اقسام کی تفصیل
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {readerStats.topCategories.map((category, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-urdu-brown">
                          {category.category}
                        </span>
                        <span className="text-sm text-gray-500">
                          {category.count} ({category.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-urdu-maroon to-urdu-gold rounded-full transition-all duration-1000"
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-urdu-brown mb-2">
                      {readerStats.totalPoemsRead}
                    </div>
                    <div className="text-lg text-gray-600 mb-4">
                      کل پڑھی گئی شاعری
                    </div>
                    <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      بہترین کارکردگی!
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReaderDashboard;
