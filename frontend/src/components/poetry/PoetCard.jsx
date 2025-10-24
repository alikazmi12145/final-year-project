/**
 * PoetCard Component
 * Displays poet information with dynamic data integration, biography summary,
 * AI-generated content, and cultural design patterns
 */

import React, { useState } from "react";
import { usePoet } from "../../hooks/usePoetry";
import {
  User,
  BookOpen,
  Calendar,
  MapPin,
  Languages,
  Star,
  Eye,
  Heart,
  Share2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import LoadingSpinner from "../ui/LoadingSpinner";

const PoetCard = ({
  poetId,
  poet: initialPoet = null,
  showFullBio = false,
  showPoems = false,
  viewMode = "card",
  className = "",
  onPoetClick = null,
}) => {
  // Use dynamic poet data if poetId is provided
  const {
    poet: dynamicPoet,
    loading,
    error,
    poems,
    aiSummary,
    translation,
    generateSummary,
    translateBio,
  } = usePoet(poetId);

  // Use provided poet or dynamic poet
  const poet = initialPoet || dynamicPoet;

  // Local state
  const [showExpandedBio, setShowExpandedBio] = useState(showFullBio);
  const [showPoemsSection, setShowPoemsSection] = useState(showPoems);
  const [showTranslation, setShowTranslation] = useState(false);
  const [liked, setLiked] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  // Handle poet click
  const handlePoetClick = () => {
    if (onPoetClick) {
      onPoetClick(poet);
    }
  };

  // Handle like toggle
  const handleLike = async () => {
    setLiked(!liked);
    // Implement API call for liking poet
  };

  // Handle share
  const handleShare = async () => {
    const shareText = `${poet?.name}\n\n${poet?.bio || "عظیم اردو شاعر"}`;

    try {
      await navigator.clipboard.writeText(shareText);
      setShareMessage("کاپی ہو گیا");
      setTimeout(() => setShareMessage(""), 3000);
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  // Loading state
  if (loading && !poet) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 border border-cultural-pearl">
        <div className="flex justify-center">
          <LoadingSpinner size="md" color="urdu-gold" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !poet) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600 text-center urdu-body">{error}</p>
      </div>
    );
  }

  // No poet data
  if (!poet) {
    return null;
  }

  const truncatedBio =
    poet.bio?.length > 200 ? poet.bio.substring(0, 200) + "..." : poet.bio;

  const bioToShow = showExpandedBio ? poet.bio : truncatedBio;

  if (viewMode === "list") {
    return (
      <div
        className={`bg-white/90 backdrop-blur-sm border border-cultural-pearl rounded-lg p-6 hover:shadow-lg transition-all duration-300 ${className}`}
      >
        <div className="flex flex-col md:flex-row gap-6">
          {/* Poet Image and Basic Info */}
          <div className="md:w-1/3">
            <div className="relative group">
              {poet.image || poet.avatar ? (
                <img
                  src={poet.image || poet.avatar}
                  alt={poet.name}
                  className="w-full h-48 md:h-32 object-cover rounded-lg border-2 border-urdu-cream group-hover:border-urdu-gold transition-colors"
                />
              ) : (
                <div className="w-full h-48 md:h-32 bg-gradient-to-br from-urdu-cream to-cultural-pearl rounded-lg border-2 border-urdu-cream flex items-center justify-center group-hover:border-urdu-gold transition-colors">
                  <User className="w-12 h-12 text-urdu-gold" />
                </div>
              )}

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <ActionButton
                  icon={Heart}
                  active={liked}
                  onClick={handleLike}
                  tooltip="پسند کریں"
                  size="sm"
                />
                <ActionButton
                  icon={Share2}
                  onClick={handleShare}
                  tooltip="شیئر کریں"
                  size="sm"
                />
              </div>
            </div>

            {/* Basic Metadata */}
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              {poet.birthYear && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-urdu-gold" />
                  <span className="urdu-body">
                    {poet.birthYear} - {poet.deathYear || "موجودہ"}
                  </span>
                </div>
              )}

              {poet.birthPlace && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-urdu-gold" />
                  <span className="urdu-body">{poet.birthPlace}</span>
                </div>
              )}

              {poet.style && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-urdu-gold" />
                  <span className="urdu-body">{poet.style}</span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="md:w-2/3">
            <div className="flex items-start justify-between mb-3">
              <h3
                className="text-2xl font-bold text-gray-800 urdu-heading cursor-pointer hover:text-urdu-gold transition-colors"
                onClick={handlePoetClick}
              >
                {poet.name}
              </h3>

              {poet.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm text-gray-600">{poet.rating}</span>
                </div>
              )}
            </div>

            {/* Pen name / Title */}
            {poet.penName && poet.penName !== poet.name && (
              <p className="text-lg text-urdu-gold urdu-body mb-2">
                ({poet.penName})
              </p>
            )}

            {/* Biography */}
            {poet.bio && (
              <div className="mb-4">
                <p
                  className="text-gray-700 urdu-body leading-relaxed"
                  dir="rtl"
                >
                  {bioToShow}
                </p>

                {poet.bio.length > 200 && (
                  <button
                    onClick={() => setShowExpandedBio(!showExpandedBio)}
                    className="text-urdu-gold hover:text-urdu-gold/80 text-sm mt-2 flex items-center gap-1"
                  >
                    {showExpandedBio ? (
                      <>
                        کم دکھائیں <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        مزید پڑھیں <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* AI Summary */}
            {!aiSummary && poet.bio && (
              <button
                onClick={generateSummary}
                className="text-sm text-urdu-gold hover:bg-urdu-cream px-3 py-1 rounded-lg transition-colors mb-3"
              >
                AI خلاصہ بنائیں
              </button>
            )}

            {aiSummary && (
              <div className="bg-urdu-cream/30 rounded-lg p-3 mb-4">
                <h4 className="text-sm font-medium text-urdu-gold mb-2">
                  AI خلاصہ:
                </h4>
                <p className="text-gray-600 text-sm urdu-body" dir="rtl">
                  {aiSummary}
                </p>
              </div>
            )}

            {/* Biography Translation */}
            {poet.bio && (
              <div className="flex gap-2 mb-4">
                {!translation && (
                  <button
                    onClick={translateBio}
                    className="flex items-center gap-1 text-sm text-urdu-gold hover:bg-urdu-cream px-3 py-1 rounded-lg transition-colors"
                  >
                    <Languages className="w-4 h-4" />
                    انگریزی ترجمہ
                  </button>
                )}

                {translation && (
                  <button
                    onClick={() => setShowTranslation(!showTranslation)}
                    className="flex items-center gap-1 text-sm text-urdu-gold hover:bg-urdu-cream px-3 py-1 rounded-lg transition-colors"
                  >
                    <Languages className="w-4 h-4" />
                    {showTranslation ? "اردو" : "English"}
                  </button>
                )}
              </div>
            )}

            {/* Translation Display */}
            {translation && showTranslation && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  English Translation:
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed" dir="ltr">
                  {translation}
                </p>
              </div>
            )}

            {/* Statistics */}
            {(poet.poemsCount || poet.views || poet.likes) && (
              <div className="flex gap-6 text-sm text-gray-500 mb-4">
                {poet.poemsCount && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{poet.poemsCount} نظمیں</span>
                  </div>
                )}

                {poet.views && (
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{poet.views} مطالعہ</span>
                  </div>
                )}

                {poet.likes && (
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    <span>{poet.likes} پسندیدگی</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Poems Section */}
        {showPoemsSection && poems.length > 0 && (
          <div className="mt-6 pt-6 border-t border-cultural-pearl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-800 urdu-heading">
                مشہور کلام
              </h4>
              <button
                onClick={() => setShowPoemsSection(!showPoemsSection)}
                className="text-urdu-gold hover:text-urdu-gold/80"
              >
                {showPoemsSection ? <ChevronUp /> : <ChevronDown />}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {poems.slice(0, 4).map((poem, index) => (
                <div key={index} className="bg-urdu-cream/20 rounded-lg p-3">
                  <h5 className="font-medium text-gray-800 urdu-body mb-2">
                    {poem.title}
                  </h5>
                  <p
                    className="text-gray-600 text-sm urdu-body line-clamp-3"
                    dir="rtl"
                  >
                    {poem.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share message */}
        {shareMessage && (
          <div className="mt-4 text-sm text-green-600 urdu-body">
            {shareMessage}
          </div>
        )}
      </div>
    );
  }

  // Card view (default)
  return (
    <div
      className={`bg-white/90 backdrop-blur-sm border border-cultural-pearl rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 group ${className}`}
    >
      {/* Header with image */}
      <div className="relative">
        {poet.image || poet.avatar ? (
          <img
            src={poet.image || poet.avatar}
            alt={poet.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-urdu-cream to-cultural-pearl flex items-center justify-center">
            <User className="w-16 h-16 text-urdu-gold" />
          </div>
        )}

        {/* Overlay actions */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <ActionButton
            icon={Heart}
            active={liked}
            onClick={handleLike}
            tooltip="پسند کریں"
          />
          <ActionButton
            icon={Share2}
            onClick={handleShare}
            tooltip="شیئر کریں"
          />
        </div>

        {/* Rating badge */}
        {poet.rating && (
          <div className="absolute top-3 right-3 bg-white/90 rounded-full px-2 py-1 flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-xs font-medium">{poet.rating}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3
          className="text-xl font-bold text-gray-800 urdu-heading mb-2 cursor-pointer hover:text-urdu-gold transition-colors"
          onClick={handlePoetClick}
        >
          {poet.name}
        </h3>

        {/* Pen name */}
        {poet.penName && poet.penName !== poet.name && (
          <p className="text-urdu-gold urdu-body mb-2">({poet.penName})</p>
        )}

        {/* Basic info */}
        <div className="space-y-1 mb-3 text-sm text-gray-600">
          {poet.birthYear && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 text-urdu-gold" />
              <span className="urdu-body">
                {poet.birthYear} - {poet.deathYear || "موجودہ"}
              </span>
            </div>
          )}

          {poet.birthPlace && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-urdu-gold" />
              <span className="urdu-body">{poet.birthPlace}</span>
            </div>
          )}
        </div>

        {/* Short bio */}
        {poet.bio && (
          <p
            className="text-gray-600 text-sm urdu-body leading-relaxed mb-3 line-clamp-3"
            dir="rtl"
          >
            {poet.bio}
          </p>
        )}

        {/* Statistics */}
        <div className="flex justify-between items-center text-xs text-gray-500">
          <div className="flex gap-3">
            {poet.poemsCount && (
              <div className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span>{poet.poemsCount}</span>
              </div>
            )}

            {poet.views && (
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{poet.views}</span>
              </div>
            )}
          </div>

          {poet.style && (
            <span className="bg-urdu-cream px-2 py-1 rounded text-urdu-gold">
              {poet.style}
            </span>
          )}
        </div>

        {/* Share message */}
        {shareMessage && (
          <div className="mt-2 text-xs text-green-600 urdu-body">
            {shareMessage}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Action Button Component
 */
const ActionButton = ({
  icon: Icon,
  active = false,
  loading = false,
  onClick,
  tooltip = "",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "p-2 w-8 h-8",
    md: "p-2 w-10 h-10",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={tooltip}
      className={`${
        sizeClasses[size]
      } rounded-full border-2 transition-all duration-200 backdrop-blur-sm ${
        active
          ? "bg-urdu-gold text-white border-urdu-gold"
          : "bg-white/90 text-gray-600 border-white hover:bg-urdu-gold hover:text-white hover:border-urdu-gold"
      } ${loading ? "opacity-50 cursor-not-allowed" : "hover:scale-110"}`}
    >
      {loading ? (
        <div
          className={`animate-spin rounded-full border-2 border-current border-t-transparent ${iconSizes[size]}`}
        />
      ) : (
        <Icon className={iconSizes[size]} />
      )}
    </button>
  );
};

export default PoetCard;
