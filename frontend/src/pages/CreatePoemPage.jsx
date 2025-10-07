import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PoemForm from "../components/poetry/PoemForm";
import { useAuth } from "../context/AuthContext";

const CreatePoemPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

        alert(successMessage);

        // Give user options to navigate
        const viewOption = confirm(
          "کیا آپ اپنی نظم دیکھنا چاہتے ہیں؟ (Cancel کر کے نظموں کا مجموعہ دیکھیں)"
        );
        if (viewOption) {
          navigate(`/poems/${response.data.poem._id}`);
        } else {
          navigate("/poems");
        }
      } else {
        alert(response.data.message || "نظم بناتے وقت خرابی ہوئی");
      }
    } catch (error) {
      console.error("Create poem error:", error);

      if (error.response?.data?.errors) {
        // Handle validation errors
        const errorMessages = error.response.data.errors
          .map((err) => err.msg)
          .join("\n");
        alert(`تصدیق میں خرابی:\n${errorMessages}`);
      } else if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert("نظم بناتے وقت خرابی ہوئی");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <PoemForm onSubmit={handleSubmit} isLoading={isLoading} />;
};

export default CreatePoemPage;
