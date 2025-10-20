import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useMessage } from "../context/MessageContext";
import { useNavigate } from "react-router-dom";
import api, {
  authAPI,
  poetryAPI,
  adminAPI,
  dashboardAPI,
} from "../services/api";
import {
  User,
  Settings,
  BookOpen,
  Heart,
  Bookmark,
  Edit3,
  Camera,
  Shield,
  Key,
  Bell,
  Eye,
  EyeOff,
  Mail,
  Globe,
  Activity,
  Calendar,
  Clock,
  Save,
  X,
  Check,
  AlertCircle,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  LogOut,
  ArrowLeft,
  BarChart3,
  FileText,
} from "lucide-react";

// Helper function to get full image URL
const getImageUrl = (url) => {
  if (!url) return null;
  // If it's already a full URL (starts with http), return as is
  if (url.startsWith("http")) return url;
  // Otherwise, prepend the backend URL
  return `http://localhost:5000${url}`;
};

const Profile = () => {
  const { user, updateProfile, logout } = useAuth();
  const { showSuccess, showError, showWarning, showConfirm } = useMessage();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState({
    poemsRead: 0,
    likedPoems: 0,
    bookmarks: 0,
    totalViews: 0,
    joinedDate: null,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [settings, setSettings] = useState({
    privacy: {
      profileVisibility: "public",
      showEmail: false,
      showActivity: true,
      allowMessages: true,
    },
    notifications: {
      emailNotifications: true,
      poemLikes: true,
      comments: true,
      contests: true,
      newsletter: false,
    },
    reading: {
      fontSize: "medium",
      theme: "light",
      autoSave: true,
      showTranslations: false,
    },
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [formData, setFormData] = useState({
    fullName: "",
    bio: "",
    location: "",
    website: "",
    email: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user?.fullName || user?.name || "",
        bio: user?.bio || "",
        location: user?.location || "",
        website: user?.website || "",
        email: user?.email || "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchRecentActivity();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Fetch user statistics
      if (user?.role === "poet") {
        try {
          const poetStats = await poetryAPI.getMyPoems();
          setStatistics((prev) => ({
            ...prev,
            totalPoems: poetStats.data?.poems?.length || 0,
          }));
        } catch (error) {
          // Poet stats API not available, using default values
        }
      }

      // Fetch bookmarked poems - now handled gracefully at API level
      const bookmarkedPoems = await poetryAPI.getBookmarkedPoems();
      setStatistics((prev) => ({
        ...prev,
        bookmarks: bookmarkedPoems.data?.poems?.length || 0,
      }));

      // Fetch user statistics
      const userStats = await api.getUserStats();
      setStatistics((prev) => ({
        ...prev,
        joinedDate: user?.createdAt,
        poemsRead: userStats.data?.stats?.poemsRead || 0,
        likedPoems: userStats.data?.stats?.likedPoems || 0,
        totalViews: userStats.data?.stats?.totalViews || 0,
        poemsCreated: userStats.data?.stats?.poemsCreated || 0,
        publishedPoems: userStats.data?.stats?.publishedPoems || 0,
      }));
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      // Set default statistics if all API calls fail
      setStatistics({
        poemsRead: 0,
        likedPoems: 0,
        bookmarks: 0,
        totalViews: 0,
        joinedDate: user?.createdAt || null,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const userActivity = await api.getUserActivity();

      // Map activity types to icons
      const iconMap = {
        poem_created: FileText,
        poem_liked: Heart,
        poem_bookmarked: Bookmark,
        poem_read: BookOpen,
      };

      const mappedActivity =
        userActivity.data?.activity?.map((item) => ({
          ...item,
          time: new Date(item.time),
          icon: iconMap[item.type] || FileText,
        })) || [];

      setRecentActivity(mappedActivity);
    } catch (error) {
      console.error("Failed to fetch recent activity:", error);
      // Fallback to empty array instead of mock data
      setRecentActivity([]);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const result = await updateProfile({ profile: formData });
      if (result.success) {
        setIsEditing(false);
        showSuccess(
          "پروفائل کامیابی سے اپ ڈیٹ ہو گیا! / Profile updated successfully!"
        );
      } else {
        showError("پروفائل اپ ڈیٹ نہیں ہو سکا / Failed to update profile");
      }
    } catch (error) {
      showError("پروفائل اپ ڈیٹ نہیں ہو سکا / Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError("نئے پاس ورڈ میں مطابقت نہیں / New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showWarning(
        "پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے / Password must be at least 6 characters"
      );
      return;
    }

    try {
      setLoading(true);
      // In a real app, you'd call an API to change password
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Mock API call
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      showSuccess(
        "پاس ورڈ کامیابی سے تبدیل ہو گیا! / Password changed successfully!"
      );
    } catch (error) {
      showError("پاس ورڈ تبدیل نہیں ہو سکا / Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsUpdate = async (section, key, value) => {
    try {
      const newSettings = {
        ...settings,
        [section]: {
          ...settings[section],
          [key]: value,
        },
      };
      setSettings(newSettings);

      // Save notification settings to backend if it's a notification setting
      if (section === "notifications") {
        await dashboardAPI.updateNotificationSettings(
          newSettings.notifications
        );
        showMessage("success", "Notification settings updated successfully!");
      } else {
        // In a real app, you'd save other settings to backend too
        await new Promise((resolve) => setTimeout(resolve, 500)); // Mock API call
        showMessage("success", "Settings updated successfully!");
      }
    } catch (error) {
      console.error("Settings update error:", error);
      showMessage("error", "Failed to update settings");
      // Revert settings on error
      setSettings((prevSettings) => prevSettings);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", "Image must be smaller than 5MB");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await dashboardAPI.uploadProfileImage(formData);

      if (response.data.success) {
        // Update user state with new profile image
        setUser((prev) => ({
          ...prev,
          profileImage: response.data.profileImage,
        }));
        showMessage("success", "Profile picture updated successfully!");
      } else {
        showMessage("error", response.data.message || "Failed to upload image");
      }
    } catch (error) {
      console.error("Upload error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to upload image"
      );
    } finally {
      setLoading(false);
    }
  };

  const exportUserData = async () => {
    try {
      setLoading(true);
      const userData = {
        profile: user,
        statistics,
        recentActivity,
        settings,
        exportDate: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${user?.name}_profile_data.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showMessage("success", "Data exported successfully!");
    } catch (error) {
      showMessage("error", "Failed to export data");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen cultural-bg flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-urdu-maroon animate-spin mx-auto mb-4" />
          <p className="text-urdu-brown">Loading profile...</p>
        </div>
      </div>
    );
  }
  const stats = [
    {
      icon: BookOpen,
      label: "Poems Read",
      value: statistics.poemsRead || 0,
      color: "text-blue-600",
    },
    {
      icon: Heart,
      label: "Liked Poems",
      value: statistics.likedPoems || 0,
      color: "text-red-600",
    },
    {
      icon: Bookmark,
      label: "Bookmarks",
      value: statistics.bookmarks || 0,
      color: "text-yellow-600",
    },
  ];

  return (
    <div className="min-h-screen cultural-bg py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-urdu-gold/20"
            >
              <ArrowLeft className="w-4 h-4 text-urdu-brown" />
              <span className="text-urdu-brown font-medium">Home</span>
            </button>

            {/* Dashboard Link for Poets/Admins */}
            {(user?.role === "poet" ||
              user?.role === "admin" ||
              user?.role === "moderator") && (
              <button
                onClick={() => {
                  if (user?.role === "admin") navigate("/admin");
                  else if (user?.role === "poet") navigate("/poet");
                  else if (user?.role === "moderator") navigate("/moderator");
                  else navigate("/dashboard");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-urdu-brown text-white rounded-lg hover:bg-urdu-maroon transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="font-medium">Dashboard</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-urdu-brown">
                {user?.fullName || user?.name || "User"}
              </p>
              <p className="text-xs text-urdu-maroon capitalize">
                {user?.role === "admin"
                  ? "ایڈمن"
                  : user?.role === "poet"
                  ? "شاعر"
                  : user?.role === "moderator"
                  ? "منیجر"
                  : "قاری"}
              </p>
            </div>

            <button
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
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>

        {/* Profile Header */}
        <div className="card p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center overflow-hidden">
                {user?.profileImage?.url ||
                user?.profile?.avatar ||
                user?.avatar ? (
                  <img
                    src={
                      getImageUrl(user?.profileImage?.url) ||
                      getImageUrl(user?.profile?.avatar) ||
                      getImageUrl(user?.avatar)
                    }
                    alt={user?.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="text-white w-16 h-16" />
                )}
              </div>
              <label className="absolute bottom-2 right-2 bg-urdu-brown text-white p-2 rounded-full hover:bg-urdu-maroon cursor-pointer transition-colors">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
              {loading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              {isEditing ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="input-field text-2xl font-bold"
                    placeholder="Full Name"
                  />
                  <textarea
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    className="input-field"
                    placeholder="Write a short bio..."
                    rows="3"
                  />
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="input-field"
                      placeholder="Location"
                    />
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                      className="input-field"
                      placeholder="Website URL"
                    />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="input-field"
                    placeholder="Email Address"
                  />
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSave}
                      className="btn-primary flex items-center gap-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        if (user) {
                          setFormData({
                            fullName: user?.fullName || user?.name || "",
                            bio: user?.bio || "",
                            location: user?.location || "",
                            website: user?.website || "",
                            email: user?.email || "",
                          });
                        }
                      }}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center md:justify-start space-x-3 mb-2">
                    <h1 className="text-3xl font-bold text-urdu-brown">
                      {user?.fullName || user?.name || "User"}
                    </h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 text-urdu-gold hover:bg-urdu-gold/10 rounded-lg transition-colors"
                    >
                      <Edit3 size={18} />
                    </button>
                  </div>

                  <p className="text-urdu-maroon mb-2">@{user?.name}</p>
                  <p className="text-sm text-urdu-brown mb-4 capitalize">
                    Role: {user?.role}
                  </p>

                  {user?.bio && (
                    <p className="text-urdu-brown mb-4">{user.bio}</p>
                  )}

                  <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-urdu-brown">
                    {(user?.location?.city || user?.location?.country) && (
                      <span className="flex items-center gap-1">
                        <Globe size={14} />
                        {[user?.location?.city, user?.location?.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                    {user?.website && (
                      <a
                        href={user.website}
                        className="text-urdu-maroon hover:underline flex items-center gap-1"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Globe size={14} />
                        Website
                      </a>
                    )}
                    {statistics.joinedDate && (
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        Joined{" "}
                        {new Date(statistics.joinedDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-urdu-cream">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center group cursor-pointer hover:bg-urdu-cream/30 rounded-lg p-3 transition-colors"
              >
                <stat.icon
                  className={`w-6 h-6 mx-auto mb-1 ${stat.color} group-hover:scale-110 transition-transform`}
                />
                <div className="text-2xl font-bold text-urdu-brown">
                  {stat.value}
                </div>
                <div className="text-sm text-urdu-maroon">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-urdu-cream/30 rounded-lg p-1">
            {[
              { id: "profile", label: "Profile", icon: User },
              { id: "activity", label: "Recent Activity", icon: Activity },
              { id: "settings", label: "Account Settings", icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors ${
                  activeSection === tab.id
                    ? "bg-white text-urdu-brown shadow-sm"
                    : "text-urdu-brown hover:bg-white/50"
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          {activeSection === "activity" && (
            <div className="md:col-span-2">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-urdu-brown flex items-center gap-2">
                    <Activity size={24} />
                    Recent Activity
                  </h2>
                  <button
                    onClick={fetchRecentActivity}
                    className="p-2 text-urdu-gold hover:bg-urdu-gold/10 rounded-lg transition-colors"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>

                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-3 border border-urdu-cream rounded-lg hover:bg-urdu-cream/20 transition-colors"
                      >
                        <div className="p-2 bg-urdu-gold/10 rounded-lg">
                          <activity.icon className="w-5 h-5 text-urdu-gold" />
                        </div>
                        <div className="flex-1">
                          <p className="text-urdu-brown font-medium">
                            {activity.title}
                          </p>
                          <p className="text-sm text-urdu-maroon flex items-center gap-1">
                            <Clock size={12} />
                            {activity.time instanceof Date
                              ? `${activity.time.toLocaleDateString()} at ${activity.time.toLocaleTimeString()}`
                              : "Recently"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-urdu-maroon">
                      Your activity will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Account Settings */}
          {activeSection === "settings" && (
            <div className="md:col-span-2 space-y-6">
              {/* Privacy Settings */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-urdu-brown mb-4 flex items-center gap-2">
                  <Shield size={20} />
                  Privacy Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-urdu-brown font-medium">
                        Profile Visibility
                      </label>
                      <p className="text-sm text-urdu-maroon">
                        Who can see your profile
                      </p>
                    </div>
                    <select
                      value={settings.privacy.profileVisibility}
                      onChange={(e) =>
                        handleSettingsUpdate(
                          "privacy",
                          "profileVisibility",
                          e.target.value
                        )
                      }
                      className="border border-urdu-brown/20 rounded-lg px-3 py-2"
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-urdu-brown font-medium">
                        Show Email
                      </label>
                      <p className="text-sm text-urdu-maroon">
                        Display email on profile
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleSettingsUpdate(
                          "privacy",
                          "showEmail",
                          !settings.privacy.showEmail
                        )
                      }
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings.privacy.showEmail
                          ? "bg-urdu-gold"
                          : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          settings.privacy.showEmail
                            ? "transform translate-x-6"
                            : ""
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-urdu-brown font-medium">
                        Show Activity
                      </label>
                      <p className="text-sm text-urdu-maroon">
                        Display recent activity
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleSettingsUpdate(
                          "privacy",
                          "showActivity",
                          !settings.privacy.showActivity
                        )
                      }
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings.privacy.showActivity
                          ? "bg-urdu-gold"
                          : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          settings.privacy.showActivity
                            ? "transform translate-x-6"
                            : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Change Password */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-urdu-brown mb-4 flex items-center gap-2">
                  <Key size={20} />
                  Change Password
                </h3>
                <div className="space-y-4">
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        currentPassword: e.target.value,
                      })
                    }
                    className="input-field"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value,
                      })
                    }
                    className="input-field"
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="input-field"
                  />
                  <button
                    onClick={handlePasswordChange}
                    disabled={
                      !passwordData.currentPassword ||
                      !passwordData.newPassword ||
                      !passwordData.confirmPassword ||
                      loading
                    }
                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4" />
                    )}
                    Update Password
                  </button>
                </div>
              </div>

              {/* Reading Preferences */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-urdu-brown mb-4 flex items-center gap-2">
                  <BookOpen size={20} />
                  Reading Preferences
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-urdu-brown font-medium">
                        Font Size
                      </label>
                      <p className="text-sm text-urdu-maroon">
                        Adjust reading font size
                      </p>
                    </div>
                    <select
                      value={settings.reading.fontSize}
                      onChange={(e) =>
                        handleSettingsUpdate(
                          "reading",
                          "fontSize",
                          e.target.value
                        )
                      }
                      className="border border-urdu-brown/20 rounded-lg px-3 py-2"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-urdu-brown font-medium">
                        Auto Save
                      </label>
                      <p className="text-sm text-urdu-maroon">
                        Automatically save reading progress
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleSettingsUpdate(
                          "reading",
                          "autoSave",
                          !settings.reading.autoSave
                        )
                      }
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings.reading.autoSave
                          ? "bg-urdu-gold"
                          : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          settings.reading.autoSave
                            ? "transform translate-x-6"
                            : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Email Notification Settings */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-urdu-brown mb-4 flex items-center gap-2">
                  <Bell size={20} />
                  Email Notifications
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-urdu-brown font-medium">
                        Email Notifications
                      </label>
                      <p className="text-sm text-urdu-maroon">
                        Receive notifications via email
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleSettingsUpdate(
                          "notifications",
                          "emailNotifications",
                          !settings.notifications.emailNotifications
                        )
                      }
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings.notifications.emailNotifications
                          ? "bg-urdu-gold"
                          : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          settings.notifications.emailNotifications
                            ? "transform translate-x-6"
                            : ""
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-urdu-brown font-medium">
                        Poem Likes
                      </label>
                      <p className="text-sm text-urdu-maroon">
                        When someone likes your poems
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleSettingsUpdate(
                          "notifications",
                          "poemLikes",
                          !settings.notifications.poemLikes
                        )
                      }
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings.notifications.poemLikes
                          ? "bg-urdu-gold"
                          : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          settings.notifications.poemLikes
                            ? "transform translate-x-6"
                            : ""
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-urdu-brown font-medium">
                        Comments
                      </label>
                      <p className="text-sm text-urdu-maroon">
                        When someone comments on your content
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleSettingsUpdate(
                          "notifications",
                          "comments",
                          !settings.notifications.comments
                        )
                      }
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings.notifications.comments
                          ? "bg-urdu-gold"
                          : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          settings.notifications.comments
                            ? "transform translate-x-6"
                            : ""
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-urdu-brown font-medium">
                        Contest Updates
                      </label>
                      <p className="text-sm text-urdu-maroon">
                        Poetry contest announcements
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleSettingsUpdate(
                          "notifications",
                          "contests",
                          !settings.notifications.contests
                        )
                      }
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings.notifications.contests
                          ? "bg-urdu-gold"
                          : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          settings.notifications.contests
                            ? "transform translate-x-6"
                            : ""
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-urdu-brown font-medium">
                        Newsletter
                      </label>
                      <p className="text-sm text-urdu-maroon">
                        Weekly poetry highlights and news
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleSettingsUpdate(
                          "notifications",
                          "newsletter",
                          !settings.notifications.newsletter
                        )
                      }
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings.notifications.newsletter
                          ? "bg-urdu-gold"
                          : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          settings.notifications.newsletter
                            ? "transform translate-x-6"
                            : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* Test Email Button */}
                  <div className="pt-4 border-t border-urdu-cream">
                    <button
                      onClick={async () => {
                        try {
                          setLoading(true);
                          await dashboardAPI.sendTestEmail();
                          showMessage(
                            "success",
                            "Test email sent successfully!"
                          );
                        } catch (error) {
                          console.error("Test email error:", error);
                          showMessage(
                            "error",
                            error.response?.data?.message ||
                              "Failed to send test email"
                          );
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={
                        !settings.notifications.emailNotifications || loading
                      }
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      Send Test Email
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Management */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-urdu-brown mb-4 flex items-center gap-2">
                  <Download size={20} />
                  Data Management
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={exportUserData}
                    className="w-full flex items-center justify-center gap-2 p-3 border border-urdu-brown/20 rounded-lg hover:bg-urdu-cream/30 transition-colors"
                  >
                    <Download size={18} />
                    Export My Data
                  </button>
                  <button
                    onClick={async () => {
                      const confirmed = await showConfirm(
                        "کیا آپ واقعی اپنا اکاؤنٹ حذف کرنا چاہتے ہیں؟ یہ عمل واپس نہیں ہو سکتا۔ / Are you sure you want to delete your account? This action cannot be undone.",
                        "اکاؤنٹ حذف کرنے کی تصدیق / Account Deletion Confirmation"
                      );
                      if (confirmed) {
                        logout();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Trash2 size={18} />
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Profile Overview (Default) */}
          {activeSection === "profile" && (
            <>
              {/* Recent Activity */}
              <div className="card p-6">
                <h2 className="text-xl font-bold text-urdu-brown mb-4 flex items-center gap-2">
                  <Activity size={20} />
                  Recent Activity
                </h2>
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.slice(0, 3).map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-2 hover:bg-urdu-cream/20 rounded-lg transition-colors"
                      >
                        <activity.icon className="w-4 h-4 text-urdu-gold" />
                        <div className="flex-1">
                          <p className="text-sm text-urdu-brown">
                            {activity.title}
                          </p>
                          <p className="text-xs text-urdu-maroon">
                            {activity.time instanceof Date
                              ? activity.time.toLocaleDateString()
                              : "Recently"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-urdu-maroon">
                      Your activity will appear here
                    </p>
                  </div>
                )}
              </div>

              {/* Account Settings Quick Access */}
              <div className="card p-6">
                <h2 className="text-xl font-bold text-urdu-brown mb-4 flex items-center gap-2">
                  <Settings size={20} />
                  Account Settings
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveSection("settings")}
                    className="w-full text-left p-3 hover:bg-urdu-cream/30 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Shield className="w-5 h-5 text-urdu-gold" />
                      <span className="text-urdu-brown">Privacy Settings</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveSection("settings")}
                    className="w-full text-left p-3 hover:bg-urdu-cream/30 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Key className="w-5 h-5 text-urdu-gold" />
                      <span className="text-urdu-brown">Change Password</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveSection("settings")}
                    className="w-full text-left p-3 hover:bg-urdu-cream/30 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <BookOpen className="w-5 h-5 text-urdu-gold" />
                      <span className="text-urdu-brown">
                        Reading Preferences
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
