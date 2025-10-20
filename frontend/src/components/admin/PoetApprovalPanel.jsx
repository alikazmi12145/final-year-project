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
} from "lucide-react";
import { adminAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useMessage } from "../../context/MessageContext";

const PoetApprovalPanel = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useMessage();
  const [pendingPoets, setPendingPoets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [showDetails, setShowDetails] = useState({});

  useEffect(() => {
    loadPendingPoets();
  }, []);

  const loadPendingPoets = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPendingUsers({ role: "poet" });

      if (response.data.success) {
        setPendingPoets(response.data.users || []);
      }
    } catch (error) {
      console.error("Failed to load pending poets:", error);
      // Fallback data for demonstration
      setPendingPoets([
        {
          _id: "1",
          name: "احمد علی شاعر",
          email: "ahmad.poet@example.com",
          role: "poet",
          status: "pending",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          bio: "اردو شاعری میں 15 سال کا تجربہ، کئی مشاعروں میں شرکت",
          location: { city: "کراچی", country: "پاکستان" },
          socialLinks: { website: "www.ahmadali.com" },
        },
        {
          _id: "2",
          name: "فاطمہ خان",
          email: "fatima.khan@example.com",
          role: "poet",
          status: "pending",
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          bio: "جدید اردو شاعری کی ماہرہ، مختلف رسائل میں شاعری شائع",
          location: { city: "لاہور", country: "پاکستان" },
        },
        {
          _id: "3",
          name: "محمد حسن علی",
          email: "hassan.ali@example.com",
          role: "poet",
          status: "pending",
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          bio: "کلاسیکی اردو ادب کا طالب علم، غزل اور نظم کا شوقین",
          location: { city: "اسلام آباد", country: "پاکستان" },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (poetId, approved, reason = "") => {
    try {
      setProcessing({ ...processing, [poetId]: true });

      const response = approved
        ? await adminAPI.approveUser(poetId, {
            approvedBy: user.id,
            approvedReason: reason || "Profile meets platform standards",
          })
        : await adminAPI.rejectUser(poetId, {
            rejectedBy: user.id,
            rejectedReason: reason || "Profile requires improvements",
          });

      if (response.data.success) {
        // Remove from pending list
        setPendingPoets(pendingPoets.filter((poet) => poet._id !== poetId));

        // Show success message
        showSuccess(
          approved
            ? `✅ شاعر "${
                pendingPoets.find((p) => p._id === poetId)?.name
              }" کو کامیابی سے منظور کر دیا گیا! / ✅ Poet "${
                pendingPoets.find((p) => p._id === poetId)?.name
              }" approved successfully!`
            : `❌ شاعر "${
                pendingPoets.find((p) => p._id === poetId)?.name
              }" کو مسترد کر دیا گیا / ❌ Poet "${
                pendingPoets.find((p) => p._id === poetId)?.name
              }" rejected`
        );
      }
    } catch (error) {
      console.error("Approval/Rejection failed:", error);
      showError(
        "خرابی: عملیات مکمل نہیں ہو سکی۔ دوبارہ کوشش کریں۔ / Error: Operation could not be completed. Please try again."
      );
    } finally {
      setProcessing({ ...processing, [poetId]: false });
    }
  };

  const filteredPoets = pendingPoets.filter(
    (poet) =>
      poet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      poet.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      poet.bio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedPoets = [...filteredPoets].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "email":
        return a.email.localeCompare(b.email);
      case "createdAt":
        return new Date(b.createdAt) - new Date(a.createdAt);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 nastaleeq-primary">
            منتظر شعراء کی فہرست لوڈ ہو رہی ہے...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 urdu-text-local">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-6 h-6 ml-2 text-purple-600" />
            شعراء کی منظوری
          </h2>
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="bg-white px-4 py-2 rounded-lg border">
              <span className="text-sm text-gray-600">منتظر منظوری: </span>
              <span className="font-bold text-purple-600">
                {pendingPoets.length}
              </span>
            </div>
            <button
              onClick={loadPendingPoets}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
            >
              <Clock className="w-4 h-4 ml-1" />
              تازہ کریں
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex space-x-4 space-x-reverse">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="نام، ای میل یا بائیو میں تلاش کریں..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="createdAt">تاریخ کے مطابق</option>
            <option value="name">نام کے مطابق</option>
            <option value="email">ای میل کے مطابق</option>
          </select>
        </div>
      </div>

      {/* Poets List */}
      {sortedPoets.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            کوئی منتظر شاعر نہیں
          </h3>
          <p className="text-gray-500">
            {searchTerm
              ? "تلاش کی شرائط کے مطابق کوئی شاعر نہیں ملا"
              : "تمام شعراء کی منظوری مکمل ہے"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedPoets.map((poet) => (
            <div
              key={poet._id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {/* Poet Header */}
              <div className="bg-gradient-to-r from-gray-50 to-purple-50 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {poet.name.charAt(0)}
                    </div>
                    <div className="mr-3">
                      <h3 className="text-lg font-bold text-gray-900">
                        {poet.name}
                      </h3>
                      <p className="text-sm text-gray-600">{poet.email}</p>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Calendar className="w-3 h-3 ml-1" />
                        <span>
                          درخواست:{" "}
                          {new Date(poet.createdAt).toLocaleDateString("ur-PK")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                    منتظر منظوری
                  </span>
                </div>

                {/* Location */}
                {poet.location && (
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 ml-1" />
                    <span>
                      {poet.location.city}, {poet.location.country}
                    </span>
                  </div>
                )}

                {/* Bio Preview */}
                {poet.bio && (
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="flex items-start">
                      <FileText className="w-4 h-4 text-gray-400 ml-1 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {poet.bio}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Poet Details (Collapsible) */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-gray-700">
                    تفصیلات:
                  </span>
                  <button
                    onClick={() =>
                      setShowDetails({
                        ...showDetails,
                        [poet._id]: !showDetails[poet._id],
                      })
                    }
                    className="text-purple-600 hover:text-purple-700 text-sm flex items-center"
                  >
                    <Eye className="w-4 h-4 ml-1" />
                    {showDetails[poet._id] ? "چھپائیں" : "دکھائیں"}
                  </button>
                </div>

                {showDetails[poet._id] && (
                  <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">
                          رجسٹریشن:
                        </span>
                        <p>
                          {new Date(poet.createdAt).toLocaleDateString("ur-PK")}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">
                          ای میل کی تصدیق:
                        </span>
                        <p
                          className={
                            poet.isVerified
                              ? "text-green-600"
                              : "text-yellow-600"
                          }
                        >
                          {poet.isVerified ? "تصدیق شدہ" : "غیر تصدیق شدہ"}
                        </p>
                      </div>
                    </div>

                    {poet.socialLinks?.website && (
                      <div>
                        <span className="font-medium text-gray-600">
                          ویب سائٹ:
                        </span>
                        <a
                          href={poet.socialLinks.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-700 text-sm block break-all"
                        >
                          {poet.socialLinks.website}
                        </a>
                      </div>
                    )}

                    {poet.bio && (
                      <div>
                        <span className="font-medium text-gray-600">
                          مکمل تعارف:
                        </span>
                        <p className="text-sm text-gray-700 mt-1">{poet.bio}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2 space-x-reverse">
                  <button
                    onClick={() => handleApproval(poet._id, true)}
                    disabled={processing[poet._id]}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
                  >
                    {processing[poet._id] ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 ml-1" />
                        منظور کریں
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      const reason = prompt("مسترد کرنے کی وجہ (اختیاری):");
                      if (reason !== null) {
                        handleApproval(poet._id, false, reason);
                      }
                    }}
                    disabled={processing[poet._id]}
                    className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
                  >
                    {processing[poet._id] ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 ml-1" />
                        مسترد کریں
                      </>
                    )}
                  </button>
                </div>

                {/* Contact Actions */}
                <div className="flex space-x-2 space-x-reverse mt-2">
                  <button
                    onClick={() =>
                      window.open(`mailto:${poet.email}`, "_blank")
                    }
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center text-sm"
                  >
                    <Mail className="w-4 h-4 ml-1" />
                    ای میل بھیجیں
                  </button>
                  <button
                    onClick={() =>
                      showSuccess(
                        `شاعر ${poet.name} کی تفصیلات:\n\nنام: ${
                          poet.name
                        }\nای میل: ${poet.email}\nمقام: ${
                          poet.location?.city || "نامعلوم"
                        }\nرجسٹریشن: ${new Date(
                          poet.createdAt
                        ).toLocaleDateString("ur-PK")}\n\nتعارف: ${
                          poet.bio || "کوئی تعارف نہیں"
                        } / Poet ${poet.name} Details:\n\nName: ${
                          poet.name
                        }\nEmail: ${poet.email}\nLocation: ${
                          poet.location?.city || "Unknown"
                        }\nRegistration: ${new Date(
                          poet.createdAt
                        ).toLocaleDateString()}\n\nBio: ${
                          poet.bio || "No bio available"
                        }`
                      )
                    }
                    className="flex-1 bg-purple-100 text-purple-700 py-2 px-4 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center text-sm"
                  >
                    <FileText className="w-4 h-4 ml-1" />
                    مکمل پروفائل
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PoetApprovalPanel;
