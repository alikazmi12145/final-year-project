import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import "../components/membership/membership.css";

export default function PaymentFailurePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planId = params.get("plan");
  return (
    <div className="bes-bg-night bes-geo-pattern min-h-screen text-amber-50 flex items-center">
      <div className="max-w-xl w-full mx-auto px-4 py-16">
        <div className="bes-glass rounded-3xl p-10 text-center bes-fade-up">
          <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/20 flex items-center justify-center mb-5">
            <XCircle className="w-10 h-10 text-rose-400" />
          </div>
          <h1
            dir="rtl"
            className="font-nastaliq text-4xl bes-gold-text leading-snug"
          >
            ادائیگی مکمل نہ ہو سکی
          </h1>
          <p className="text-amber-100/80 mt-3">
            Your payment was not completed. No charges have been made.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <button
              onClick={() => navigate("/membership")}
              className="bes-btn-ghost inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Plans
            </button>
            {planId && (
              <button
                onClick={() =>
                  navigate(`/membership/checkout?plan=${planId}&cycle=year`)
                }
                className="bes-btn-gold inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
