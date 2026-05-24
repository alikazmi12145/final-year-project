/**
 * AdminFraudReportsPage.jsx
 * Page wrapper exposing the AdminFraudPanel on /admin/fraud-reports.
 */
import React from "react";
import AdminFraudPanel from "../components/admin/AdminFraudPanel";

const AdminFraudReportsPage = () => {
  return (
    <div className="min-h-screen bg-amber-50/30 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <AdminFraudPanel />
      </div>
    </div>
  );
};

export default AdminFraudReportsPage;
