import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { canAccessDashboard } from "../auth/RoleBasedRedirect";
import {
  Menu,
  X,
  Search,
  User,
  BookOpen,
  Trophy,
  GraduationCap,
  LogOut,
  Home,
  Users,
  BarChart3,
  Feather,
  MessageCircle,
} from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isAuthenticated, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Enhanced Urdu navigation items with cultural aesthetics
  const navItems = [
    { path: "/", label: "گھر", urduLabel: "گھر", icon: Home },
    { path: "/search", label: "تلاش", urduLabel: "تلاش", icon: Search },
    {
      path: "/poetry-collection",
      label: "شاعری",
      urduLabel: "شاعری",
      icon: BookOpen,
    },
    { path: "/poets", label: "شعراء", urduLabel: "شعراء", icon: Users },
    { path: "/contests", label: "مقابلے", urduLabel: "مقابلے", icon: Trophy },
    {
      path: "/learning",
      label: "تعلیم",
      urduLabel: "تعلیم",
      icon: GraduationCap,
    },
    {
      path: "/recommendations",
      label: "تجاویز",
      urduLabel: "تجاویز",
      icon: Feather,
    },
  ];

  // Auth-only navigation items (shown only when logged in)
  const authNavItems = [
    {
      path: "/chat",
      label: "گفتگو",
      urduLabel: "گفتگو",
      icon: MessageCircle,
      authRequired: true,
    },
  ];

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsOpen(false);
  };

  return (
    <nav className="bg-gradient-to-r from-white via-urdu-cream/20 to-white backdrop-blur-md shadow-lg border-b-2 border-urdu-gold/30 sticky top-0 z-50 overflow-hidden">
      {/* Islamic geometric pattern overlay */}
      <div className="absolute inset-0 opacity-5 bg-gradient-to-r from-urdu-maroon/10 via-transparent to-urdu-gold/10"></div>
      <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-urdu-gold/10 to-transparent rounded-full transform -translate-x-16 -translate-y-16"></div>
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-urdu-maroon/10 to-transparent rounded-full transform translate-x-12 -translate-y-12"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center relative z-10">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="hidden sm:block">
                <span className="nastaleeq-heading text-2xl font-bold bg-gradient-to-r from-urdu-maroon via-urdu-brown to-urdu-gold bg-clip-text text-transparent group-hover:from-urdu-gold group-hover:to-urdu-maroon transition-all duration-300">
                  بزمِ سخن
                </span>
                <div className="text-xs text-urdu-brown/70 font-medium tracking-wide">
                  Urdu Poetry Platform
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation - Cultural Urdu Design */}
          <div className="hidden md:flex items-center space-x-1 relative z-10">
            {/* Regular navigation items */}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 group relative overflow-hidden ${
                    isActive
                      ? "bg-gradient-to-r from-urdu-maroon to-urdu-brown text-white shadow-lg shadow-urdu-maroon/25 border border-urdu-gold/30"
                      : "text-urdu-brown hover:bg-gradient-to-r hover:from-urdu-cream/30 hover:to-urdu-gold/20 hover:text-urdu-maroon hover:shadow-md"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {/* Background pattern for active item */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-urdu-gold/10 via-transparent to-urdu-maroon/10 opacity-20"></div>
                  )}
                  <Icon size={16} className="relative z-10" />
                  <span className="text-sm nastaleeq-primary font-semibold relative z-10">
                    {item.urduLabel}
                  </span>
                  {/* Cultural decorative dot */}
                  <div
                    className={`w-1 h-1 rounded-full transition-all duration-300 ${
                      isActive
                        ? "bg-urdu-gold"
                        : "bg-transparent group-hover:bg-urdu-maroon"
                    }`}
                  ></div>
                </Link>
              );
            })}

            {/* Auth-only navigation items */}
            {isAuthenticated &&
              authNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 group relative overflow-hidden ${
                      isActive
                        ? "bg-gradient-to-r from-urdu-maroon to-urdu-brown text-white shadow-lg shadow-urdu-maroon/25 border border-urdu-gold/30"
                        : "text-urdu-brown hover:bg-gradient-to-r hover:from-urdu-cream/30 hover:to-urdu-gold/20 hover:text-urdu-maroon hover:shadow-md"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {/* Background pattern for active item */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-urdu-gold/10 via-transparent to-urdu-maroon/10 opacity-20"></div>
                    )}
                    <Icon size={16} className="relative z-10" />
                    <span className="text-sm nastaleeq-primary font-semibold relative z-10">
                      {item.urduLabel}
                    </span>
                    {/* Cultural decorative dot */}
                    <div
                      className={`w-1 h-1 rounded-full transition-all duration-300 ${
                        isActive
                          ? "bg-urdu-gold"
                          : "bg-transparent group-hover:bg-urdu-maroon"
                      }`}
                    ></div>
                  </Link>
                );
              })}
          </div>

          {/* Desktop Auth Section - Cultural Design */}
          <div className="hidden md:flex items-center space-x-3 relative z-10">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                {/* User Menu with Cultural Design */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 bg-gradient-to-r from-urdu-cream/50 to-white/70 px-4 py-2.5 rounded-xl hover:from-urdu-cream hover:to-urdu-gold/20 transition-all duration-300 shadow-sm hover:shadow-md border border-urdu-gold/20">
                    <div className="w-7 h-7 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full flex items-center justify-center shadow-sm">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-urdu-brown max-w-24 truncate nastaleeq-primary">
                      {user?.name || user?.username || "User"}
                    </span>
                  </button>

                  {/* Dropdown with Cultural Styling */}
                  <div className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-urdu-gold/30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 overflow-hidden">
                    {/* Cultural header pattern */}
                    <div className="h-2 bg-gradient-to-r from-urdu-maroon via-urdu-gold to-urdu-brown"></div>

                    <div className="px-4 py-3 border-b border-urdu-gold/20 bg-gradient-to-r from-urdu-cream/30 to-transparent">
                      <p className="font-medium text-urdu-brown truncate nastaleeq-primary">
                        {user?.name || user?.username || "User"}
                      </p>
                      <p className="text-xs text-urdu-maroon capitalize nastaleeq-primary">
                        {user?.role === "admin"
                          ? "ایڈمن"
                          : user?.role === "poet"
                          ? "شاعر"
                          : user?.role === "moderator"
                          ? "منیجر"
                          : "قاری"}
                      </p>
                    </div>

                    <Link
                      to="/profile"
                      className="flex items-center space-x-2 px-4 py-3 text-sm text-urdu-brown hover:bg-urdu-cream/30 hover:text-urdu-maroon transition-all nastaleeq-primary"
                    >
                      <User size={14} />
                      <span>پروفائل</span>
                    </Link>

                    <Link
                      to="/collections"
                      className="flex items-center space-x-2 px-4 py-3 text-sm text-urdu-brown hover:bg-urdu-cream/30 hover:text-urdu-maroon transition-all nastaleeq-primary"
                    >
                      <BookOpen size={14} />
                      <span>میرے مجموعے</span>
                    </Link>

                    <Link
                      to="/chat"
                      className="flex items-center space-x-2 px-4 py-3 text-sm text-urdu-brown hover:bg-urdu-cream/30 hover:text-urdu-maroon transition-all nastaleeq-primary"
                    >
                      <MessageCircle size={14} />
                      <span>گفتگو</span>
                    </Link>

                    {/* Dashboard Link */}
                    {canAccessDashboard(user?.role) && (
                      <Link
                        to={
                          user?.role === "admin"
                            ? "/admin"
                            : user?.role === "poet"
                            ? "/poet"
                            : user?.role === "moderator"
                            ? "/moderator"
                            : "/dashboard"
                        }
                        className="flex items-center space-x-2 px-4 py-3 text-sm text-urdu-brown hover:bg-urdu-cream/30 hover:text-urdu-maroon transition-all nastaleeq-primary"
                      >
                        <BarChart3 size={14} />
                        <span>ڈیش بورڈ</span>
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 border-t border-urdu-gold/20 transition-all nastaleeq-primary"
                    >
                      <LogOut size={14} />
                      <span>لاگ آؤٹ</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/auth?tab=login"
                  className="px-4 py-2 text-urdu-brown font-medium text-sm hover:text-urdu-maroon transition-colors nastaleeq-primary"
                >
                  داخل ہوں
                </Link>
                <Link
                  to="/auth?tab=register"
                  className="px-5 py-2.5 bg-gradient-to-r from-urdu-maroon to-urdu-brown text-white font-medium text-sm rounded-xl hover:shadow-lg hover:from-urdu-brown hover:to-urdu-gold transition-all duration-300 transform hover:scale-105 nastaleeq-primary border border-urdu-gold/20"
                >
                  مفت رکنیت
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-600 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100 transition-all duration-200"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation - Cultural Urdu Design */}
        {isOpen && (
          <div className="md:hidden border-t-2 border-urdu-gold/30 relative">
            {/* Cultural mobile menu background */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-urdu-cream/20 to-white/95 backdrop-blur-sm"></div>

            <div className="px-2 pt-4 pb-6 space-y-2 relative z-10">
              {/* Navigation Items */}
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                      isActive
                        ? "bg-gradient-to-r from-urdu-maroon to-urdu-brown text-white shadow-lg"
                        : "text-urdu-brown hover:bg-gradient-to-r hover:from-urdu-cream/50 hover:to-urdu-gold/30 hover:text-urdu-maroon"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-urdu-gold/20 to-transparent opacity-30"></div>
                    )}
                    <Icon size={18} className="relative z-10" />
                    <span className="font-medium nastaleeq-primary relative z-10">
                      {item.urduLabel}
                    </span>
                    {/* Cultural decorative element */}
                    <div
                      className={`ml-auto w-2 h-2 rounded-full transition-all duration-300 ${
                        isActive
                          ? "bg-urdu-gold"
                          : "bg-transparent group-hover:bg-urdu-maroon"
                      }`}
                    ></div>
                  </Link>
                );
              })}

              {/* Auth-only mobile navigation items */}
              {isAuthenticated &&
                authNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                        isActive
                          ? "bg-gradient-to-r from-urdu-maroon to-urdu-brown text-white shadow-lg"
                          : "text-urdu-brown hover:bg-gradient-to-r hover:from-urdu-cream/50 hover:to-urdu-gold/30 hover:text-urdu-maroon"
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-urdu-gold/20 to-transparent opacity-30"></div>
                      )}
                      <Icon size={18} className="relative z-10" />
                      <span className="font-medium nastaleeq-primary relative z-10">
                        {item.urduLabel}
                      </span>
                      {/* Cultural decorative element */}
                      <div
                        className={`ml-auto w-2 h-2 rounded-full transition-all duration-300 ${
                          isActive
                            ? "bg-urdu-gold"
                            : "bg-transparent group-hover:bg-urdu-maroon"
                        }`}
                      ></div>
                    </Link>
                  );
                })}

              {/* Mobile Auth Section */}
              <div className="border-t-2 border-urdu-gold/30 pt-4 mt-4 bg-gradient-to-r from-urdu-cream/20 to-transparent rounded-xl p-3">
                {isAuthenticated ? (
                  <>
                    <div className="px-4 py-3 mb-3 bg-gradient-to-r from-white/70 to-urdu-cream/30 rounded-xl border border-urdu-gold/20">
                      <p className="font-medium text-urdu-brown nastaleeq-primary">
                        {user?.profile?.fullName || user?.username}
                      </p>
                      <p className="text-sm text-urdu-maroon capitalize nastaleeq-primary">
                        {user?.role === "admin"
                          ? "ایڈمن"
                          : user?.role === "poet"
                          ? "شاعر"
                          : user?.role === "moderator"
                          ? "منیجر"
                          : "قاری"}
                      </p>
                    </div>

                    <Link
                      to="/profile"
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl text-urdu-brown hover:bg-urdu-cream/40 hover:text-urdu-maroon transition-all nastaleeq-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      <User size={18} />
                      <span className="font-medium">پروفائل</span>
                    </Link>

                    <Link
                      to="/collections"
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl text-urdu-brown hover:bg-urdu-cream/40 hover:text-urdu-maroon transition-all nastaleeq-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      <BookOpen size={18} />
                      <span className="font-medium">میرے مجموعے</span>
                    </Link>

                    <Link
                      to="/chat"
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl text-urdu-brown hover:bg-urdu-cream/40 hover:text-urdu-maroon transition-all nastaleeq-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      <MessageCircle size={18} />
                      <span className="font-medium">گفتگو</span>
                    </Link>

                    {canAccessDashboard(user?.role) && (
                      <Link
                        to={`/dashboard/${user?.role}`}
                        className="flex items-center space-x-3 px-4 py-3 rounded-xl text-urdu-brown hover:bg-urdu-cream/40 hover:text-urdu-maroon transition-all nastaleeq-primary"
                        onClick={() => setIsOpen(false)}
                      >
                        <BarChart3 size={18} />
                        <span className="font-medium">ڈیش بورڈ</span>
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all nastaleeq-primary"
                    >
                      <LogOut size={18} />
                      <span className="font-medium">لاگ آؤٹ</span>
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <Link
                      to="/auth?tab=login"
                      className="block text-center px-4 py-3 rounded-xl font-medium border-2 border-urdu-gold/30 text-urdu-brown hover:bg-urdu-cream/30 hover:border-urdu-gold transition-all nastaleeq-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      داخل ہوں
                    </Link>
                    <Link
                      to="/auth?tab=register"
                      className="block text-center px-4 py-3 rounded-xl font-medium bg-gradient-to-r from-urdu-maroon to-urdu-brown text-white hover:shadow-lg transition-all transform hover:scale-[1.02] nastaleeq-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      مفت رکنیت
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
