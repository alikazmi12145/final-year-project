import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ReaderDashboard from "./ReaderDashboard";
import PoetDashboard from "./PoetDashboard";
import AdminDashboard from "./AdminDashboard";
import ModeratorDashboard from "./ModeratorDashboard";

const Dashboard = () => {
  const { user } = useAuth();

  console.log("🔍 Dashboard - Current user:", user);
  console.log("🔍 Dashboard - User role:", user?.role);
  console.log("🔍 Dashboard - User name:", user?.name);
  console.log("🔍 Dashboard - User email:", user?.email);

  // Force a re-render if user role is not admin but should be
  if (
    user &&
    user.email === "admin@bazm-e-sukhan.com" &&
    user.role !== "admin"
  ) {
    console.warn(
      "⚠️ Admin user has wrong role! Expected 'admin', got:",
      user.role
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Render dashboard based on user role
  // Force admin dashboard for admin email addresses
  if (
    user.email === "admin@bazm-e-sukhan.com" ||
    user.email === "admin@admin.com" ||
    user.role === "admin"
  ) {
    console.log("🔧 Forcing AdminDashboard for admin user");
    return <AdminDashboard />;
  }

  switch (user.role) {
    case "admin":
      return <AdminDashboard />;
    case "poet":
      return <PoetDashboard />;
    case "moderator":
      return <ModeratorDashboard />;
    case "reader":
      return <ReaderDashboard />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
};

export default Dashboard;
