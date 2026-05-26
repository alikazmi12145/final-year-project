import React from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";

const Layout = ({ children }) => {
  const { loading, user } = useAuth();
  const location = useLocation();

  // Check if current route should hide navbar
  const hideNavbarRoutes = [
    "/auth",
    "/forgot-password",
    "/reset-password",
    "/admin",
    "/poet",
    "/moderator",
    "/dashboard"
  ];

  // Routes that render their own footer block.
  const hideFooterRoutes = [
    "/poetry-tts"
  ];

  const shouldHideNavbar = hideNavbarRoutes.some((route) =>
    location.pathname.startsWith(route)
  );

  // Explicitly show navbar for poetry collection pages and poets pages
  const isPoetryCollectionPage =
    location.pathname.startsWith("/poetry-collection");
  const isPoetsPage = location.pathname.startsWith("/poets");
  const shouldShowNavbar =
    isPoetryCollectionPage || isPoetsPage || !shouldHideNavbar;
  const shouldShowFooter =
    shouldShowNavbar && !hideFooterRoutes.some((route) => location.pathname.startsWith(route));

  // Check if current route is auth page
  const isAuthPage = location.pathname === "/auth";

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-urdu-cream via-white to-urdu-gold/20">
        <div className="mb-8">
          <LoadingSpinner size="xl" variant="cultural" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-urdu-brown mb-2">
            Loading Bazm-e-Sukhan
          </h2>
          <p className="text-urdu-maroon">
            Please wait while we prepare your poetry experience
          </p>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-urdu-gold/10 rounded-full animate-pulse"></div>
        <div
          className="absolute bottom-20 right-20 w-24 h-24 bg-urdu-brown/10 rounded-full animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-urdu-cream/10">
      {shouldShowNavbar && <Navbar />}
      <main className="flex-grow relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-urdu-gold/5 rounded-full bsk-float-slow"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-urdu-brown/5 rounded-full bsk-float-slow" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-amber-100/20 rounded-full blur-3xl bsk-drift"></div>
        </div>
        <div key={location.pathname} className="relative z-10 bsk-page-enter">{children}</div>
      </main>
      {shouldShowFooter && <Footer />}
    </div>
  );
};

export default Layout;
