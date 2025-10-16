import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Poetry from "./pages/Poetry";
import Poets from "./pages/Poets";
import Contests from "./pages/Contests";
import Learning from "./pages/Learning";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Dashboard from "./pages/dashboard/Dashboard";
import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { PublicOnlyRoute } from "./components/auth/ProtectedRoute";
import PlaceholderPage from "./pages/PlaceholderPage"; // Add this import
import { useAuth } from "./context/AuthContext";

// Poetry CRUD Pages
import PoemsPage from "./pages/PoemsPage";
import CreatePoemPage from "./pages/CreatePoemPage";
import PoemDetailPage from "./pages/PoemDetailPage";
import EditPoemPage from "./pages/EditPoemPage";

// Poetry Collection Pages
import PoetryCollectionPage from "./pages/PoetryCollectionPage";
import CollectionsPage from "./pages/CollectionsPage";
import RecommendationsPage from "./pages/RecommendationsPage";

// Email verification pages
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import OAuthSuccess from "./components/auth/OAuthSuccess";

function App() {
  return (
    <Layout>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/poetry" element={<Poetry />} />
        <Route path="/poetry/:id" element={<Poetry />} />
        <Route path="/poets" element={<Poets />} />
        <Route path="/poets/:id" element={<Poets />} />
        <Route path="/contests" element={<Contests />} />
        <Route path="/contests/:id" element={<Contests />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Poetry CRUD Routes */}
        <Route path="/poems" element={<PoemsPage />} />
        <Route path="/poems/create" element={<CreatePoemPage />} />
        <Route path="/poems/:id" element={<PoemDetailPage />} />
        <Route
          path="/poems/:id/edit"
          element={
            <ProtectedRoute>
              <EditPoemPage />
            </ProtectedRoute>
          }
        />

        {/* New Poetry Collection Routes */}
        <Route path="/poetry-collection" element={<PoetryCollectionPage />} />
        <Route path="/poetry-collection/:id" element={<PoemDetailPage />} />
        <Route
          path="/collections"
          element={
            <ProtectedRoute>
              <CollectionsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/recommendations" element={<RecommendationsPage />} />

        {/* Placeholder Pages for Footer Links */}
        <Route
          path="/guidelines"
          element={<PlaceholderPage title="Community Guidelines" />}
        />
        <Route
          path="/success"
          element={<PlaceholderPage title="Success Stories" />}
        />
        <Route path="/help" element={<PlaceholderPage title="Help Center" />} />
        <Route
          path="/contact"
          element={<PlaceholderPage title="Contact Us" />}
        />
        <Route
          path="/privacy"
          element={<PlaceholderPage title="Privacy Policy" />}
        />
        <Route
          path="/terms"
          element={<PlaceholderPage title="Terms of Service" />}
        />
        <Route path="/sitemap" element={<PlaceholderPage title="Sitemap" />} />

        {/* Auth Routes - Public Only */}
        <Route
          path="/auth"
          element={
            <PublicOnlyRoute>
              <Auth />
            </PublicOnlyRoute>
          }
        />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/verify-email" element={<VerifyEmail />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/success" element={<OAuthSuccess />} />

        {/* Protected Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Role-based Dashboard Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/poet"
          element={
            <ProtectedRoute requiredRole="poet">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderator"
          element={
            <ProtectedRoute requiredRole="moderator">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        {/* Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all route for 404 errors */}
        <Route
          path="*"
          element={
            <PlaceholderPage
              title="Page Not Found"
              description="The page you're looking for doesn't exist."
            />
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;
