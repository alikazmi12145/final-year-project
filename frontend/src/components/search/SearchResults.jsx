import React from "react";
import {
  Heart,
  MessageCircle,
  Eye,
  Star,
  User,
  Clock,
  BookOpen,
  Tag,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

const SearchResults = ({ results = [], loading = false, searchMeta = {} }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <Card key={index} className="p-6 animate-pulse">
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
              <div className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          کوئی نتیجہ نہیں ملا
        </h3>
        <p className="text-gray-500" dir="rtl">
          مختلف الفاظ استعمال کرکے دوبارہ تلاش کریں
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Meta Information */}
      {searchMeta && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex flex-wrap items-center gap-4 text-sm text-blue-700">
            {searchMeta.totalResults && (
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                {searchMeta.totalResults} نتائج ملے
              </span>
            )}
            {searchMeta.searchType && (
              <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded-full">
                {searchMeta.searchType === "text" && "متنی تلاش"}
                {searchMeta.searchType === "voice" && "آواز کی تلاش"}
                {searchMeta.searchType === "image" && "تصویری تلاش"}
                {searchMeta.searchType === "fuzzy" && "غیر واضح تلاش"}
              </span>
            )}
            {searchMeta.aiEnhancement && searchMeta.aiEnhancement.success && (
              <span className="px-2 py-1 bg-amber-200 text-amber-800 rounded-full flex items-center gap-1">
                🤖 AI Enhanced
              </span>
            )}
            {searchMeta.confidence && (
              <span className="text-blue-600">
                اعتماد: {Math.round(searchMeta.confidence * 100)}%
              </span>
            )}
          </div>

          {/* AI Enhancement Details */}
          {searchMeta.aiEnhancement && searchMeta.aiEnhancement.success && (
            <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
              <div className="text-xs font-medium text-amber-800 mb-2">
                ChatGPT کی جانب سے بہتری:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {searchMeta.aiEnhancement.relatedPoets?.length > 0 && (
                  <div>
                    <span className="font-medium text-amber-700">
                      متعلقہ شعراء:{" "}
                    </span>
                    <span className="text-amber-600">
                      {searchMeta.aiEnhancement.relatedPoets.join(", ")}
                    </span>
                  </div>
                )}
                {searchMeta.aiEnhancement.emotionalContext?.length > 0 && (
                  <div>
                    <span className="font-medium text-amber-700">
                      جذباتی سیاق:{" "}
                    </span>
                    <span className="text-amber-600">
                      {searchMeta.aiEnhancement.emotionalContext.join(", ")}
                    </span>
                  </div>
                )}
                {searchMeta.aiEnhancement.poetryForms?.length > 0 && (
                  <div>
                    <span className="font-medium text-amber-700">
                      شاعری کی اقسام:{" "}
                    </span>
                    <span className="text-amber-600">
                      {searchMeta.aiEnhancement.poetryForms.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Voice Search Enhancement */}
          {searchMeta.improvementData && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-xs font-medium text-green-800 mb-2">
                آواز کی بہتری:
              </div>
              <div className="text-xs text-green-700">
                <span className="font-medium">اصل: </span>
                {searchMeta.originalTranscription}
                <br />
                <span className="font-medium">بہتر شدہ: </span>
                {searchMeta.improvedTranscription}
              </div>
            </div>
          )}

          {/* OCR Text Analysis */}
          {searchMeta.textAnalysis && searchMeta.textAnalysis.success && (
            <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-xs font-medium text-purple-800 mb-2">
                تصویری متن کا تجزیہ:
              </div>
              <div className="text-xs text-purple-700">
                {searchMeta.textAnalysis.isPoetry && (
                  <div>
                    <span className="font-medium">قسم: </span>
                    {searchMeta.textAnalysis.poetryForm}
                  </div>
                )}
                {searchMeta.textAnalysis.themes?.length > 0 && (
                  <div>
                    <span className="font-medium">موضوعات: </span>
                    {searchMeta.textAnalysis.themes.join(", ")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GPT-Style Results */}
      <div className="space-y-6">
        {results.map((poem, index) => (
          <div
            key={poem.id || poem._id || index}
            className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
          >
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" dir="rtl">
                      {poem.title || "بے نام"}
                    </h3>
                    {(poem.poet || poem.author) && (
                      <p className="text-white/80 text-sm" dir="rtl">
                        {poem.poet?.name ||
                          poem.author?.username ||
                          poem.author?.profile?.fullName ||
                          "نامعلوم شاعر"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Relevance Score */}
                {poem.relevanceScore && (
                  <div className="bg-white/20 rounded-full px-3 py-1">
                    <span className="text-xs font-medium">
                      {Math.round(poem.relevanceScore)}% متعلقہ
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Poetry Content */}
              <div className="mb-6">
                <div
                  className="text-gray-800 leading-relaxed whitespace-pre-line text-lg"
                  dir="rtl"
                  style={{ fontFamily: "Noto Nastaliq Urdu, serif" }}
                >
                  {poem.excerpt ||
                    poem.content?.substring(0, 300) +
                      (poem.content?.length > 300 ? "..." : "")}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {poem.category && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Tag className="w-4 h-4" />
                    <span>{poem.category}</span>
                  </div>
                )}

                {poem.views && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Eye className="w-4 h-4" />
                    <span>{poem.views.toLocaleString()} مرتبہ دیکھا گیا</span>
                  </div>
                )}

                {poem.averageRating && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{poem.averageRating.toFixed(1)}</span>
                  </div>
                )}

                {poem.publishedAt && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(poem.publishedAt).toLocaleDateString("ur-PK")}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-xl px-4 py-2"
                >
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">{poem.likesCount || 0}</span>
                </Button>

                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded-xl px-4 py-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">{poem.commentsCount || 0}</span>
                </Button>

                <Button className="ml-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl px-6 py-2 text-sm font-medium">
                  مکمل پڑھیں
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button (if pagination is needed) */}
      {searchMeta?.hasMore && (
        <div className="text-center">
          <button className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors">
            مزید نتائج لوڈ کریں
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
