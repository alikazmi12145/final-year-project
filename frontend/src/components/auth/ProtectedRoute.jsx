import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";

const ProtectedRoute = ({ 
  children, 
  requiredRole, 
  requiredAnyRole, 
  excludedRoles = [], 
  allowAdminOverride = true,
  redirectPath 
}) => {
  const { isAuthenticated, user, loading, hasRole, hasAnyRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen cultural-bg flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if user account is pending approval (for non-admin users)
  if (user?.role !== "admin" && (user?.status === "pending" || user?.isApproved === false)) {
    // Clear token and redirect to pending approval page
    localStorage.removeItem("token");
    return <Navigate to="/pending-approval" state={{ role: user?.role }} replace />;
  }

  // Check if user role is specifically excluded
  if (excludedRoles.length > 0 && excludedRoles.includes(user?.role)) {
    const defaultRedirect = getDefaultRedirectForRole(user.role);
    return <Navigate to={redirectPath || defaultRedirect || "/unauthorized"} replace />;
  }

  // Admin override check
  if (allowAdminOverride && user?.role === "admin") {
    return children;
  }

  // Check specific role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    const defaultRedirect = getDefaultRedirectForRole(user.role);
    return <Navigate to={redirectPath || defaultRedirect || "/unauthorized"} replace />;
  }

  // Check any of the required roles
  if (requiredAnyRole && !hasAnyRole(requiredAnyRole)) {
    const defaultRedirect = getDefaultRedirectForRole(user.role);
    return <Navigate to={redirectPath || defaultRedirect || "/unauthorized"} replace />;
  }

  return children;
};

// Helper function to get default redirect based on user role
const getDefaultRedirectForRole = (role) => {
  switch (role) {
    case "admin":
      return "/dashboard/admin";
    case "poet":
      return "/dashboard/poet";
    case "moderator":
      return "/dashboard/moderator";
    case "reader":
    default:
      return "/";
  }
};

// Component for routes that should only be accessible to authenticated users (no role restrictions)
export const AuthenticatedRoute = ({ children, redirectUnauthorized = "/auth" }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen cultural-bg flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectUnauthorized} state={{ from: location }} replace />;
  }

  return children;
};

// Component for public-only routes (login, register pages)
export const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen cultural-bg flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect to user's appropriate dashboard
    const redirectPath = getDefaultRedirectForRole(user?.role);
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

// Component specifically for admin-only routes
export const AdminRoute = ({ children }) => {
  return (
    <ProtectedRoute requiredRole="admin" redirectPath="/unauthorized">
      {children}
    </ProtectedRoute>
  );
};

// Component specifically for poet-only routes
export const PoetRoute = ({ children }) => {
  return (
    <ProtectedRoute requiredRole="poet" redirectPath="/unauthorized">
      {children}
    </ProtectedRoute>
  );
};

// Component for routes that exclude readers (admin and poets only)
export const NoReaderRoute = ({ children }) => {
  return (
    <ProtectedRoute 
      excludedRoles={["reader"]} 
      redirectPath="/"
      allowAdminOverride={true}
    >
      {children}
    </ProtectedRoute>
  );
};

// Component for routes that only poets and admins can access
export const PoetOrAdminRoute = ({ children }) => {
  return (
    <ProtectedRoute 
      requiredAnyRole={["poet", "admin"]} 
      redirectPath="/unauthorized"
    >
      {children}
    </ProtectedRoute>
  );
};

export default ProtectedRoute;
