import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PoemForm from "../components/poetry/PoemForm";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { useMessage } from "../context/MessageContext";

const EditPoemPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useMessage();

  const [poem, setPoem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchPoem();
  }, [id, user]);

  const fetchPoem = async () => {
    try {
      setLoading(true);
      const { poetryAPI } = await import("../services/api.jsx");

      const response = await poetryAPI.getPoemById(id);

      if (response.data.success) {
        const poemData = response.data.poem;

        // Check if user has permission to edit
        if (
          user.id !== poemData.author?._id &&
          user.role !== "admin" &&
          user.role !== "moderator"
        ) {
          navigate("/unauthorized");
          return;
        }

        setPoem(poemData);
      } else {
        console.error("Failed to fetch poem:", response.data.message);
        navigate("/poems");
      }
    } catch (error) {
      console.error("Error fetching poem:", error);

      if (error.response?.status === 404) {
        showError("نظم نہیں ملی / Poem not found");
        navigate("/poems");
      } else if (error.response?.status === 403) {
        navigate("/unauthorized");
      } else {
        showError("نظم لوڈ کرنے میں خرابی ہوئی / Error loading poem");
        navigate("/poems");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      const { poetryAPI } = await import("../services/api.jsx");
      const response = await poetryAPI.updatePoem(id, formData);

      if (response.data.success) {
        showSuccess(
          "نظم کامیابی سے اپ ڈیٹ ہو گئی! / Poem updated successfully!"
        );
        navigate(`/poems/${id}`);
      } else {
        showError(
          response.data.message ||
            "نظم اپ ڈیٹ کرتے وقت خرابی ہوئی / Error updating poem"
        );
      }
    } catch (error) {
      console.error("Update poem error:", error);

      if (error.response?.data?.errors) {
        // Handle validation errors
        const errorMessages = error.response.data.errors
          .map((err) => err.msg)
          .join("\n");
        showError(`تصدیق میں خرابی / Validation errors:\n${errorMessages}`);
      } else if (error.response?.data?.message) {
        showError(error.response.data.message);
      } else if (error.response?.status === 403) {
        showError(
          "آپ کو اس نظم میں تبدیلی کی اجازت نہیں ہے / You don't have permission to edit this poem"
        );
        navigate("/unauthorized");
      } else {
        showError(
          "نظم اپ ڈیٹ کرتے وقت خرابی ہوئی / Error occurred while updating poem"
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen cultural-bg py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (!poem) {
    return (
      <div className="min-h-screen cultural-bg py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl font-bold text-urdu-brown mb-4">
            نظم نہیں ملی
          </h1>
          <p className="text-urdu-maroon mb-6">
            معذرت، یہ نظم دستیاب نہیں ہے یا آپ کو اس میں تبدیلی کی اجازت نہیں
            ہے۔
          </p>
          <button
            onClick={() => navigate("/poems")}
            className="px-6 py-3 bg-urdu-gold text-white rounded-lg hover:bg-urdu-brown transition-colors"
          >
            واپس شاعری میں
          </button>
        </div>
      </div>
    );
  }

  return (
    <PoemForm
      onSubmit={handleSubmit}
      initialData={poem}
      isLoading={isSubmitting}
    />
  );
};

export default EditPoemPage;
