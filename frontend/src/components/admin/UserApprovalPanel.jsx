import React, { useState, useEffect } from "react";
import {
  Users,
  CheckCircle,
  XCircle,
  Eye,
  Mail,
  Calendar,
  MapPin,
  Star,
  Clock,
  User,
  AlertCircle,
  FileText,
  Award,
  Filter,
  Search,
  BookOpen,
  Shield,
  Feather,
} from "lucide-react";
import { adminAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useMessage } from "../../context/MessageContext";

const UserApprovalPanel = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useMessage();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [filterRole, setFilterRole] = useState("all");
  const [showDetails, setShowDetails] = useState({});

  useEffect(() => {
    loadPendingUsers();
  }, [filterRole]);

  const loadPendingUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPendingUsers({ role: filterRole });

      if (response.data.success) {
        setPendingUsers(response.data.users || []);
      }
    } catch (error) {
      console.error("Failed to load pending users:", error);
      showError("صارفین لوڈ کرنے میں خرابی");
      setPendingUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (userId, approved, reason = "") => {
    try {
      setProcessing({ ...processing, [userId]: true });

      const response = approved
        ? await adminAPI.approveUser(userId, {
            approvedBy: user?.id || user?._id,
            approvedReason: reason || "پروفائل پلیٹ فارم کے معیار پر پورا اترتا ہے",
          })
        : await adminAPI.rejectUser(userId, {
            rejectedBy: user?.id || user?._id,
            rejectedReason: reason || "پروفائل میں بہتری درکار ہے",
          });

      if (response.data.success) {
        showSuccess(
          approved
            ? "صارف کامیابی سے منظور ہو گیا!"
            : "صارف کو مسترد کر دیا گیا"
        );
        // Remove from list
        setPendingUsers((prev) => prev.filter((u) => u._id !== userId));
      }
    } catch (error) {
      console.error("Approval error:", error);
      showError(error.response?.data?.message || "عمل میں خرابی ہوئی");
    } finally {
      setProcessing((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "poet":
        return <Feather className="w-4 h-4" />;
      case "reader":
        return <BookOpen className="w-4 h-4" />;
      case "moderator":
        return <Shield className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      poet: "شاعر",
      reader: "قاری",
      moderator: "منتظم",
      admin: "ایڈمن",
    };
    return labels[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      poet: "bg-purple-100 text-purple-800 border-purple-200",
      reader: "bg-blue-100 text-blue-800 border-blue-200",
      moderator: "bg-orange-100 text-orange-800 border-orange-200",
      admin: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[role] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const formatDate = (date) => {
    if (!date) return "نامعلوم";
    return new Date(date).toLocaleDateString("ur-PK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const filteredUsers = pendingUsers.filter((u) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      u.name?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower) ||
      u.bio?.toLowerCase().includes(searchLower)
    );
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return (a.name || "").localeCompare(b.name || "");
      case "role":
        return (a.role || "").localeCompare(b.role || "");
      case "createdAt":
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-urdu-maroon"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-urdu-maroon to-urdu-gold rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-urdu-brown nastaleeq-heading">
              صارفین کی منظوری
            </h2>
            <p className="text-sm text-gray-500">
              {pendingUsers.length} زیر التواء درخواستیں
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="نام یا ای میل سے تلاش کریں..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-maroon focus:border-transparent"
            dir="rtl"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-maroon nastaleeq-primary"
        >
          <option value="all">تمام صارفین</option>
          <option value="reader">قاری</option>
          <option value="poet">شاعر</option>
          <option value="moderator">منتظم</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-maroon nastaleeq-primary"
        >
          <option value="createdAt">تاریخ کے مطابق</option>
          <option value="name">نام کے مطابق</option>
          <option value="role">کردار کے مطابق</option>
        </select>
      </div>

      {/* Users List */}
      {sortedUsers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            کوئی زیر التواء درخواست نہیں
          </h3>
          <p className="text-gray-500">
            {filterRole === "all"
              ? "تمام صارفین کی منظوری مکمل ہے"
              : `کوئی زیر التواء ${getRoleLabel(filterRole)} نہیں`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedUsers.map((pendingUser) => (
            <div
              key={pendingUser._id}
              className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* User Header */}
              <div className="p-4 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative">
                      {pendingUser.profileImage?.url ? (
                        <img
                          src={pendingUser.profileImage.url}
                          alt={pendingUser.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-urdu-gold"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-urdu-maroon to-urdu-gold flex items-center justify-center text-white text-xl font-bold">
                          {pendingUser.name?.charAt(0) || "؟"}
                        </div>
                      )}
                      <div
                        className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${getRoleColor(
                          pendingUser.role
                        )} border`}
                      >
                        {getRoleIcon(pendingUser.role)}
                      </div>
                    </div>

                    {/* Info */}
                    <div>
                      <h3 className="text-lg font-semibold text-urdu-brown">
                        {pendingUser.name || "نام نہیں"}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail className="w-4 h-4" />
                        <span>{pendingUser.email}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(
                            pendingUser.role
                          )}`}
                        >
                          {getRoleLabel(pendingUser.role)}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(pendingUser.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setShowDetails((prev) => ({
                          ...prev,
                          [pendingUser._id]: !prev[pendingUser._id],
                        }))
                      }
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title="تفصیلات دیکھیں"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleApproval(pendingUser._id, true)}
                      disabled={processing[pendingUser._id]}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span className="nastaleeq-primary">منظور</span>
                    </button>
                    <button
                      onClick={() => handleApproval(pendingUser._id, false)}
                      disabled={processing[pendingUser._id]}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span className="nastaleeq-primary">مسترد</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Details (expandable) */}
              {showDetails[pendingUser._id] && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingUser.bio && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                          تعارف
                        </h4>
                        <p className="text-gray-600 text-sm">
                          {pendingUser.bio}
                        </p>
                      </div>
                    )}
                    {pendingUser.location?.city && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {pendingUser.location.city}
                          {pendingUser.location.country &&
                            `, ${pendingUser.location.country}`}
                        </span>
                      </div>
                    )}
                    {pendingUser.gender && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>
                          {pendingUser.gender === "male"
                            ? "مرد"
                            : pendingUser.gender === "female"
                            ? "عورت"
                            : pendingUser.gender}
                        </span>
                      </div>
                    )}
                    {pendingUser.dateOfBirth && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(pendingUser.dateOfBirth)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserApprovalPanel;
