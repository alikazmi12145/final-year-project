import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  Mail,
  Phone,
  MapPin,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import axios from "axios";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    type: null,
    message: "",
  });

  const footerLinks = {
    explore: [
      { name: "شاعری کا ذخیرہ", engName: "Poetry Collection", href: "/poetry-collection" },
      { name: "مشہور شعراء", engName: "Featured Poets", href: "/poets" },
      { name: "شعری مقابلے", engName: "Poetry Contests", href: "/contests" },
      { name: "تعلیمی مواد", engName: "Learning Resources", href: "/learning" },
    ],
    community: [
      {
        name: "قاری بنیں",
        engName: "Join as Reader",
        href: "/auth?tab=register&role=reader",
      },
      {
        name: "شاعر بنیں",
        engName: "Join as Poet",
        href: "/auth?tab=register&role=poet",
      },
      {
        name: "کمیونٹی رہنما اصول",
        engName: "Community Guidelines",
        href: "/guidelines",
      },
      {
        name: "کامیابی کی کہانیاں",
        engName: "Success Stories",
        href: "/success",
      },
    ],
    support: [
      { name: "مدد مرکز", engName: "Help Center", href: "/help" },
      { name: "رابطہ کریں", engName: "Contact Us", href: "/contact" },
      { name: "پرائیویسی پالیسی", engName: "Privacy Policy", href: "/privacy" },
      { name: "استعمال کی شرائط", engName: "Terms of Service", href: "/terms" },
    ],
  };

  const socialLinks = [
    {
      icon: Twitter,
      href: "https://twitter.com/bazmesukhan",
      label: "Twitter",
    },
    {
      icon: Facebook,
      href: "https://facebook.com/bazmesukhan",
      label: "Facebook",
    },
    {
      icon: Instagram,
      href: "https://instagram.com/bazmesukhan",
      label: "Instagram",
    },
    {
      icon: Youtube,
      href: "https://youtube.com/@bazmesukhan",
      label: "YouTube",
    },
  ];

  // Handle newsletter subscription
  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();

    // Validate email
    if (!email || !email.includes("@")) {
      setSubscriptionStatus({
        type: "error",
        message: "براہ کرم درست ایمیل درج کریں / Please enter a valid email",
      });
      return;
    }

    setIsSubmitting(true);
    setSubscriptionStatus({ type: null, message: "" });

    try {
      const response = await axios.post(
        "http://localhost:5000/api/newsletter/subscribe",
        {
          email,
        }
      );

      setSubscriptionStatus({
        type: "success",
        message:
          response.data.message ||
          "شکریہ! آپ نے کامیابی سے سبسکرائب کر لیا / Thank you for subscribing!",
      });
      setEmail("");
    } catch (error) {
      setSubscriptionStatus({
        type: "error",
        message:
          error.response?.data?.message ||
          "کچھ غلط ہو گیا، دوبارہ کوشش کریں / Something went wrong, please try again",
      });
    } finally {
      setIsSubmitting(false);
      // Clear status after 5 seconds
      setTimeout(() => {
        setSubscriptionStatus({ type: null, message: "" });
      }, 5000);
    }
  };

  // Handle contact click
  const handleContactClick = (type, value) => {
    if (type === "email") {
      window.location.href = `mailto:${value}`;
    } else if (type === "phone") {
      window.location.href = `tel:${value.replace(/\s+/g, "")}`;
    }
  };

  return (
    <footer className="bg-gradient-to-br from-urdu-brown via-urdu-maroon to-gray-900 text-white relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-urdu-gold rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-urdu-cream rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-urdu-gold to-transparent rounded-full"></div>
      </div>

      {/* Main Footer */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Enhanced Brand Section */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center space-x-3 mb-6 group">
              <div className="w-16 h-16 bg-gradient-to-br from-white via-urdu-cream to-urdu-gold rounded-3xl flex items-center justify-center shadow-2xl group-hover:shadow-3xl transition-all duration-500 transform group-hover:scale-105 border-2 border-urdu-gold/30 group-hover:border-urdu-gold/60">
                <div className="w-12 h-12 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-2xl flex items-center justify-center">
                  <span className="text-white font-bold text-2xl nastaleeq-heading">
                    ب
                  </span>
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-white via-urdu-cream to-urdu-gold bg-clip-text text-transparent nastaleeq-heading">
                  بزمِ سخن
                </span>
                <span className="block text-urdu-gold text-sm font-medium tracking-wide">
                  Urdu Poetry Platform
                </span>
              </div>
            </Link>

            <p
              className="text-urdu-cream mb-8 leading-relaxed text-sm nastaleeq-primary"
              style={{ lineHeight: "1.8" }}
            >
              ایک ڈجیٹل پناہ گاہ جہاں کلاسیکی اردو شاعری اور جدید ٹیکنالوجی کا
              ملاپ۔ اردو ادب کی خوبصورتی کو دریافت، تخلیق اور محفوظ کرنے کے لیے
              ہماری کمیونٹی میں شامل ہوں۔
              <br />
              <br />
              <span className="text-urdu-gold/80 text-xs">
                A digital sanctuary where classical Urdu poetry meets modern
                technology.
              </span>
            </p>

            <div className="flex space-x-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/20 transition-all duration-300 transform hover:scale-110 hover:shadow-lg"
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Explore Links */}
          <div>
            <h3 className="text-xl font-bold mb-6 text-urdu-gold nastaleeq-heading">
              دریافت کریں
              <span className="block text-sm font-normal text-urdu-cream/70 mt-1">
                Explore
              </span>
            </h3>
            <ul className="space-y-3">
              {footerLinks.explore.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-urdu-cream hover:text-white transition-all duration-300 flex items-center group"
                  >
                    <span className="w-2 h-2 bg-urdu-gold rounded-full mr-3 group-hover:w-4 transition-all duration-300"></span>
                    <div>
                      <span className="nastaleeq-primary font-medium">
                        {link.name}
                      </span>
                      <span className="block text-xs text-urdu-cream/60">
                        {link.engName}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h3 className="text-xl font-bold mb-6 text-urdu-gold nastaleeq-heading">
              کمیونٹی
              <span className="block text-sm font-normal text-urdu-cream/70 mt-1">
                Community
              </span>
            </h3>
            <ul className="space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-urdu-cream hover:text-white transition-all duration-300 flex items-center group"
                  >
                    <span className="w-2 h-2 bg-urdu-gold rounded-full mr-3 group-hover:w-4 transition-all duration-300"></span>
                    <div>
                      <span className="nastaleeq-primary font-medium">
                        {link.name}
                      </span>
                      <span className="block text-xs text-urdu-cream/60">
                        {link.engName}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xl font-bold mb-6 text-urdu-gold nastaleeq-heading">
              رابطہ کریں
              <span className="block text-sm font-normal text-urdu-cream/70 mt-1">
                Contact Us
              </span>
            </h3>
            <div className="space-y-4">
              <button
                onClick={() =>
                  handleContactClick("email", "support@bazmesukhan.com")
                }
                className="flex items-center space-x-3 group w-full text-left hover:bg-white/5 p-2 rounded-xl transition-all duration-300"
              >
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all duration-300 shadow-lg">
                  <Mail className="w-5 h-5 text-urdu-gold" />
                </div>
                <div>
                  <span className="text-urdu-cream group-hover:text-white transition-colors nastaleeq-primary text-sm">
                    support@bazmesukhan.com
                  </span>
                  <span className="block text-xs text-urdu-cream/60">
                    مدد کے لیے ایمیل
                  </span>
                </div>
              </button>
              <button
                onClick={() => handleContactClick("phone", "+92 300 1234567")}
                className="flex items-center space-x-3 group w-full text-left hover:bg-white/5 p-2 rounded-xl transition-all duration-300"
              >
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all duration-300 shadow-lg">
                  <Phone className="w-5 h-5 text-urdu-gold" />
                </div>
                <div>
                  <span className="text-urdu-cream group-hover:text-white transition-colors text-sm">
                    +92 300 1234567
                  </span>
                  <span className="block text-xs text-urdu-cream/60 nastaleeq-primary">
                    رابطہ نمبر
                  </span>
                </div>
              </button>
              <div className="flex items-center space-x-3 group">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all duration-300 shadow-lg">
                  <MapPin className="w-5 h-5 text-urdu-gold" />
                </div>
                <div>
                  <span className="text-urdu-cream group-hover:text-white transition-colors text-sm">
                    Islamabad, Pakistan
                  </span>
                  <span className="block text-xs text-urdu-cream/60 nastaleeq-primary">
                    اسلام آباد، پاکستان
                  </span>
                </div>
              </div>
            </div>

            {/* Newsletter Signup */}
            <div className="mt-8">
              <h4 className="font-bold mb-4 text-urdu-gold nastaleeq-heading">
                اپ ڈیٹ رہیں
                <span className="block text-sm font-normal text-urdu-cream/70">
                  Stay Updated
                </span>
              </h4>
              <form
                onSubmit={handleNewsletterSubmit}
                className="flex flex-col gap-3"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="اپنا ایمیل درج کریں / Your email"
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-urdu-gold/30 text-white placeholder-urdu-cream/70 focus:outline-none focus:border-urdu-gold focus:ring-2 focus:ring-urdu-gold/20 transition-all duration-300 nastaleeq-primary"
                  style={{ direction: "rtl" }}
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-8 py-3 bg-gradient-to-r from-urdu-gold to-yellow-500 text-urdu-brown rounded-2xl font-bold hover:from-yellow-500 hover:to-urdu-gold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl nastaleeq-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاری ہے...</span>
                    </>
                  ) : (
                    <span>شامل ہوں</span>
                  )}
                </button>
              </form>

              {/* Status Messages */}
              {subscriptionStatus.message && (
                <div
                  className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                    subscriptionStatus.type === "success"
                      ? "bg-green-500/20 border border-green-500/50"
                      : "bg-red-500/20 border border-red-500/50"
                  }`}
                >
                  {subscriptionStatus.type === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  )}
                  <span
                    className="text-sm text-white nastaleeq-primary"
                    style={{ direction: "rtl" }}
                  >
                    {subscriptionStatus.message}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t-2 border-urdu-gold/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2 text-urdu-cream">
              <span className="nastaleeq-primary">محبت سے بنایا گیا</span>
              <Heart className="w-4 h-4 fill-current text-red-400 animate-pulse" />
              <span className="nastaleeq-primary">
                اردو شاعری کے عاشقوں کے لیے
              </span>
              <span className="text-urdu-cream/60 text-xs ml-2">
                Made with love for Urdu poetry lovers
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm text-urdu-cream">
              <span className="nastaleeq-primary">
                &copy; {currentYear} بزمِ سخن - تمام حقوق محفوظ ہیں
              </span>
              <div className="flex space-x-4">
                <Link
                  to="/privacy"
                  className="hover:text-white transition-colors nastaleeq-primary"
                >
                  پرائیویسی
                </Link>
                <Link
                  to="/terms"
                  className="hover:text-white transition-colors nastaleeq-primary"
                >
                  شرائط
                </Link>
                <Link
                  to="/sitemap"
                  className="hover:text-white transition-colors nastaleeq-primary"
                >
                  سائٹ میپ
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
