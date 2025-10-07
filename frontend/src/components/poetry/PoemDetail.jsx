import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

/**
 * Detailed Poem View Component
 * Shows full poem content with reviews, ratings, and recommendations
 */

const PoemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [poem, setPoem] = useState(null);
  const [userEngagement, setUserEngagement] = useState({});
  const [reviews, setReviews] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("poem");

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    title: "",
    content: "",
    categories: {
      literary: 3,
      emotional: 3,
      linguistic: 3,
      cultural: 3,
      originality: 3,
    },
  });

  // Fetch poem details
  const fetchPoemDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = {};
      if (isAuthenticated) {
        headers["Authorization"] = `Bearer ${localStorage.getItem("token")}`;
      }

      const response = await fetch(`/api/poetry/${id}`, { headers });
      const data = await response.json();

      if (data.success) {
        setPoem(data.poem);
        setUserEngagement(data.userEngagement || {});
      } else {
        setError(data.message || "شاعری نہیں ملی");
      }
    } catch (err) {
      console.error("Error fetching poem:", err);
      setError("شاعری حاصل کرنے میں خرابی ہوئی");
    } finally {
      setLoading(false);
    }
  };

  // Fetch reviews
  const fetchReviews = async () => {
    try {
      const response = await fetch(
        `/api/poetry/${id}/reviews?limit=10&sortBy=helpfulnessScore`
      );
      const data = await response.json();

      if (data.success) {
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  };

  // Fetch similar poems
  const fetchSimilarPoems = async () => {
    try {
      const response = await fetch(`/api/poetry/${id}/similar?limit=6`);
      const data = await response.json();

      if (data.success) {
        setRecommendations(data.recommendations || []);
      }
    } catch (err) {
      console.error("Error fetching similar poems:", err);
    }
  };

  // Handle like
  const handleLike = async () => {
    if (!isAuthenticated) {
      alert("پسند کرنے کے لیے لاگ ان کریں");
      return;
    }

    try {
      const response = await fetch(`/api/poetry/${id}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        setPoem((prev) => ({
          ...prev,
          likesCount: data.likesCount,
        }));
        setUserEngagement((prev) => ({
          ...prev,
          hasLiked: !prev.hasLiked,
        }));
      }
    } catch (error) {
      console.error("Error liking poem:", error);
    }
  };

  // Handle bookmark
  const handleBookmark = async () => {
    if (!isAuthenticated) {
      alert("بک مارک کرنے کے لیے لاگ ان کریں");
      return;
    }

    try {
      const response = await fetch(`/api/poetry/${id}/bookmark`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        setUserEngagement((prev) => ({
          ...prev,
          hasBookmarked: data.isBookmarked,
        }));
        alert(data.message);
      }
    } catch (error) {
      console.error("Error bookmarking poem:", error);
    }
  };

  // Handle add to favorites
  const handleAddToFavorites = async () => {
    if (!isAuthenticated) {
      alert("پسندیدہ میں شامل کرنے کے لیے لاگ ان کریں");
      return;
    }

    try {
      const response = await fetch(`/api/poetry/${id}/favorites`, {
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

  // Handle review submission
  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      alert("جائزہ لکھنے کے لیے لاگ ان کریں");
      return;
    }

    try {
      const response = await fetch(`/api/poetry/${id}/reviews`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reviewData),
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        setShowReviewForm(false);
        fetchReviews(); // Refresh reviews

        // Reset form
        setReviewData({
          rating: 5,
          title: "",
          content: "",
          categories: {
            literary: 3,
            emotional: 3,
            linguistic: 3,
            cultural: 3,
            originality: 3,
          },
        });
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("جائزہ بھیجنے میں خرابی ہوئی");
    }
  };

  // Format category label
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
    };
    return categoryMap[category] || category;
  };

  // Load data when component mounts
  useEffect(() => {
    if (id) {
      fetchPoemDetails();
      fetchReviews();
      fetchSimilarPoems();
    }
  }, [id, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !poem) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || "شاعری نہیں ملی"}
        </div>
        <Button
          onClick={() => navigate("/poetry")}
          className="mt-4"
          variant="primary"
        >
          واپس شاعری کی فہرست میں
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
          ← واپس
        </Button>

        <div className="text-center">
          <h1
            className="text-4xl font-bold text-gray-800 mb-4"
            style={{ fontFamily: "Jameel Noori Nastaleeq" }}
          >
            {poem.title}
          </h1>
          {poem.subtitle && (
            <h2
              className="text-2xl text-gray-600 mb-4"
              style={{ fontFamily: "Jameel Noori Nastaleeq" }}
            >
              {poem.subtitle}
            </h2>
          )}

          <div className="flex justify-center items-center space-x-4 text-gray-600">
            <span>شاعر: {poem.author?.name}</span>
            <span>•</span>
            <span>{getCategoryLabel(poem.category)}</span>
            <span>•</span>
            <span>👁️ {poem.views || 0}</span>
            <span>•</span>
            <span>
              ⭐ {poem.averageRating ? poem.averageRating.toFixed(1) : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Poem Content */}
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <div className="p-8">
              {/* Poem Text */}
              <div
                className="text-gray-800 text-lg leading-relaxed whitespace-pre-line mb-6"
                style={{ fontFamily: "Jameel Noori Nastaleeq" }}
                dir="rtl"
              >
                {poem.content}
              </div>

              {/* Transliteration */}
              {poem.transliteration && (
                <div className="border-t pt-6 mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700">
                    Transliteration
                  </h3>
                  <div className="text-gray-600 italic leading-relaxed whitespace-pre-line">
                    {poem.transliteration}
                  </div>
                </div>
              )}

              {/* Translation */}
              {(poem.translation?.english || poem.translation?.hindi) && (
                <div className="border-t pt-6 mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700">
                    Translation
                  </h3>
                  {poem.translation.english && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-600 mb-2">
                        English:
                      </h4>
                      <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                        {poem.translation.english}
                      </div>
                    </div>
                  )}
                  {poem.translation.hindi && (
                    <div>
                      <h4 className="font-medium text-gray-600 mb-2">हिंदी:</h4>
                      <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                        {poem.translation.hindi}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {poem.tags && poem.tags.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700">
                    ٹیگز
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {poem.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-block bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Tabs for Reviews and Comments */}
          <Card>
            <div className="border-b border-gray-200">
              <div className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={`py-4 border-b-2 font-medium text-sm ${
                    activeTab === "reviews"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  جائزے ({reviews.length})
                </button>
                <button
                  onClick={() => setActiveTab("comments")}
                  className={`py-4 border-b-2 font-medium text-sm ${
                    activeTab === "comments"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  تبصرے ({poem.comments?.length || 0})
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeTab === "reviews" && (
                <div>
                  {/* Add Review Button */}
                  {isAuthenticated && !userEngagement.isAuthor && (
                    <div className="mb-6">
                      <Button
                        onClick={() => setShowReviewForm(!showReviewForm)}
                        variant="primary"
                      >
                        {showReviewForm ? "منسوخ کریں" : "جائزہ لکھیں"}
                      </Button>
                    </div>
                  )}

                  {/* Review Form */}
                  {showReviewForm && (
                    <form
                      onSubmit={handleSubmitReview}
                      className="mb-8 p-6 bg-gray-50 rounded-lg"
                    >
                      <h3 className="text-lg font-semibold mb-4">
                        اپنا جائزہ لکھیں
                      </h3>

                      {/* Rating */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          مجموعی ریٹنگ
                        </label>
                        <select
                          value={reviewData.rating}
                          onChange={(e) =>
                            setReviewData((prev) => ({
                              ...prev,
                              rating: parseInt(e.target.value),
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={1}>1 ⭐</option>
                          <option value={2}>2 ⭐⭐</option>
                          <option value={3}>3 ⭐⭐⭐</option>
                          <option value={4}>4 ⭐⭐⭐⭐</option>
                          <option value={5}>5 ⭐⭐⭐⭐⭐</option>
                        </select>
                      </div>

                      {/* Title */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          جائزے کا عنوان
                        </label>
                        <input
                          type="text"
                          value={reviewData.title}
                          onChange={(e) =>
                            setReviewData((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="جائزے کا مختصر عنوان..."
                          required
                          dir="rtl"
                        />
                      </div>

                      {/* Content */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          تفصیلی جائزہ
                        </label>
                        <textarea
                          value={reviewData.content}
                          onChange={(e) =>
                            setReviewData((prev) => ({
                              ...prev,
                              content: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows="4"
                          placeholder="اس شاعری کے بارے میں اپنے خیالات لکھیں..."
                          required
                          dir="rtl"
                        />
                      </div>

                      {/* Category Ratings */}
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                          تفصیلی ریٹنگ
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries({
                            literary: "ادبی معیار",
                            emotional: "جذباتی اثر",
                            linguistic: "لسانی حسن",
                            cultural: "ثقافتی اہمیت",
                            originality: "تخلیقی انداز",
                          }).map(([key, label]) => (
                            <div key={key}>
                              <label className="block text-xs text-gray-600 mb-1">
                                {label}
                              </label>
                              <select
                                value={reviewData.categories[key]}
                                onChange={(e) =>
                                  setReviewData((prev) => ({
                                    ...prev,
                                    categories: {
                                      ...prev.categories,
                                      [key]: parseInt(e.target.value),
                                    },
                                  }))
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value={1}>1 ⭐</option>
                                <option value={2}>2 ⭐⭐</option>
                                <option value={3}>3 ⭐⭐⭐</option>
                                <option value={4}>4 ⭐⭐⭐⭐</option>
                                <option value={5}>5 ⭐⭐⭐⭐⭐</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <Button type="submit" variant="primary">
                          جائزہ بھیجیں
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowReviewForm(false)}
                        >
                          منسوخ کریں
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Reviews List */}
                  <div className="space-y-6">
                    {reviews.length > 0 ? (
                      reviews.map((review) => (
                        <ReviewCard key={review._id} review={review} />
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        ابھی تک کوئی جائزہ نہیں ملا
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "comments" && (
                <div>
                  <p className="text-gray-500 text-center py-8">
                    تبصرے کا نظام جلد آئے گا
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="lg:col-span-1">
          {/* Action Buttons */}
          <Card className="mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">عمل</h3>
              <div className="space-y-3">
                <Button
                  onClick={handleLike}
                  variant={userEngagement.hasLiked ? "primary" : "outline"}
                  className="w-full justify-start"
                  disabled={!isAuthenticated}
                >
                  <span className="mr-2">❤️</span>
                  {userEngagement.hasLiked ? "پسند شدہ" : "پسند کریں"}
                </Button>

                <Button
                  onClick={handleBookmark}
                  variant={userEngagement.hasBookmarked ? "primary" : "outline"}
                  className="w-full justify-start"
                  disabled={!isAuthenticated}
                >
                  <span className="mr-2">🔖</span>
                  {userEngagement.hasBookmarked
                    ? "بک مارک شدہ"
                    : "بک مارک کریں"}
                </Button>

                <Button
                  onClick={handleAddToFavorites}
                  variant="outline"
                  className="w-full justify-start"
                  disabled={!isAuthenticated}
                >
                  <span className="mr-2">⭐</span>
                  پسندیدہ میں شامل کریں
                </Button>
              </div>
            </div>
          </Card>

          {/* Poem Stats */}
          <Card className="mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">شماریات</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">ملاحظات:</span>
                  <span className="font-medium">{poem.views || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">پسند:</span>
                  <span className="font-medium">{poem.likesCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">اوسط ریٹنگ:</span>
                  <span className="font-medium">
                    {poem.averageRating
                      ? `${poem.averageRating.toFixed(1)} ⭐`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">کل ریٹنگز:</span>
                  <span className="font-medium">{poem.totalRatings || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الفاظ:</span>
                  <span className="font-medium">{poem.wordCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">اشعار:</span>
                  <span className="font-medium">{poem.verseCount || 0}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Similar Poems */}
          {recommendations.length > 0 && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">ملتی جلتی شاعری</h3>
                <div className="space-y-4">
                  {recommendations.slice(0, 3).map((similarPoem) => (
                    <div
                      key={similarPoem._id}
                      className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0"
                    >
                      <h4 className="font-medium text-gray-800 mb-1">
                        <a
                          href={`/poetry/${similarPoem._id}`}
                          className="hover:text-blue-600 transition-colors"
                          style={{ fontFamily: "Jameel Noori Nastaleeq" }}
                        >
                          {similarPoem.title}
                        </a>
                      </h4>
                      <p className="text-sm text-gray-600">
                        {similarPoem.author?.name}
                      </p>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <span>
                          ⭐ {similarPoem.averageRating?.toFixed(1) || "N/A"}
                        </span>
                        <span className="ml-3">
                          👁️ {similarPoem.views || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {recommendations.length > 3 && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/poetry?similar=${id}`)}
                    >
                      مزید دیکھیں
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Individual Review Card Component
 */
const ReviewCard = ({ review }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ur-PK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderStars = (rating) => {
    return "⭐".repeat(rating);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6">
      {/* Review Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            {review.user?.profilePicture ? (
              <img
                src={review.user.profilePicture}
                alt={review.user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-gray-600 font-semibold">
                {review.user?.name?.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <h4 className="font-medium text-gray-800">{review.user?.name}</h4>
            <p className="text-sm text-gray-500">
              {formatDate(review.createdAt)}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg">{renderStars(review.rating)}</div>
          <div className="text-sm text-gray-500">{review.rating}/5</div>
        </div>
      </div>

      {/* Review Content */}
      <div className="mb-4">
        <h3
          className="font-semibold text-gray-800 mb-2"
          style={{ fontFamily: "Jameel Noori Nastaleeq" }}
        >
          {review.title}
        </h3>
        <p
          className="text-gray-700 leading-relaxed"
          style={{ fontFamily: "Jameel Noori Nastaleeq" }}
          dir="rtl"
        >
          {review.content}
        </p>
      </div>

      {/* Category Ratings */}
      {review.categories && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            تفصیلی ریٹنگ:
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>ادبی معیار: {renderStars(review.categories.literary)}</div>
            <div>جذباتی اثر: {renderStars(review.categories.emotional)}</div>
            <div>لسانی حسن: {renderStars(review.categories.linguistic)}</div>
            <div>ثقافتی اہمیت: {renderStars(review.categories.cultural)}</div>
            <div className="col-span-2">
              تخلیقی انداز: {renderStars(review.categories.originality)}
            </div>
          </div>
        </div>
      )}

      {/* Review Actions */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <button className="hover:text-blue-600 transition-colors">
            👍 مددگار ({review.helpfulCount || 0})
          </button>
          <button className="hover:text-red-600 transition-colors">
            👎 ({review.notHelpfulCount || 0})
          </button>
          <button className="hover:text-green-600 transition-colors">
            💬 جواب ({review.replies?.length || 0})
          </button>
        </div>

        {review.isEdited && (
          <span className="text-xs text-gray-400">ترمیم شدہ</span>
        )}
      </div>
    </div>
  );
};

export default PoemDetail;
