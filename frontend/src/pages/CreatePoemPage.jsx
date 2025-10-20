import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PoemForm from "../components/poetry/PoemForm";
import { useAuth } from "../context/AuthContext";
import { useMessage } from "../context/MessageContext";

const CreatePoemPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useMessage();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setIsLoading(true);

    try {
      const { poetryAPI } = await import("../services/api.jsx");
      const response = await poetryAPI.createPoem(formData);

      if (response.data.success) {
        // Show success message with details
        const poemTitle = response.data.poem.title;
        const successMessage = `🎉 آپ کی نظم "${poemTitle}" کامیابی سے شائع ہو گئی!\n\n✅ یہ اب نظموں کے مجموعے میں دستیاب ہے\n✅ دوسرے صارفین اسے دیکھ سکتے ہیں\n✅ آپ کو شاعر کے طور پر دکھایا جائے گا\n📋 یہ ایڈمن کی حتمی منظوری کا انتظار کر رہی ہے`;

        showSuccess(
          `${successMessage} / 🎉 Your poem "${poemTitle}" has been published successfully!\n\n✅ It is now available in the poetry collection\n✅ Other users can view it\n✅ You are shown as the poet\n📋 It is awaiting final admin approval`
        );

        // Navigate to the poem
        navigate(`/poems/${response.data.poem._id}`);
      } else {
        showError(
          `${response.data.message || "نظم بناتے وقت خرابی ہوئی"} / ${
            response.data.message || "Error creating poem"
          }`
        );
      }
    } catch (error) {
      console.error("Create poem error:", error);

      if (error.response?.data?.errors) {
        // Handle validation errors
        const errorMessages = error.response.data.errors
          .map((err) => err.msg)
          .join("\n");
        showError(
          `تصدیق میں خرابی:\n${errorMessages} / Validation errors:\n${errorMessages}`
        );
      } else if (error.response?.data?.message) {
        showError(
          `${error.response.data.message} / ${error.response.data.message}`
        );
      } else {
        showError("نظم بناتے وقت خرابی ہوئی / Error creating poem");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <PoemForm onSubmit={handleSubmit} isLoading={isLoading} />;
};

export default CreatePoemPage;
