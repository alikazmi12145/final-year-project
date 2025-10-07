import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

/**
 * User Collections Management Component
 * Manages favorites, reading lists, and custom collections
 */

const CollectionsManager = () => {
  const { user, isAuthenticated } = useAuth();
  const [collections, setCollections] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("favorites");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pagination, setPagination] = useState({});

  // New collection form data
  const [newCollection, setNewCollection] = useState({
    name: "",
    description: "",
    visibility: "private",
    category: "",
    tags: "",
  });

  const categories = [
    { value: "romantic", label: "رومانوی" },
    { value: "spiritual", label: "روحانی" },
    { value: "classical", label: "کلاسیکی" },
    { value: "modern", label: "جدید" },
    { value: "ghazal", label: "غزل" },
    { value: "nazm", label: "نظم" },
    { value: "patriotic", label: "وطنی" },
    { value: "sad", label: "غمگین" },
    { value: "motivational", label: "حوصلہ افزا" },
    { value: "educational", label: "تعلیمی" },
  ];

  // Fetch user's favorites
  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/poetry/favorites", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setFavorites(data.poems || []);
        setPagination(data.pagination || {});
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error("Error fetching favorites:", err);
      setError("پسندیدہ شاعری حاصل کرنے میں خرابی");
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's collections
  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/poetry/collections", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setCollections(data.collections || []);
        setPagination(data.pagination || {});
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error("Error fetching collections:", err);
      setError("مجموعے حاصل کرنے میں خرابی");
    } finally {
      setLoading(false);
    }
  };

  // Create new collection
  const handleCreateCollection = async (e) => {
    e.preventDefault();

    try {
      const collectionData = {
        ...newCollection,
        tags: newCollection.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
      };

      const response = await fetch("/api/poetry/collections", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(collectionData),
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        setShowCreateForm(false);
        setNewCollection({
          name: "",
          description: "",
          visibility: "private",
          category: "",
          tags: "",
        });
        fetchCollections(); // Refresh collections
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error("Error creating collection:", err);
      alert("مجموعہ بناتے وقت خرابی ہوئی");
    }
  };

  // Remove from favorites
  const handleRemoveFromFavorites = async (poemId) => {
    try {
      const response = await fetch(`/api/poetry/${poemId}/favorites`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        fetchFavorites(); // Refresh favorites
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error("Error removing from favorites:", err);
      alert("پسندیدہ سے ہٹاتے وقت خرابی ہوئی");
    }
  };

  // Load data when component mounts or tab changes
  useEffect(() => {
    if (!isAuthenticated) return;

    if (activeTab === "favorites") {
      fetchFavorites();
    } else {
      fetchCollections();
    }
  }, [activeTab, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          مجموعے دیکھنے کے لیے لاگ ان کریں
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1
          className="text-4xl font-bold text-gray-800 mb-4"
          style={{ fontFamily: "Jameel Noori Nastaleeq" }}
        >
          میرے مجموعے
        </h1>
        <p className="text-gray-600 text-lg">اپنی پسندیدہ شاعری کو منظم کریں</p>
      </div>

      {/* Tabs */}
      <Card className="mb-8">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("favorites")}
              className={`py-4 border-b-2 font-medium text-sm ${
                activeTab === "favorites"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              پسندیدہ شاعری
            </button>
            <button
              onClick={() => setActiveTab("collections")}
              className={`py-4 border-b-2 font-medium text-sm ${
                activeTab === "collections"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              میرے مجموعے
            </button>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Favorites Tab */}
      {activeTab === "favorites" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2
              className="text-2xl font-semibold text-gray-800"
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            >
              پسندیدہ شاعری
            </h2>
            <span className="text-gray-500">{favorites.length} شاعری</span>
          </div>

          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((poem) => (
                <FavoritePoemCard
                  key={poem._id}
                  poem={poem}
                  onRemove={handleRemoveFromFavorites}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p
                className="text-gray-500 text-lg"
                style={{ fontFamily: "Jameel Noori Nastaleeq" }}
              >
                آپ نے ابھی تک کوئی شاعری پسندیدہ میں شامل نہیں کی
              </p>
              <Button
                onClick={() => (window.location.href = "/poetry")}
                variant="primary"
                className="mt-4"
              >
                شاعری تلاش کریں
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Collections Tab */}
      {activeTab === "collections" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2
              className="text-2xl font-semibold text-gray-800"
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            >
              میرے مجموعے
            </h2>
            <Button onClick={() => setShowCreateForm(true)} variant="primary">
              نیا مجموعہ بنائیں
            </Button>
          </div>

          {/* Create Collection Form */}
          {showCreateForm && (
            <Card className="mb-8">
              <form onSubmit={handleCreateCollection} className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  نیا مجموعہ بنائیں
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      مجموعہ کا نام *
                    </label>
                    <input
                      type="text"
                      value={newCollection.name}
                      onChange={(e) =>
                        setNewCollection((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="مجموعہ کا نام..."
                      required
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      قسم
                    </label>
                    <select
                      value={newCollection.category}
                      onChange={(e) =>
                        setNewCollection((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      dir="rtl"
                    >
                      <option value="">قسم منتخب کریں</option>
                      {categories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نظر
                    </label>
                    <select
                      value={newCollection.visibility}
                      onChange={(e) =>
                        setNewCollection((prev) => ({
                          ...prev,
                          visibility: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      dir="rtl"
                    >
                      <option value="private">نجی</option>
                      <option value="public">عوامی</option>
                      <option value="friends">دوستوں کے لیے</option>
                      <option value="followers">فالورز کے لیے</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ٹیگز (کاما سے الگ کریں)
                    </label>
                    <input
                      type="text"
                      value={newCollection.tags}
                      onChange={(e) =>
                        setNewCollection((prev) => ({
                          ...prev,
                          tags: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="غزل, محبت, رومانس..."
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تفصیل
                  </label>
                  <textarea
                    value={newCollection.description}
                    onChange={(e) =>
                      setNewCollection((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="اس مجموعہ کی تفصیل..."
                    dir="rtl"
                  />
                </div>

                <div className="flex space-x-3">
                  <Button type="submit" variant="primary">
                    مجموعہ بنائیں
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    منسوخ کریں
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Collections Grid */}
          {collections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <CollectionCard key={collection._id} collection={collection} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p
                className="text-gray-500 text-lg"
                style={{ fontFamily: "Jameel Noori Nastaleeq" }}
              >
                آپ نے ابھی تک کوئی مجموعہ نہیں بنایا
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="primary"
                className="mt-4"
              >
                پہلا مجموعہ بنائیں
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Favorite Poem Card Component
 */
const FavoritePoemCard = ({ poem, onRemove }) => {
  const getExcerpt = (content, maxLength = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-300">
      <div className="p-6 flex flex-col h-full">
        <div className="flex-1">
          <h3
            className="text-lg font-bold text-gray-800 mb-2"
            style={{ fontFamily: "Jameel Noori Nastaleeq" }}
          >
            {poem.title}
          </h3>

          {poem.author && (
            <p className="text-gray-600 text-sm mb-3">
              شاعر: {poem.author.name}
            </p>
          )}

          <div
            className="text-gray-700 text-sm leading-relaxed mb-4"
            style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            dir="rtl"
          >
            {getExcerpt(poem.content)}
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
            <span>👁️ {poem.views || 0}</span>
            <span>
              ⭐ {poem.averageRating ? poem.averageRating.toFixed(1) : "N/A"}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemove(poem._id)}
            className="text-red-600 hover:text-red-800"
          >
            ہٹائیں
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => (window.location.href = `/poetry/${poem._id}`)}
          >
            پڑھیں
          </Button>
        </div>
      </div>
    </Card>
  );
};

/**
 * Collection Card Component
 */
const CollectionCard = ({ collection }) => {
  const getCategoryLabel = (category) => {
    const categoryMap = {
      romantic: "رومانوی",
      spiritual: "روحانی",
      classical: "کلاسیکی",
      modern: "جدید",
      ghazal: "غزل",
      nazm: "نظم",
      patriotic: "وطنی",
      sad: "غمگین",
      motivational: "حوصلہ افزا",
      educational: "تعلیمی",
    };
    return categoryMap[category] || category;
  };

  const getVisibilityLabel = (visibility) => {
    const visibilityMap = {
      private: "نجی",
      public: "عوامی",
      friends: "دوستوں کے لیے",
      followers: "فالورز کے لیے",
    };
    return visibilityMap[visibility] || visibility;
  };

  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-300">
      <div className="p-6 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3
              className="text-lg font-bold text-gray-800 mb-2"
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            >
              {collection.name}
            </h3>

            {collection.description && (
              <p className="text-gray-600 text-sm mb-3" dir="rtl">
                {collection.description}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end space-y-1">
            {collection.category && (
              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {getCategoryLabel(collection.category)}
              </span>
            )}
            <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
              {getVisibilityLabel(collection.visibility)}
            </span>
          </div>
        </div>

        <div className="flex-1">
          {collection.tags && collection.tags.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {collection.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded"
                  >
                    #{tag}
                  </span>
                ))}
                {collection.tags.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{collection.tags.length - 3} مزید
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
          <div className="flex space-x-4">
            <span>📚 {collection.poemCount || 0} شاعری</span>
            <span>👁️ {collection.views || 0}</span>
            {collection.visibility === "public" && (
              <span>👥 {collection.followerCount || 0}</span>
            )}
          </div>
          <div>
            {collection.lastModified && (
              <span>
                {new Date(collection.lastModified).toLocaleDateString("ur-PK")}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              (window.location.href = `/collections/${collection._id}/edit`)
            }
          >
            ترمیم
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              (window.location.href = `/collections/${collection._id}`)
            }
          >
            دیکھیں
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CollectionsManager;
