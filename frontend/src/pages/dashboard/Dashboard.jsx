import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ReaderDashboard from "./ReaderDashboard";
import PoetDashboard from "./PoetDashboard";
import AdminDashboard from "./AdminDashboard";
import ModeratorDashboard from "./ModeratorDashboard";

const Dashboard = () => {
  const { user } = useAuth();

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
