import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

/**
 * Main Poetry Collection Component
 * Displays poems with filtering, search, and interaction features
 */

const PoetryCollection = () => {
  const { user, isAuthenticated } = useAuth();
  const [poems, setPoems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    category: "",
    mood: "",
    theme: "",
    search: "",
    sortBy: "publishedAt",
    sortOrder: "desc",
  });
  const [pagination, setPagination] = useState({});

  // Categories for filtering (Urdu poetry forms)
  const categories = [
    { value: "ghazal", label: "غزل" },
    { value: "nazm", label: "نظم" },
    { value: "rubai", label: "رباعی" },
    { value: "qawwali", label: "قوالی" },
    { value: "marsiya", label: "مرسیہ" },
    { value: "hamd", label: "حمد" },
    { value: "naat", label: "نعت" },
    { value: "free-verse", label: "آزاد نظم" },
  ];

  const moods = [
    { value: "romantic", label: "رومانوی" },
    { value: "sad", label: "غمگین" },
    { value: "patriotic", label: "وطنی" },
    { value: "spiritual", label: "روحانی" },
    { value: "philosophical", label: "فلسفیانہ" },
    { value: "humorous", label: "مزاحیہ" },
  ];

  const themes = [
    { value: "love", label: "محبت" },
    { value: "separation", label: "جدائی" },
    { value: "nature", label: "فطرت" },
    { value: "friendship", label: "دوستی" },
    { value: "loss", label: "نقصان" },
    { value: "celebration", label: "جشن" },
    { value: "prayer", label: "دعا" },
  ];

  // Sample poems for testing (fallback when API is not available)
  const samplePoems = [
    {
      _id: "1",
      title: "غزل",
      content:
        "غزل دل کے درد کہے گئی، تیری نظر کے ساتھو آئی بے روشنی پہل، تیری خبر کے ساتھ خوابوں میں بس گیا ترا عکس میرا بال چلکے...",
      author: { name: "ali" },
      category: "ghazal",
      mood: "romantic",
      views: 0,
      likesCount: 0,
      averageRating: 0.0,
      publishedAt: "2025-01-10",
      isLiked: false,
      isBookmarked: false,
      isFavorited: false,
    },
    {
      _id: "2",
      title: "زندگی",
      content:
        "زندگی زندگی 🌸 خواب ہے، خواب سا سلسلہ کبھی اشکوں کا قافلہ کبھی امید کی روشنی دے چاتے ہے کیے تنہائی میں...",
      author: { name: "Test Poet" },
      category: "nazm",
      mood: "philosophical",
      views: 0,
      likesCount: 0,
      averageRating: 0.0,
      publishedAt: "2025-01-10",
      isLiked: false,
      isBookmarked: false,
      isFavorited: false,
    },
    {
      _id: "3",
      title: "محبت کا گیت",
      content:
        "محبت کا یہ گیت سناتا ہوں دل کی بات کہتا ہوں تیری یادوں میں کھو جاتا ہوں راتوں کو جاگتا ہوں",
      author: { name: "رومانی شاعر" },
      category: "ghazal",
      mood: "romantic",
      views: 150,
      likesCount: 12,
      averageRating: 4.5,
      publishedAt: "2025-01-08",
      isLiked: false,
      isBookmarked: false,
      isFavorited: false,
    },
    {
      _id: "4",
      title: "وطن کی مٹی",
      content:
        "وطن کی مٹی سے پیار ہے مجھے اس کی خوشبو سے بہار ہے مجھے جہاں کہیں جاؤں گا اس دنیا میں وطن کی یادوں کا غبار ہے مجھے",
      author: { name: "وطن پرست" },
      category: "nazm",
      mood: "patriotic",
      views: 280,
      likesCount: 25,
      averageRating: 4.8,
      publishedAt: "2025-01-05",
      isLiked: true,
      isBookmarked: false,
      isFavorited: true,
    },
  ];

  // Fetch poems based on current filters
  const fetchPoems = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/poetry?${queryParams.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("token") && {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          }),
        },
      });

      if (!response.ok) {
        throw new Error("API not available");
      }

      const data = await response.json();

      if (data.success) {
        setPoems(data.poems || []);
        setPagination(data.pagination || {});
      } else {
        throw new Error(data.message || "شاعری حاصل کرنے میں خرابی");
      }
    } catch (err) {
      console.warn("API not available, using sample data:", err);

      // Provide user feedback about API status
      if (
        err.message.includes("Failed to fetch") ||
        err.message.includes("NetworkError")
      ) {
        setError(
          "⚠️ بیک اینڈ سرور سے رابطہ نہیں ہو سکا - نمونہ ڈیٹا استعمال کر رہے ہیں"
        );
      } else {
        setError("⚠️ API دستیاب نہیں - نمونہ ڈیٹا استعمال کر رہے ہیں");
      }

      // Filter sample poems based on current filters
      let filteredPoems = [...samplePoems];

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredPoems = filteredPoems.filter(
          (poem) =>
            poem.title.toLowerCase().includes(searchTerm) ||
            poem.content.toLowerCase().includes(searchTerm) ||
            poem.author.name.toLowerCase().includes(searchTerm)
        );
      }

      if (filters.category) {
        filteredPoems = filteredPoems.filter(
          (poem) => poem.category === filters.category
        );
      }

      if (filters.mood) {
        filteredPoems = filteredPoems.filter(
          (poem) => poem.mood === filters.mood
        );
      }

      // Sort poems
      if (filters.sortBy === "views") {
        filteredPoems.sort((a, b) => b.views - a.views);
      } else if (filters.sortBy === "averageRating") {
        filteredPoems.sort((a, b) => b.averageRating - a.averageRating);
      } else if (filters.sortBy === "title") {
        filteredPoems.sort((a, b) => a.title.localeCompare(b.title));
      }

      setPoems(filteredPoems);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        total: filteredPoems.length,
        hasPrev: false,
        hasNext: false,
      });
      setError(null); // Clear error when using sample data
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  // Handle poem interactions (like, bookmark, etc.)
  const handleLike = async (poemId) => {
    if (!isAuthenticated) {
      alert("پسند کرنے کے لیے لاگ ان کریں");
      return;
    }

    try {
      const response = await fetch(`/api/poetry/${poemId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        // Update the poem in the list
        setPoems((prev) =>
          prev.map((poem) =>
            poem._id === poemId
              ? { ...poem, likesCount: data.likesCount }
              : poem
          )
        );
      }
    } catch (error) {
      console.error("Error liking poem:", error);
    }
  };

  const handleBookmark = async (poemId) => {
    if (!isAuthenticated) {
      alert("بک مارک کرنے کے لیے لاگ ان کریں");
      return;
    }

    try {
      const response = await fetch(`/api/poetry/${poemId}/bookmark`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
      }
    } catch (error) {
      console.error("Error bookmarking poem:", error);
    }
  };

  const handleAddToFavorites = async (poemId) => {
    if (!isAuthenticated) {
      alert("پسندیدہ میں شامل کرنے کے لیے لاگ ان کریں");
      return;
    }

    try {
      const response = await fetch(`/api/poetry/${poemId}/favorites`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      alert(data.message);
    } catch (error) {
      console.error("Error adding to favorites:", error);
    }
  };

  // Load poems when component mounts or filters change
  useEffect(() => {
    fetchPoems();
  }, [filters]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-gold/10 flex justify-center items-center">
        <div className="text-center">
          <LoadingSpinner size="large" variant="cultural" />
          <p
            className="mt-4 text-urdu-brown text-lg"
            style={{ fontFamily: "Jameel Noori Nastaleeq" }}
          >
            شاعری لوڈ ہو رہی ہے...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-urdu-cream via-white to-urdu-gold/10">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-bold text-urdu-brown mb-4 drop-shadow-lg"
            style={{ fontFamily: "Jameel Noori Nastaleeq" }}
          >
            شاعری کا خزانہ
          </h1>
          <p
            className="text-gray-600 text-lg"
            style={{ fontFamily: "Jameel Noori Nastaleeq" }}
          >
            اردو شاعری کا بہترین مجموعہ
          </p>
        </div>

        {/* API Status Indicator */}
        {error && (
          <div className="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 rounded-r-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-3">
                <p
                  className="text-sm text-yellow-700"
                  style={{ fontFamily: "Jameel Noori Nastaleeq" }}
                >
                  {error}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Backend server شروع کرنے کے لیے:{" "}
                  <code className="bg-yellow-200 px-1 rounded">
                    cd backend && npm run dev
                  </code>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <Card className="mb-8 cultural-card border-2 border-urdu-gold/30">
          <div className="p-6 bg-gradient-to-r from-urdu-cream/20 to-urdu-gold/10">
            <h2
              className="text-2xl font-semibold mb-6 text-urdu-brown flex items-center"
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            >
              <span className="ml-2">🔍</span>
              تلاش اور فلٹر
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
              {/* Search Input */}
              <div>
                <label
                  className="block text-sm font-medium text-urdu-brown mb-2"
                  style={{ fontFamily: "Jameel Noori Nastaleeq" }}
                >
                  تلاش کریں
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder="شاعری کا نام یا متن..."
                  className="w-full px-4 py-3 border-2 border-urdu-cream rounded-xl focus:ring-2 focus:ring-urdu-gold focus:border-urdu-gold transition-all duration-300 bg-white/90 text-urdu-brown placeholder-gray-400"
                  style={{ fontFamily: "Jameel Noori Nastaleeq" }}
                  dir="rtl"
                />
              </div>

              {/* Category Filter */}
              <div>
                <label
                  className="block text-sm font-medium text-urdu-brown mb-2"
                  style={{ fontFamily: "Jameel Noori Nastaleeq" }}
                >
                  قسم
                </label>
                <select
                  value={filters.category}
                  onChange={(e) =>
                    handleFilterChange("category", e.target.value)
                  }
                  className="w-full px-4 py-3 border-2 border-urdu-cream rounded-xl focus:ring-2 focus:ring-urdu-gold focus:border-urdu-gold transition-all duration-300 bg-white/90 text-urdu-brown"
                  style={{ fontFamily: "Jameel Noori Nastaleeq" }}
                  dir="rtl"
                >
                  <option value="">تمام اقسام</option>
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mood Filter */}
              <div>
                <label
                  className="block text-sm font-medium text-urdu-brown mb-2"
                  style={{ fontFamily: "Jameel Noori Nastaleeq" }}
                >
                  مزاج
                </label>
                <select
                  value={filters.mood}
                  onChange={(e) => handleFilterChange("mood", e.target.value)}
                  className="w-full px-4 py-3 border-2 border-urdu-cream rounded-xl focus:ring-2 focus:ring-urdu-gold focus:border-urdu-gold transition-all duration-300 bg-white/90 text-urdu-brown"
                  style={{ fontFamily: "Jameel Noori Nastaleeq" }}
                  dir="rtl"
                >
                  <option value="">تمام مزاج</option>
                  {moods.map((mood) => (
                    <option key={mood.value} value={mood.value}>
                      {mood.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label
                  className="block text-sm font-medium text-urdu-brown mb-2"
                  style={{ fontFamily: "Jameel Noori Nastaleeq" }}
                >
                  ترتیب
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                  className="w-full px-4 py-3 border-2 border-urdu-cream rounded-xl focus:ring-2 focus:ring-urdu-gold focus:border-urdu-gold transition-all duration-300 bg-white/90 text-urdu-brown"
                  style={{ fontFamily: "Jameel Noori Nastaleeq" }}
                  dir="rtl"
                >
                  <option value="publishedAt">تازہ ترین</option>
                  <option value="views">مقبول ترین</option>
                  <option value="averageRating">بہترین ریٹنگ</option>
                  <option value="title">حروف تہجی</option>
                </select>
              </div>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant={filters.category === "ghazal" ? "cultural" : "ghost"}
                size="small"
                onClick={() =>
                  handleFilterChange(
                    "category",
                    filters.category === "ghazal" ? "" : "ghazal"
                  )
                }
                className="text-sm"
              >
                غزل
              </Button>
              <Button
                variant={filters.category === "nazm" ? "cultural" : "ghost"}
                size="small"
                onClick={() =>
                  handleFilterChange(
                    "category",
                    filters.category === "nazm" ? "" : "nazm"
                  )
                }
                className="text-sm"
              >
                نظم
              </Button>
              <Button
                variant={filters.mood === "romantic" ? "cultural" : "ghost"}
                size="small"
                onClick={() =>
                  handleFilterChange(
                    "mood",
                    filters.mood === "romantic" ? "" : "romantic"
                  )
                }
                className="text-sm"
              >
                رومانوی
              </Button>
              <Button
                variant={filters.mood === "sad" ? "cultural" : "ghost"}
                size="small"
                onClick={() =>
                  handleFilterChange(
                    "mood",
                    filters.mood === "sad" ? "" : "sad"
                  )
                }
                className="text-sm"
              >
                غمگین
              </Button>
            </div>
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 text-red-700 px-6 py-4 rounded-xl mb-6 shadow-lg">
            <div className="flex items-center">
              <span className="text-2xl ml-3">⚠️</span>
              <span style={{ fontFamily: "Jameel Noori Nastaleeq" }}>
                {error}
              </span>
            </div>
          </div>
        )}

        {/* Results Count */}
        {poems.length > 0 && (
          <div className="flex justify-between items-center mb-6">
            <p
              className="text-urdu-brown font-medium"
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            >
              کل {pagination.total || poems.length} شاعری ملی
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">فی صفحہ:</span>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange("limit", e.target.value)}
                className="px-3 py-1 border border-urdu-cream rounded-lg text-sm"
              >
                <option value="6">6</option>
                <option value="12">12</option>
                <option value="24">24</option>
              </select>
            </div>
          </div>
        )}

        {/* Poems Grid */}
        {poems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {poems.map((poem) => (
              <PoemCard
                key={poem._id}
                poem={poem}
                onLike={handleLike}
                onBookmark={handleBookmark}
                onAddToFavorites={handleAddToFavorites}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <p
              className="text-gray-500 text-xl mb-4"
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            >
              کوئی شاعری نہیں ملی
            </p>
            <p className="text-gray-400 text-sm">
              مختلف فلٹر استعمال کر کے دوبارہ کوشش کریں
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center space-x-4 mt-8">
            <Button
              variant="cultural"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrev}
              className="px-6 py-3"
            >
              ⟨ پچھلا
            </Button>

            <div className="flex items-center space-x-2">
              {[...Array(Math.min(5, pagination.totalPages))].map(
                (_, index) => {
                  const pageNum =
                    Math.max(1, pagination.currentPage - 2) + index;
                  if (pageNum > pagination.totalPages) return null;

                  return (
                    <Button
                      key={pageNum}
                      variant={
                        pageNum === pagination.currentPage
                          ? "cultural"
                          : "ghost"
                      }
                      size="small"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-10 h-10"
                    >
                      {pageNum}
                    </Button>
                  );
                }
              )}
            </div>

            <span
              className="mx-4 text-urdu-brown font-medium"
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            >
              صفحہ {pagination.currentPage} از {pagination.totalPages}
            </span>

            <Button
              variant="cultural"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNext}
              className="px-6 py-3"
            >
              اگلا ⟩
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Individual Poem Card Component with Enhanced Dynamic Features
 */
const PoemCard = ({
  poem,
  onLike,
  onBookmark,
  onAddToFavorites,
  isAuthenticated,
}) => {
  const [cardState, setCardState] = useState({
    isLiked: poem.isLiked || false,
    isBookmarked: poem.isBookmarked || false,
    isFavorited: poem.isFavorited || false,
    likesCount: poem.likesCount || 0,
    isLoading: false,
  });

  // Truncate content for preview with better handling
  const getExcerpt = (content, maxLength = 120) => {
    if (!content) return "متن دستیاب نہیں ہے...";
    if (content.length <= maxLength) return content;

    // Try to break at word boundary
    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + "...";
    }
    return truncated + "...";
  };

  // Format category display with enhanced mapping
  const getCategoryLabel = (category) => {
    const categoryMap = {
      ghazal: "غزل",
      nazm: "نظم",
      rubai: "رباعی",
      qawwali: "قوالی",
      marsiya: "مرسیہ",
      hamd: "حمد",
      naat: "نعت",
      "free-verse": "آزاد نظم",
      qasida: "قصیدہ",
      masnavi: "مثنوی",
    };
    return categoryMap[category] || category;
  };

  // Format mood display
  const getMoodLabel = (mood) => {
    const moodMap = {
      romantic: "رومانوی",
      sad: "غمگین",
      patriotic: "وطنی",
      spiritual: "روحانی",
      philosophical: "فلسفیانہ",
      humorous: "مزاحیہ",
      joyful: "خوشی",
    };
    return moodMap[mood] || mood;
  };

  // Format author name
  const getAuthorName = (author) => {
    if (typeof author === "string") return author;
    if (author && author.name) return author.name;
    return "نامعلوم شاعر";
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("ur-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle like with optimistic updates
  const handleLike = async () => {
    if (!isAuthenticated) {
      alert("پسند کرنے کے لیے لاگ ان کریں");
      return;
    }

    setCardState((prev) => ({ ...prev, isLoading: true }));

    try {
      await onLike(poem._id);
      setCardState((prev) => ({
        ...prev,
        isLiked: !prev.isLiked,
        likesCount: prev.isLiked ? prev.likesCount - 1 : prev.likesCount + 1,
        isLoading: false,
      }));
    } catch (error) {
      setCardState((prev) => ({ ...prev, isLoading: false }));
      console.error("Error liking poem:", error);
    }
  };

  // Handle bookmark with state update
  const handleBookmark = async () => {
    if (!isAuthenticated) {
      alert("بک مارک کرنے کے لیے لاگ ان کریں");
      return;
    }

    setCardState((prev) => ({ ...prev, isLoading: true }));

    try {
      await onBookmark(poem._id);
      setCardState((prev) => ({
        ...prev,
        isBookmarked: !prev.isBookmarked,
        isLoading: false,
      }));
    } catch (error) {
      setCardState((prev) => ({ ...prev, isLoading: false }));
      console.error("Error bookmarking poem:", error);
    }
  };

  // Handle favorites with state update
  const handleFavorite = async () => {
    if (!isAuthenticated) {
      alert("پسندیدہ میں شامل کرنے کے لیے لاگ ان کریں");
      return;
    }

    setCardState((prev) => ({ ...prev, isLoading: true }));

    try {
      await onAddToFavorites(poem._id);
      setCardState((prev) => ({
        ...prev,
        isFavorited: !prev.isFavorited,
        isLoading: false,
      }));
    } catch (error) {
      setCardState((prev) => ({ ...prev, isLoading: false }));
      console.error("Error adding to favorites:", error);
    }
  };

  return (
    <Card className="h-full hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-urdu-cream/30 via-white to-urdu-gold/10 border border-urdu-gold/30 rounded-2xl overflow-hidden">
      <div className="p-5 flex flex-col h-full relative">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3
              className="text-lg font-bold text-urdu-brown mb-2 leading-relaxed line-clamp-2"
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
              title={poem.title}
            >
              {poem.title || "بے نام"}
            </h3>
            <p
              className="text-urdu-brown/70 text-sm flex items-center"
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            >
              <span className="ml-1">👤</span>
              شاعر: {getAuthorName(poem.author)}
            </p>
          </div>

          {/* Category Badge */}
          <div className="flex flex-col items-end space-y-1">
            <span
              className="inline-block bg-gradient-to-r from-urdu-gold/80 to-yellow-400/80 text-urdu-brown text-xs px-2 py-1 rounded-full font-medium shadow-sm"
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            >
              {getCategoryLabel(poem.category)}
            </span>
            {poem.mood && (
              <span
                className="inline-block bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 text-xs px-2 py-1 rounded-full font-medium"
                style={{ fontFamily: "Jameel Noori Nastaleeq" }}
              >
                {getMoodLabel(poem.mood)}
              </span>
            )}
          </div>
        </div>

        {/* Content Preview with Urdu styling */}
        <div className="flex-1 mb-4">
          <div
            className="text-urdu-brown/90 leading-loose text-sm bg-gradient-to-r from-urdu-cream/20 to-transparent p-3 rounded-xl border-r-2 border-urdu-gold/50 min-h-[80px] flex items-center"
            style={{
              fontFamily: "Jameel Noori Nastaleeq",
              fontSize: "15px",
              lineHeight: "1.8",
            }}
            dir="rtl"
          >
            <div className="w-full">
              {poem.content ? (
                <>
                  {getExcerpt(poem.content, 100)}
                  {poem.content.length > 100 && (
                    <span className="text-urdu-gold/70 text-xs">...مزید</span>
                  )}
                </>
              ) : (
                <span className="text-gray-400 text-xs">
                  کوئی متن دستیاب نہیں
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="flex justify-between items-center text-xs text-urdu-brown/70 mb-3 bg-urdu-cream/10 px-3 py-2 rounded-lg">
          <div className="flex space-x-3">
            <span className="flex items-center space-x-1">
              <span>👁️</span>
              <span>{poem.views || 0}</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className={cardState.isLiked ? "❤️" : "🤍"}>❤️</span>
              <span>{cardState.likesCount}</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>⭐</span>
              <span>
                {poem.averageRating ? poem.averageRating.toFixed(1) : "0.0"}
              </span>
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {formatDate(poem.publishedAt) || formatDate(poem.createdAt)}
          </div>
        </div>

        {/* Action Buttons - Matching Screenshot Style */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={!isAuthenticated || cardState.isLoading}
              className={`flex items-center space-x-1 text-xs px-3 py-2 rounded-xl transition-all duration-200 ${
                cardState.isLiked
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600"
              }`}
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            >
              <span>{cardState.isLiked ? "❤️" : "🤍"}</span>
              <span>پسند</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleBookmark}
              disabled={!isAuthenticated || cardState.isLoading}
              className={`flex items-center space-x-1 text-xs px-3 py-2 rounded-xl transition-all duration-200 ${
                cardState.isBookmarked
                  ? "bg-blue-50 text-blue-600 border border-blue-200"
                  : "bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
              }`}
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            >
              <span>{cardState.isBookmarked ? "🔖" : "📑"}</span>
              <span>محفوظ</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleFavorite}
              disabled={!isAuthenticated || cardState.isLoading}
              className={`flex items-center space-x-1 text-xs px-3 py-2 rounded-xl transition-all duration-200 ${
                cardState.isFavorited
                  ? "bg-yellow-50 text-yellow-600 border border-yellow-200"
                  : "bg-gray-50 text-gray-600 hover:bg-yellow-50 hover:text-yellow-600"
              }`}
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            >
              <span>{cardState.isFavorited ? "⭐" : "☆"}</span>
              <span>پسندیدہ</span>
            </Button>
          </div>

          <Button
            variant="cultural"
            size="sm"
            onClick={() =>
              (window.location.href = `/poetry-detail/${poem._id}`)
            }
            className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-urdu-gold to-yellow-400 text-urdu-brown hover:from-yellow-400 hover:to-urdu-gold transition-all duration-200"
            style={{ fontFamily: "Jameel Noori Nastaleeq" }}
          >
            مکمل پڑھیں
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default PoetryCollection;
