import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { authAPI, poetryAPI, adminAPI } from "../services/api";
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
} from "lucide-react";

const Profile = () => {
  const { user, updateProfile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
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
    fullName: user?.fullName || user?.name || "",
    bio: user?.bio || "",
    location: user?.location || "",
    website: user?.website || "",
    email: user?.email || "",
  });

  useEffect(() => {
    fetchUserData();
    fetchRecentActivity();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      // Fetch user statistics
      if (user?.role === "poet") {
        const poetStats = await poetryAPI.getMyPoems();
        setStatistics((prev) => ({
          ...prev,
          totalPoems: poetStats.data?.poems?.length || 0,
        }));
      }

      // Fetch bookmarked poems
      const bookmarkedPoems = await poetryAPI.getBookmarkedPoems();
      setStatistics((prev) => ({
        ...prev,
        bookmarks: bookmarkedPoems.data?.poems?.length || 0,
      }));

      // Set join date
      setStatistics((prev) => ({
        ...prev,
        joinedDate: user?.createdAt,
      }));
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Mock recent activity - in real app, this would come from an activity API
      const mockActivity = [
        {
          id: 1,
          type: "poem_read",
          title: 'Read "دل کی بات"',
          time: new Date(Date.now() - 2 * 60 * 60 * 1000),
          icon: BookOpen,
        },
        {
          id: 2,
          type: "poem_liked",
          title: 'Liked "محبت کا گیت"',
          time: new Date(Date.now() - 5 * 60 * 60 * 1000),
          icon: Heart,
        },
        {
          id: 3,
          type: "poem_bookmarked",
          title: 'Bookmarked "شاعری کا جادو"',
          time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          icon: Bookmark,
        },
      ];
      setRecentActivity(mockActivity);
    } catch (error) {
      console.error("Failed to fetch recent activity:", error);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const result = await updateProfile({ profile: formData });
      if (result.success) {
        setIsEditing(false);
        showMessage("success", "Profile updated successfully!");
      } else {
        showMessage("error", "Failed to update profile");
      }
    } catch (error) {
      showMessage("error", "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage("error", "New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showMessage("error", "Password must be at least 6 characters");
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
      showMessage("success", "Password changed successfully!");
    } catch (error) {
      showMessage("error", "Failed to change password");
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

      // In a real app, you'd save settings to backend
      await new Promise((resolve) => setTimeout(resolve, 500)); // Mock API call
      showMessage("success", "Settings updated successfully!");
    } catch (error) {
      showMessage("error", "Failed to update settings");
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
      // In a real app, you'd upload to a service like Cloudinary
      const formData = new FormData();
      formData.append("avatar", file);

      await new Promise((resolve) => setTimeout(resolve, 2000)); // Mock upload
      showMessage("success", "Profile picture updated successfully!");
    } catch (error) {
      showMessage("error", "Failed to upload image");
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

  console.log(user);

  if (!user) {
    return <di>loading...</di>;
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
        {/* Message Banner */}
        {message.text && (
          <div
            className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
              message.type === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <Check size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            {message.text}
          </div>
        )}

        {/* Profile Header */}
        <div className="card p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center overflow-hidden">
                {user?.profile?.avatar || user?.avatar ? (
                  <img
                    src={user?.profile?.avatar || user?.avatar}
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
                        setFormData({
                          fullName: user?.fullName || user?.name || "",
                          bio: user?.bio || "",
                          location: user?.location || "",
                          website: user?.website || "",
                          email: user?.email || "",
                        });
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
                    {user?.location && (
                      <span className="flex items-center gap-1">
                        <Globe size={14} />
                        {user.location}
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
                            {activity.time.toLocaleDateString()} at{" "}
                            {activity.time.toLocaleTimeString()}
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
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to delete your account? This action cannot be undone."
                        )
                      ) {
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
                            {activity.time.toLocaleDateString()}
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
