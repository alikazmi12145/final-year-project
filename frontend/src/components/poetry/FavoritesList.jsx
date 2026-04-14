import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Trash2, Star, Eye, User } from "lucide-react";

/**
 * FavoritesList – Displays user's favorite poems (from poetry collections).
 * Calls backend: GET /api/poetry/favorites, DELETE /api/poetry/:poemId/favorites
 */
const FavoritesList = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalPoems: 0,
    hasNext: false,
    hasPrev: false,
  });

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { poetryAPI } = await import("../../services/api.jsx");
      const res = await poetryAPI.getFavorites({ page, limit: 12 });

      if (res.data.success) {
        setFavorites(res.data.poems || []);
        setPagination(res.data.pagination || {});
      }
    } catch (err) {
      console.error("Error fetching favorites:", err);
      setError("پسندیدہ فہرست حاصل کرنے میں خرابی / Error loading favorites");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemove = async (poemId) => {
    if (!window.confirm("کیا آپ اسے پسندیدہ فہرست سے ہٹانا چاہتے ہیں؟")) return;

    try {
      const { poetryAPI } = await import("../../services/api.jsx");
      await poetryAPI.removeFromFavorites(poemId);
      setFavorites((prev) => prev.filter((p) => p._id !== poemId));
    } catch (err) {
      console.error("Error removing from favorites:", err);
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("ur-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getCategoryInUrdu = (category) => {
    const map = {
      ghazal: "غزل",
      nazm: "نظم",
      rubai: "رباعی",
      hamd: "حمد",
      naat: "نعت",
      marsiya: "مرثیہ",
      qawwali: "قوالی",
      "free-verse": "آزاد نظم",
      salam: "سلام",
    };
    return map[category] || category || "—";
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-urdu-gold" />
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchFavorites}
          className="px-4 py-2 bg-urdu-gold text-white rounded-lg hover:bg-urdu-brown transition-colors"
        >
          دوبارہ کوشش کریں / Retry
        </button>
      </div>
    );
  }

  // ── Empty state ──
  if (favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-urdu-brown mb-2">
          کوئی پسندیدہ نظم نہیں / No Favorites Yet
        </h3>
        <p className="text-urdu-maroon mb-4">
          شاعری پڑھتے وقت دل کا بٹن دبائیں تاکہ وہ یہاں نظر آئے
        </p>
        <button
          onClick={() => navigate("/poetry")}
          className="px-4 py-2 bg-urdu-gold text-white rounded-lg hover:bg-urdu-brown transition-colors"
        >
          شاعری دیکھیں / Browse Poetry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-urdu-brown">
          پسندیدہ نظمیں ({pagination.totalPoems || favorites.length})
        </h3>
      </div>

      {/* Favorites grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {favorites.map((poem) => (
          <div
            key={poem._id}
            className="group border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer relative"
            onClick={() => navigate(`/poems/${poem._id}`)}
          >
            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(poem._id);
              }}
              className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50"
              title="پسندیدہ سے ہٹائیں"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Title */}
            <h4 className="font-semibold text-urdu-brown urdu-text mb-2 pr-8 line-clamp-1">
              {poem.title}
            </h4>

            {/* Author */}
            <div className="flex items-center gap-1 text-sm text-urdu-maroon mb-2">
              <User className="w-3 h-3" />
              <span>{poem.author?.name || "نامعلوم شاعر"}</span>
            </div>

            {/* Excerpt */}
            <p className="text-sm text-gray-600 urdu-text line-clamp-3 mb-3 leading-relaxed">
              {poem.content?.substring(0, 120)}...
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="bg-urdu-cream text-urdu-brown px-2 py-0.5 rounded-full">
                {getCategoryInUrdu(poem.category)}
              </span>
              <div className="flex items-center gap-3">
                {poem.averageRating > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    {poem.averageRating.toFixed(1)}
                  </span>
                )}
                <span className="flex items-center gap-0.5">
                  <Eye className="w-3 h-3" />
                  {poem.views || 0}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            disabled={!pagination.hasPrev}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-urdu-cream disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            پچھلا
          </button>
          <span className="px-3 py-1 text-sm text-urdu-maroon">
            {page} / {pagination.totalPages}
          </span>
          <button
            disabled={!pagination.hasNext}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-urdu-cream disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            اگلا
          </button>
        </div>
      )}
    </div>
  );
};

export default FavoritesList;
