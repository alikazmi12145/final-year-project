import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Home, Construction } from "lucide-react";

const PlaceholderPage = ({
  title = "Page Under Construction",
  description = "This page is currently under development. Please check back later.",
}) => {
  return (
    <div className="min-h-screen cultural-bg flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center mx-auto mb-6">
          <Construction className="text-white w-10 h-10" />
        </div>

        <h1 className="text-3xl font-bold text-urdu-brown mb-4">{title}</h1>

        <p className="text-lg text-urdu-maroon mb-6">{description}</p>

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
            Need immediate assistance? Contact us at{" "}
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

export default PlaceholderPage;
