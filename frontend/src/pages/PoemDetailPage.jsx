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
    fetchPoem();
  }, [id]);

  const fetchPoem = async () => {
    try {
      setLoading(true);
      const { poetryAPI } = await import("../services/api.jsx");

      const response = await poetryAPI.getPoemById(id);

      if (response.data.success) {
        setPoem(response.data.poem);
        setRelatedPoems(response.data.relatedPoems || []);
      } else {
        console.error("Failed to fetch poem:", response.data.message);
        setPoem(null);
      }
    } catch (error) {
      console.error("Error fetching poem:", error);

      if (error.response?.status === 404) {
        setPoem(null);
      } else if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.message || "Access denied";

        // Check if it's an authentication issue
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

  const handleComment = async (poemId, content) => {
    if (!user) {
      navigate("/auth");
      return null;
    }

    try {
      const { poetryAPI } = await import("../services/api.jsx");
      const response = await poetryAPI.addComment(poemId, { content });

      if (response.data.success) {
        return {
          comment: response.data.comment,
        };
      }
    } catch (error) {
      console.error("Comment error:", error);

      if (error.response?.data?.errors) {
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

  return (
    <>
      <PoemView
        poem={poem}
        loading={loading}
        onLike={handleLike}
        onComment={handleComment}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
