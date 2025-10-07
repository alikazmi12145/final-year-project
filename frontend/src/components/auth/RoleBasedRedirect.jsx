import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";

/**
 * Component that redirects users to their appropriate dashboard/home page based on their role
 * Used after successful login or when users access root paths
 */
const RoleBasedRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const redirectPath = getRedirectPathForRole(user.role);
      navigate(redirectPath, { replace: true });
    } else if (!loading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [user, isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen cultural-bg flex items-center justify-center">
        <LoadingSpinner size="large" />
        <p className="text-urdu-brown ml-3">Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen cultural-bg flex items-center justify-center">
      <LoadingSpinner size="large" />
      <p className="text-urdu-brown ml-3">Redirecting...</p>
    </div>
  );
};

/**
 * Get the appropriate redirect path based on user role
 * @param {string} role - User role (admin, poet, moderator, reader)
 * @returns {string} - Redirect path
 */
export const getRedirectPathForRole = (role) => {
  switch (role) {
    case "admin":
      return "/dashboard/admin";
    case "poet":
      return "/dashboard/poet";
    case "moderator":
      return "/dashboard/moderator";
    case "reader":
      return "/"; // Readers go to home page - they cannot access dashboards
    default:
      return "/";
  }
};

/**
 * Check if a role has dashboard access
 * @param {string} role - User role
 * @returns {boolean} - Whether role can access dashboards
 */
export const canAccessDashboard = (role) => {
  return ["admin", "poet", "moderator"].includes(role);
};

/**
 * Check if a role can access admin features
 * @param {string} role - User role
 * @returns {boolean} - Whether role can access admin features
 */
export const canAccessAdmin = (role) => {
  return role === "admin";
};

/**
 * Check if a role can create/manage content
 * @param {string} role - User role
 * @returns {boolean} - Whether role can create content
 */
export const canCreateContent = (role) => {
  return ["admin", "poet", "moderator"].includes(role);
};

/**
 * Check if a role can participate in contests
 * @param {string} role - User role
 * @returns {boolean} - Whether role can participate in contests
 */
export const canParticipateInContests = (role) => {
  return ["poet"].includes(role); // Only poets can participate in contests
};

/**
 * Get available navigation items based on user role
 * @param {string} role - User role
 * @returns {Array} - Array of navigation items
 */
export const getNavigationForRole = (role) => {
  const baseNavigation = [
    { name: "Home", path: "/", roles: ["admin", "poet", "moderator", "reader"] },
    { name: "Poetry", path: "/poetry", roles: ["admin", "poet", "moderator", "reader"] },
    { name: "Poets", path: "/poets", roles: ["admin", "poet", "moderator", "reader"] },
    { name: "Learning", path: "/learning", roles: ["admin", "poet", "moderator", "reader"] },
    { name: "Search", path: "/search", roles: ["admin", "poet", "moderator", "reader"] },
  ];

  const roleSpecificNavigation = [
    { name: "Admin Dashboard", path: "/dashboard/admin", roles: ["admin"] },
    { name: "Poet Dashboard", path: "/dashboard/poet", roles: ["poet"] },
    { name: "Moderator Dashboard", path: "/dashboard/moderator", roles: ["moderator"] },
    { name: "Contests", path: "/contests", roles: ["admin", "poet", "moderator"] },
    { name: "Profile", path: "/profile", roles: ["admin", "poet", "moderator", "reader"] },
  ];

  const allNavigation = [...baseNavigation, ...roleSpecificNavigation];
  
  return allNavigation.filter(item => item.roles.includes(role));
};

export default RoleBasedRedirect;