import React from "react";
import { Link } from "react-router-dom";
import { Shield, Home, ArrowLeft } from "lucide-react";

const Unauthorized = () => {
  return (
    <div className="min-h-screen cultural-bg flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-gradient-to-r from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-12 h-12 text-red-600" />
        </div>

        <h1 className="text-4xl font-bold text-urdu-brown mb-4">
          Access Denied
        </h1>

        <p className="text-lg text-urdu-maroon mb-6">
          You don't have permission to access this page. Please contact an
          administrator if you believe this is an error.
        </p>

        <div className="space-y-3">
          <Link
            to="/"
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            <Home size={20} />
            <span>Go Home</span>
          </Link>

          <button
            onClick={() => window.history.back()}
            className="btn-secondary w-full flex items-center justify-center space-x-2"
          >
            <ArrowLeft size={20} />
            <span>Go Back</span>
          </button>
        </div>

        <div className="mt-8 p-4 bg-urdu-cream/30 rounded-lg">
          <p className="text-sm text-urdu-brown">
            Need help? Contact support at{" "}
            <a
              href="mailto:support@bazmesukhan.com"
              className="text-urdu-maroon hover:underline"
            >
              support@bazmesukhan.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
