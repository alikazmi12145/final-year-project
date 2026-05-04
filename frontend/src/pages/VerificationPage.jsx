/**
 * VerificationPage.jsx
 * Page wrapper for the poet verification form.
 */
import React from "react";
import VerificationForm from "../components/verification/VerificationForm";

const VerificationPage = () => {
  return (
    <div className="min-h-screen bg-amber-50/30 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <VerificationForm />
      </div>
    </div>
  );
};

export default VerificationPage;
