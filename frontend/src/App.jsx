import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Poetry from "./pages/Poetry";
import Poets from "./pages/Poets";
import ContestsPage from "./components/contests/ContestsPage";
import QuizzesPage from "./components/quizzes/QuizzesPage";
import Learning from "./pages/Learning";
import PoetryTTSPage from "./pages/PoetryTTSPage";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Dashboard from "./pages/dashboard/Dashboard";
import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { PublicOnlyRoute } from "./components/auth/ProtectedRoute";
import RedirectToHome from "./components/RedirectToHome";
import NotFoundPage from "./components/NotFoundPage";
import PendingApproval from "./pages/PendingApproval";

// Poetry CRUD Pages
import PoemsPage from "./pages/PoemsPage";
import CreatePoemPage from "./pages/CreatePoemPage";
import PoemDetailPage from "./pages/PoemDetailPage";
import EditPoemPage from "./pages/EditPoemPage";
import ExternalPoemPage from "./pages/ExternalPoemPage";

// Poetry Collection Pages
import PoetryCollectionPage from "./pages/PoetryCollectionPage";
import CollectionsPage from "./pages/CollectionsPage";
import RecommendationsPage from "./pages/RecommendationsPage";

// Email verification pages
import VerifyEmail from "./pages/VerifyEmail";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import OAuthSuccessHandler from "./components/auth/OAuthSuccessHandler";

// Chat Page
import ChatPage from "./pages/ChatPage";

// Updates & Feedback Module
import NewsFeedPage from "./pages/NewsFeedPage";
import FeedbackPage from "./pages/FeedbackPage";
import AdminUpdatesDashboard from "./components/admin/AdminUpdatesDashboard";

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
        <Route path="/contests" element={<ContestsPage />} />
        <Route path="/contests/:id" element={<ContestsPage />} />
        <Route path="/quizzes" element={<QuizzesPage />} />
        <Route path="/quizzes/:id" element={<QuizzesPage />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/poetry-tts" element={<PoetryTTSPage />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/pending-approval" element={<PendingApproval />} />

        {/* Poetry CRUD Routes */}
        <Route path="/poems" element={<PoemsPage />} />
        <Route path="/poems/create" element={<CreatePoemPage />} />
        <Route path="/poems/external/:title" element={<ExternalPoemPage />} />
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

        {/* Redirect unused pages to home */}
        <Route path="/guidelines" element={<RedirectToHome />} />
        <Route path="/success" element={<RedirectToHome />} />
        <Route path="/help" element={<RedirectToHome />} />
        <Route path="/contact" element={<RedirectToHome />} />
        <Route path="/privacy" element={<RedirectToHome />} />
        <Route path="/terms" element={<RedirectToHome />} />
        <Route path="/sitemap" element={<RedirectToHome />} />

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
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/verify-email" element={<VerifyEmail />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/oauth-success" element={<OAuthSuccessHandler />} />

        {/* Protected Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
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

        {/* Updates & Feedback Module Routes */}
        <Route path="/news-feed" element={<NewsFeedPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route
          path="/admin/updates"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminUpdatesDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all route for 404 errors */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
