import React, { useState, useEffect } from "react";
import {
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Flag,
  MessageCircle,
} from "lucide-react";
import api from "../../services/api";

const ModeratorDashboard = () => {
  const [moderationQueue, setModerationQueue] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    pendingModeration: 0,
    resolvedToday: 0,
    totalReports: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    const fetchModerationData = async () => {
      try {
        const response = await api.getModerationQueue();
        if (response.data.success) {
          setModerationQueue(response.data.moderationQueue);
          setStats((prev) => ({
            ...prev,
            pendingReviews: response.data.stats.totalPending,
            activeUsers: response.data.stats.pendingUsers,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch moderation data:", error);
        // Fallback to empty array instead of mock data
        setModerationQueue([]);
        setStats({
          pendingModeration: 0,
          resolvedToday: 0,
          totalReports: 0,
          activeUsers: 0,
        });
      }
    };

    fetchModerationData();
  }, []);

  const handleApprove = (itemId) => {
    setModerationQueue((queue) => queue.filter((item) => item.id !== itemId));
    // In real app, this would call an API
  };

  const handleReject = (itemId) => {
    setModerationQueue((queue) => queue.filter((item) => item.id !== itemId));
    // In real app, this would call an API
  };

  const priorityColors = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-green-100 text-green-800",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
            <Shield className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-urdu-brown nastaleeq-heading">
              ماڈریٹر ڈیش بورڈ
            </h1>
            <p className="text-urdu-maroon nastaleeq-primary">
              مواد کی نگرانی اور کمیونٹی رپورٹس کا انتظام
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          {
            icon: AlertTriangle,
            label: "Pending Moderation",
            value: stats.pendingModeration,
            color: "text-red-600",
          },
          {
            icon: CheckCircle,
            label: "Resolved Today",
            value: stats.resolvedToday,
            color: "text-green-600",
          },
          {
            icon: Flag,
            label: "Total Reports",
            value: stats.totalReports,
            color: "text-blue-600",
          },
          {
            icon: Users,
            label: "Active Users",
            value: stats.activeUsers,
            color: "text-purple-600",
          },
        ].map((stat, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-urdu-brown">
                  {stat.value}
                </p>
                <p className="text-sm text-urdu-maroon">{stat.label}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Moderation Queue */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-urdu-brown">
              Moderation Queue
            </h2>
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
              {moderationQueue.length} items
            </span>
          </div>

          <div className="space-y-3">
            {moderationQueue.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        priorityColors[item.priority]
                      }`}
                    >
                      {item.priority}
                    </span>
                    <span className="text-sm text-urdu-maroon capitalize">
                      {item.type}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(item.submittedAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-medium text-urdu-brown mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-urdu-maroon mb-2">
                  By {item.user} • {item.reason}
                </p>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="flex-1 bg-green-50 text-green-600 py-2 rounded text-sm font-medium hover:bg-green-100"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    className="flex-1 bg-red-50 text-red-600 py-2 rounded text-sm font-medium hover:bg-red-100"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-urdu-brown">
              Recent Reports
            </h2>
            <BarChart3 className="w-5 h-5 text-urdu-gold" />
          </div>

          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-3 hover:bg-urdu-cream/30 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Flag className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="font-medium text-urdu-brown capitalize">
                      {report.type}
                    </p>
                    <p className="text-sm text-urdu-maroon">
                      Reported by {report.reporter}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    report.status === "new"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {report.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6 mt-8">
        <h2 className="text-xl font-bold text-urdu-brown mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Users,
              label: "User Management",
              description: "Manage user accounts and permissions",
              action: () => console.log("User management"),
            },
            {
              icon: MessageCircle,
              label: "Content Review",
              description: "Review reported content and comments",
              action: () => console.log("Content review"),
            },
            {
              icon: Shield,
              label: "Security Logs",
              description: "View security and moderation logs",
              action: () => console.log("Security logs"),
            },
          ].map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className="text-left p-4 border border-urdu-cream rounded-lg hover:bg-urdu-cream/30 transition-colors"
              >
                <Icon className="w-6 h-6 text-urdu-gold mb-2" />
                <h3 className="font-semibold text-urdu-brown mb-1">
                  {action.label}
                </h3>
                <p className="text-sm text-urdu-maroon">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModeratorDashboard;
