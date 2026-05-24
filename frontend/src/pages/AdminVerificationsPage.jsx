/**
 * AdminVerificationsPage.jsx
 * Page wrapper exposing the AdminVerificationPanel on /admin/verifications.
 */
import React from "react";
import AdminVerificationPanel from "../components/admin/AdminVerificationPanel";

const AdminVerificationsPage = () => {
  return (
    <div className="min-h-screen bg-amber-50/30 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <AdminVerificationPanel />
      </div>
    </div>
  );
};

export default AdminVerificationsPage;
