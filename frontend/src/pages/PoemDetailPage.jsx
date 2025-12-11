import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PoemView from "../components/poetry/PoemView";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { useMessage } from "../context/MessageContext";

const PoemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess, showWarning } = useMessage();

  const [poem, setPoem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedPoems, setRelatedPoems] = useState([]);

  useEffect(() => {
    console.log('PoemDetailPage useEffect triggered for id:', id);
    fetchPoem();
  }, [id]);

  const fetchPoem = async () => {
    try {
      setLoading(true);
      console.log('Fetching poem with id:', id);
      const { poetryAPI } = await import("../services/api.jsx");
      const response = await poetryAPI.getPoemById(id);
      console.log('API response:', response);
      if (response.data.success && response.data.poem) {
        setPoem(response.data.poem);
      } else {
        console.error("Failed to fetch poem:", response.data.message);
        showError("نظم نہیں ملی / Poem not found");
        setPoem(null);
      }
    } catch (error) {
      console.error("Error fetching poem:", error);
      if (error.response) {
        console.error('Error response:', error.response);
      }
      if (error.response?.status === 404) {
        setPoem(null);
        showError("نظم نہیں ملی / Poem not found (404)");
      } else if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.message || "Access denied";
        if (errorMessage.includes("requires authentication")) {
          showWarning(
            "اس نظم کو دیکھنے کے لیے لاگ ان کریں / Please login to view this poem"
          );
          navigate("/auth");
        } else if (errorMessage.includes("not yet published")) {
          showWarning(
            "یہ نظم ابھی شائع نہیں ہوئی ہے / This poem has not been published yet"
          );
          navigate("/poems");
        } else {
          showError(
            "آپ کو اس نظم تک رسائی نہیں ہے / You don't have access to this poem"
          );
          navigate("/unauthorized");
        }
      } else {
        showError("نظم لوڈ کرنے میں خرابی ہوئی / Error loading poem");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (poemId) => {
    if (!user) {
      navigate("/auth");
      return null;
    }

    try {
      const { poetryAPI } = await import("../services/api.jsx");
      const response = await poetryAPI.likePoem(poemId);

      if (response.data.success) {
        // Update poem state
        setPoem(prev => ({
          ...prev,
          likesCount: response.data.likesCount,
          likes: response.data.liked 
            ? [...(prev.likes || []), user.userId || user.id]
            : (prev.likes || []).filter(id => id !== (user.userId || user.id))
        }));
        
        return {
          liked: response.data.liked,
          likesCount: response.data.likesCount,
        };
      }
    } catch (error) {
      console.error("Like error:", error);
      showError("پسند کرنے میں خرابی ہوئی / Error liking poem");
    }

    return null;
  };

  const handleDeleteComment = async (poemId, commentId) => {
    if (!user) {
      navigate("/auth");
      return null;
    }

    if (!window.confirm("کیا آپ واقعی یہ تبصرہ حذف کرنا چاہتے ہیں؟ / Are you sure you want to delete this comment?")) {
      return null;
    }

    try {
      const { poetryAPI } = await import("../services/api.jsx");
      const response = await poetryAPI.deleteComment(poemId, commentId);

      if (response.data.success) {
        // Remove comment from poem state
        setPoem(prev => ({
          ...prev,
          comments: prev.comments.filter(c => c._id !== commentId),
          commentsCount: Math.max(0, (prev.commentsCount || 0) - 1)
        }));
        
        showSuccess("تبصرہ حذف ہو گیا / Comment deleted");
        return { success: true };
      }
    } catch (error) {
      console.error("Delete comment error:", error);
      
      if (error.response?.status === 403) {
        showError("آپ اس تبصرے کو حذف نہیں کر سکتے / Not authorized to delete this comment");
      } else if (error.response?.status === 404) {
        showError("تبصرہ نہیں ملا / Comment not found");
      } else {
        showError("تبصرہ حذف کرنے میں خرابی ہوئی / Error deleting comment");
      }
    }

    return null;
  };

  const handleComment = async (poemId, content) => {
    if (!user) {
      navigate("/auth");
      return null;
    }

    try {
      const { poetryAPI } = await import("../services/api.jsx");
      const response = await poetryAPI.addComment(poemId, { content });

      if (response.data.success) {
        // Update poem state with new comment
        setPoem(prev => ({
          ...prev,
          comments: [...(prev.comments || []), response.data.comment],
          commentsCount: (prev.commentsCount || 0) + 1
        }));
        
        showSuccess("تبصرہ شامل ہو گیا / Comment added");
        return {
          comment: response.data.comment,
        };
      }
    } catch (error) {
      console.error("Comment error:", error);

      // Handle specific errors
      if (error.response?.status === 403) {
        const message = error.response?.data?.message;
        if (message?.includes("unpublished")) {
          showWarning("اس نظم پر ابھی تبصرہ نہیں کیا جا سکتا / Cannot comment on unpublished poems");
        } else {
          showError("تبصرہ کرنے کی اجازت نہیں / Not authorized to comment");
        }
      } else if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors
          .map((err) => err.msg)
          .join("\n");
        showError(
          `تصدیق میں خرابی:\n${errorMessages} / Validation errors:\n${errorMessages}`
        );
      } else {
        showError("تبصرہ بھیجنے میں خرابی ہوئی / Error submitting comment");
      }
    }

    return null;
  };

  const handleEdit = (poemId) => {
    navigate(`/poems/${poemId}/edit`);
  };

  const handleDelete = async (poemId) => {
    if (!window.confirm("کیا آپ واقعی اس نظم کو حذف کرنا چاہتے ہیں؟")) {
      return;
    }

    try {
      const { poetryAPI } = await import("../services/api.jsx");
      const response = await poetryAPI.deletePoem(poemId);

      if (response.data.success) {
        showSuccess("نظم کامیابی سے حذف ہو گئی / Poem deleted successfully");
        navigate("/poems");
      } else {
        showError("نظم حذف کرنے میں خرابی ہوئی / Error deleting poem");
      }
    } catch (error) {
      console.error("Delete error:", error);
      showError("نظم حذف کرنے میں خرابی ہوئی / Error deleting poem");
    }
  };

  const handleBookmark = async (poemId) => {
    if (!user) {
      navigate("/auth");
      return null;
    }

    try {
      const BookmarkAPI = (await import("../services/bookmarkAPI")).default;
      const checkResult = await BookmarkAPI.checkBookmark(poemId);

      if (checkResult.isBookmarked) {
        await BookmarkAPI.removeBookmarkByPoem(poemId);
        // Update poem state
        setPoem(prev => ({ ...prev, isBookmarked: false }));
        showSuccess("بک مارک ہٹا دیا گیا / Bookmark removed");
      } else {
        await BookmarkAPI.addBookmark(poemId);
        // Update poem state
        setPoem(prev => ({ ...prev, isBookmarked: true }));
        showSuccess("بک مارک کر دیا گیا / Bookmarked successfully");
      }

      return { success: true };
    } catch (error) {
      console.error("Bookmark error:", error);
      showError("بک مارک کرنے میں خرابی ہوئی / Error bookmarking poem");
      return null;
    }
  };

  const handleDownload = async (poemId) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      const pdfAPI = (await import("../services/pdfAPI")).default;
      await pdfAPI.exportPoemPDF(poemId);
      showSuccess("ڈاؤن لوڈ شروع ہو گیا / Download started");
    } catch (error) {
      console.error("Download error:", error);
      showError("ڈاؤن لوڈ کرنے میں خرابی ہوئی / Error downloading poem");
    }
  };

  return (
    <>
      <PoemView
        poem={poem}
        loading={loading}
        onLike={handleLike}
        onComment={handleComment}
        onDeleteComment={handleDeleteComment}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBookmark={handleBookmark}
        onDownload={handleDownload}
      />

      {/* Related Poems Section */}
      {relatedPoems.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="card p-6">
            <h2 className="text-2xl font-bold text-urdu-brown mb-6">
              متعلقہ نظمیں
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedPoems.map((relatedPoem) => (
                <div
                  key={relatedPoem._id}
                  onClick={() => navigate(`/poems/${relatedPoem._id}`)}
                  className="cursor-pointer p-4 border border-urdu-cream rounded-lg hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-urdu-brown urdu-text mb-2">
                    {relatedPoem.title}
                  </h3>
                  {relatedPoem.poet && (
                    <p className="text-sm text-urdu-maroon mb-2">
                      {relatedPoem.poet.name}
                    </p>
                  )}
                  <p className="text-sm text-urdu-maroon truncate">
                    {relatedPoem.content.substring(0, 100)}...
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PoemDetailPage;
