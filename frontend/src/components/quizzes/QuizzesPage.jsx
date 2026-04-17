import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Brain, Clock, BarChart3, Search, Filter, Star,
  ChevronLeft, CheckCircle, XCircle, Award, PlusCircle,
  MessageSquare, ChevronRight, HelpCircle, AlertTriangle, Info,
} from "lucide-react";
import { quizAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import LeaderboardTable from "../contests/LeaderboardTable";
import FeedbackForm from "../contests/FeedbackForm";
import toast from "react-hot-toast";

// ============ CATEGORY MAP ============
const categoryUrdu = {
  poetry_knowledge: "شاعری کا علم",
  poet_biography: "شاعر کی سوانح عمری",
  literary_terms: "ادبی اصطلاحات",
  classical_poetry: "کلاسیکی شاعری",
  modern_poetry: "جدید شاعری",
  general: "عمومی",
};

// ============ PROFESSIONAL POPUP ============
const QuizPopup = ({ show, type, title, message, onClose, onConfirm, confirmLabel }) => {
  if (!show) return null;

  const config = {
    success: {
      icon: <CheckCircle className="w-12 h-12 text-green-500" />,
      bg: "from-green-50 to-emerald-50",
      border: "border-green-200",
      titleColor: "text-green-800",
      btnClass: "bg-green-600 hover:bg-green-700",
    },
    error: {
      icon: <XCircle className="w-12 h-12 text-red-500" />,
      bg: "from-red-50 to-rose-50",
      border: "border-red-200",
      titleColor: "text-red-800",
      btnClass: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      icon: <AlertTriangle className="w-12 h-12 text-amber-500" />,
      bg: "from-amber-50 to-yellow-50",
      border: "border-amber-200",
      titleColor: "text-amber-800",
      btnClass: "bg-amber-600 hover:bg-amber-700",
    },
    info: {
      icon: <Info className="w-12 h-12 text-blue-500" />,
      bg: "from-blue-50 to-indigo-50",
      border: "border-blue-200",
      titleColor: "text-blue-800",
      btnClass: "bg-blue-600 hover:bg-blue-700",
    },
  };

  const c = config[type] || config.info;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Modal */}
      <div className={`relative bg-gradient-to-b ${c.bg} border-2 ${c.border} rounded-2xl shadow-2xl max-w-md w-full p-8 animate-popup`}>
        <div className="text-center">
          <div className="flex justify-center mb-4">{c.icon}</div>
          <h3 className={`text-xl font-bold mb-3 ${c.titleColor}`}>{title}</h3>
          <p className="text-gray-700 text-sm leading-relaxed mb-6">{message}</p>
          <div className="flex gap-3 justify-center">
            {onConfirm && (
              <button
                onClick={onConfirm}
                className={`px-6 py-2.5 rounded-xl text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl ${c.btnClass}`}
              >
                {confirmLabel || "ٹھیک ہے"}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200"
            >
              {onConfirm ? "واپس جائیں" : "ٹھیک ہے"}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes popupIn {
          0% { opacity: 0; transform: scale(0.85) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-popup { animation: popupIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

// ============= QUIZ LIST =============
const QuizList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    category: "all",
    difficulty: "all",
    search: "",
  });
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 12 };
      if (filters.category !== "all") params.category = filters.category;
      if (filters.difficulty !== "all") params.difficulty = filters.difficulty;
      if (filters.search) params.search = filters.search;

      const { data } = await quizAPI.getAllQuizzes(params);
      if (data.success) {
        setQuizzes(data.quizzes || []);
        setPagination(data.pagination || {});
      }
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      toast.error("کوئزز حاصل کرنے میں مشکل پیش آئی");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const difficultyBadge = (level) => {
    const map = {
      beginner: { label: "آسان", cls: "bg-green-100 text-green-800" },
      intermediate: { label: "درمیانہ", cls: "bg-yellow-100 text-yellow-800" },
      advanced: { label: "مشکل", cls: "bg-red-100 text-red-800" },
    };
    const info = map[level] || map.beginner;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${info.cls}`}>{info.label}</span>;
  };

  return (
    <div className="min-h-screen cultural-bg py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">بزمِ کوئز</h1>
          <p className="text-lg text-urdu-brown">
            شاعری کے بارے میں اپنا علم جانچیں
          </p>
        </div>

        {/* Create Button (Admin) */}
        {user?.role === "admin" && (
          <div className="mb-6 text-right">
            <Button
              variant="primary"
              size="small"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <PlusCircle className="w-4 h-4 mr-1" />
              {showCreateForm ? "بند کریں" : "نیا کوئز بنائیں"}
            </Button>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <Card className="mb-8">
            <CreateQuizForm
              onSuccess={() => {
                setShowCreateForm(false);
                fetchQuizzes();
              }}
            />
          </Card>
        )}

        {/* Filters */}
        <div className="card p-4 mb-6 flex flex-wrap gap-3 items-center">
          <Filter className="w-5 h-5 text-urdu-brown" />
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => {
                setFilters((f) => ({ ...f, search: e.target.value }));
                setPage(1);
              }}
              placeholder="کوئز تلاش کریں..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-urdu-gold focus:outline-none text-sm"
            />
          </div>
          <select
            value={filters.category}
            onChange={(e) => {
              setFilters((f) => ({ ...f, category: e.target.value }));
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-urdu-gold focus:outline-none"
          >
            <option value="all">تمام قسم</option>
            <option value="poetry_knowledge">شاعری کا علم</option>
            <option value="poet_biography">شاعر کی سوانح</option>
            <option value="literary_terms">ادبی اصطلاحات</option>
            <option value="classical_poetry">کلاسیکی شاعری</option>
            <option value="modern_poetry">جدید شاعری</option>
            <option value="general">عمومی</option>
          </select>
          <select
            value={filters.difficulty}
            onChange={(e) => {
              setFilters((f) => ({ ...f, difficulty: e.target.value }));
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-urdu-gold focus:outline-none"
          >
            <option value="all">تمام سطح</option>
            <option value="beginner">آسان</option>
            <option value="intermediate">درمیانہ</option>
            <option value="advanced">مشکل</option>
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        )}

        {/* Quizzes Grid */}
        {!loading && quizzes.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <Link
                key={quiz._id}
                to={`/quizzes/${quiz._id}`}
                className="card p-6 hover:shadow-xl transition-all duration-300 group block"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-urdu-brown group-hover:text-urdu-maroon truncate flex-1 mr-2">
                    {quiz.title}
                  </h3>
                  {difficultyBadge(quiz.difficulty)}
                </div>

                {quiz.description && (
                  <p className="text-urdu-maroon mb-4 text-sm line-clamp-2">
                    {quiz.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-urdu-brown mb-3">
                  <div className="flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{quiz.totalQuestions || quiz.questions?.length || 0} سوالات</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{quiz.timeLimit || 15} منٹ</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-urdu-gold font-medium">
                    {categoryUrdu[quiz.category] || quiz.category?.replace("_", " ")}
                  </span>
                  <span className="text-gray-500">
                    {quiz.stats?.totalAttempts || 0} کوششیں
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && quizzes.length === 0 && (
          <div className="card p-8 text-center">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-urdu-brown mb-2">
              ابھی کوئی کوئز دستیاب نہیں
            </h3>
            <p className="text-urdu-maroon">نئے کوئزز کے لیے بعد میں آئیں</p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button variant="outline" size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              پچھلا
            </Button>
            <span className="px-4 py-2 text-sm text-urdu-brown">
              {page} / {pagination.totalPages}
            </span>
            <Button variant="outline" size="small" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              اگلا
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============= CREATE QUIZ FORM =============
const CreateQuizForm = ({ onSuccess }) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "poetry_knowledge",
    difficulty: "beginner",
    timeLimit: 15,
    passingScore: 60,
    questions: [
      {
        question: "",
        type: "multiple_choice",
        options: [
          { text: "", isCorrect: true },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ],
        points: 1,
      },
    ],
  });
  const [loading, setLoading] = useState(false);

  const updateQuestion = (qi, field, value) => {
    setForm((prev) => {
      const questions = [...prev.questions];
      questions[qi] = { ...questions[qi], [field]: value };
      return { ...prev, questions };
    });
  };

  const updateOption = (qi, oi, field, value) => {
    setForm((prev) => {
      const questions = [...prev.questions];
      const options = [...questions[qi].options];
      if (field === "isCorrect" && value) {
        // Set all others to false
        options.forEach((o, i) => (options[i] = { ...o, isCorrect: i === oi }));
      } else {
        options[oi] = { ...options[oi], [field]: value };
      }
      questions[qi] = { ...questions[qi], options };
      return { ...prev, questions };
    });
  };

  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question: "",
          type: "multiple_choice",
          options: [
            { text: "", isCorrect: true },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
          ],
          points: 1,
        },
      ],
    }));
  };

  const removeQuestion = (qi) => {
    if (form.questions.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== qi),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data } = await quizAPI.createQuiz(form);
      if (data.success) {
        toast.success("کوئز کامیابی سے تخلیق ہو گیا");
        onSuccess?.();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "کوئز تخلیق کرنے میں مشکل پیش آئی");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold text-urdu-brown flex items-center gap-2">
        <PlusCircle className="w-5 h-5 text-urdu-gold" />
        نیا کوئز تخلیق کریں
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-urdu-brown mb-1">عنوان *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-urdu-brown mb-1">قسم *</label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
          >
            <option value="poetry_knowledge">شاعری کا علم</option>
            <option value="poet_biography">شاعر کی سوانح</option>
            <option value="literary_terms">ادبی اصطلاحات</option>
            <option value="classical_poetry">کلاسیکی شاعری</option>
            <option value="modern_poetry">جدید شاعری</option>
            <option value="general">عمومی</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-urdu-brown mb-1">تفصیل</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={2}
          className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80 resize-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-urdu-brown mb-1">سطح</label>
          <select
            value={form.difficulty}
            onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
            className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
          >
            <option value="beginner">آسان</option>
            <option value="intermediate">درمیانہ</option>
            <option value="advanced">مشکل</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-urdu-brown mb-1">وقت (منٹ)</label>
          <input
            type="number"
            value={form.timeLimit}
            onChange={(e) => setForm((f) => ({ ...f, timeLimit: parseInt(e.target.value) || 15 }))}
            min={1}
            max={120}
            className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-urdu-brown mb-1">پاسنگ % </label>
          <input
            type="number"
            value={form.passingScore}
            onChange={(e) => setForm((f) => ({ ...f, passingScore: parseInt(e.target.value) || 60 }))}
            min={1}
            max={100}
            className="w-full px-4 py-2 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:outline-none bg-white/80"
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <h3 className="font-semibold text-urdu-brown">سوالات</h3>
        {form.questions.map((q, qi) => (
          <div key={qi} className="border-2 border-urdu-gold/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-urdu-gold">سوال {qi + 1}</span>
              {form.questions.length > 1 && (
                <button type="button" onClick={() => removeQuestion(qi)} className="text-red-400 hover:text-red-600 text-sm">
                  حذف کریں
                </button>
              )}
            </div>
            <input
              type="text"
              value={q.question}
              onChange={(e) => updateQuestion(qi, "question", e.target.value)}
              placeholder="سوال لکھیں..."
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-urdu-gold focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={opt.isCorrect}
                    onChange={() => updateOption(qi, oi, "isCorrect", true)}
                    className="accent-urdu-brown"
                    title="صحیح جواب منتخب کریں"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => updateOption(qi, oi, "text", e.target.value)}
                    placeholder={`آپشن ${oi + 1}`}
                    required
                    className={`flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none ${
                      opt.isCorrect ? "border-green-400 bg-green-50" : "border-gray-200"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={addQuestion} className="text-sm text-urdu-brown hover:text-urdu-gold">
          + مزید سوال شامل کریں
        </button>
      </div>

      <Button type="submit" variant="primary" loading={loading} disabled={loading}>
        کوئز محفوظ کریں
      </Button>
    </form>
  );
};

// ============= QUIZ DETAILS =============
const QuizDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [attemptState, setAttemptState] = useState(null); // null | 'taking' | 'result'
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [result, setResult] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null); // seconds remaining
  const [timerExpired, setTimerExpired] = useState(false);
  const [popup, setPopup] = useState(null); // { type, title, message, onConfirm?, confirmLabel? }

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const { data } = await quizAPI.getQuizById(id);
      if (data.success) {
        setQuiz(data.quiz);
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      setPopup({ type: "error", title: "خرابی", message: "کوئز کی تفصیلات حاصل نہیں ہو سکیں" });
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data } = await quizAPI.getLeaderboard(id);
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "leaderboard") fetchLeaderboard();
  }, [activeTab]);

  // Countdown timer
  useEffect(() => {
    if (attemptState !== "taking" || timeLeft === null) return;

    if (timeLeft <= 0) {
      setTimerExpired(true);
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          setTimerExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [attemptState, timeLeft]);

  // Auto-submit when timer expires
  useEffect(() => {
    if (timerExpired && attemptState === "taking" && !submitLoading) {
      setPopup({ type: "warning", title: "وقت مکمل", message: "وقت مکمل ہو گیا — آپ کے جوابات خودکار طور پر جمع کیے جا رہے ہیں" });
      handleSubmitQuiz();
    }
  }, [timerExpired]);

  const handleStartQuiz = async () => {
    try {
      const { data } = await quizAPI.startAttempt(id);
      if (data.success) {
        setQuestions(data.questions || []);
        setAttemptState("taking");
        setStartTime(Date.now());
        setAnswers({});
        setCurrentQuestion(0);
        setTimerExpired(false);
        // Set timer: timeLimit from response (minutes) → seconds
        const timeLimitMinutes = data.timeLimit || quiz?.timeLimit || 15;
        setTimeLeft(timeLimitMinutes * 60);
        setPopup({ type: "success", title: "کوئز کا آغاز", message: "کوئز کا آغاز ہو چکا ہے — بہترین کارکردگی دکھائیں" });
      }
    } catch (error) {
      setPopup({ type: "error", title: "ناکامی", message: error.response?.data?.message || "کوئز شروع کرنے میں مشکل پیش آئی" });
    }
  };

  const handleSelectAnswer = (questionIndex, optionText) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionText }));
  };

  const handleSubmitQuiz = async () => {
    try {
      setSubmitLoading(true);
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      const formattedAnswers = questions.map((q) => ({
        questionIndex: q.index,
        selectedOption: answers[q.index] || "",
      }));

      const { data } = await quizAPI.submitAttempt(id, {
        answers: formattedAnswers,
        timeSpent,
      });

      if (data.success) {
        setResult(data.result);
        setAttemptState("result");
        setPopup({ type: "success", title: "جوابات جمع", message: data.message || "آپ کے جوابات کامیابی سے جمع ہو گئے" });
      }
    } catch (error) {
      setPopup({ type: "error", title: "ناکامی", message: error.response?.data?.message || "جوابات جمع کرنے میں مشکل پیش آئی" });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleFeedback = async (feedbackData) => {
    try {
      setFeedbackLoading(true);
      const { data } = await quizAPI.submitFeedback(id, feedbackData);
      if (data.success) {
        setPopup({ type: "success", title: "رائے محفوظ", message: "آپ کی قیمتی رائے محفوظ کر لی گئی ہے" });
      }
    } catch (error) {
      setPopup({ type: "error", title: "ناکامی", message: error.response?.data?.message || "رائے محفوظ کرنے میں مشکل پیش آئی" });
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen cultural-bg flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen cultural-bg flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-urdu-brown">کوئز نہیں ملا</h2>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/quizzes")}>
            واپس جائیں
          </Button>
        </div>
      </div>
    );
  }

  // ===== QUIZ TAKING MODE =====
  if (attemptState === "taking" && questions.length > 0) {
    const q = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;
    const answeredCount = Object.keys(answers).length;
    const minutes = Math.floor((timeLeft || 0) / 60);
    const seconds = (timeLeft || 0) % 60;
    const isLowTime = timeLeft !== null && timeLeft <= 60;

    return (
      <div className="min-h-screen cultural-bg py-8">
        <div className="max-w-3xl mx-auto px-4">
          {/* Timer + Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-urdu-brown">
                سوال {currentQuestion + 1} / {questions.length}
              </span>
              {/* Countdown Timer */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${
                  isLowTime
                    ? "bg-red-100 text-red-700 animate-pulse"
                    : "bg-urdu-cream/50 text-urdu-brown"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {answeredCount} جوابات دیے
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-urdu-gold to-urdu-brown h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Time progress bar */}
            {quiz?.timeLimit && (
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-1000 ${
                    isLowTime ? "bg-red-500" : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.max(0, ((timeLeft || 0) / (quiz.timeLimit * 60)) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Question Card */}
          <Card className="mb-6">
            <h3 className="text-lg font-semibold text-urdu-brown mb-4">
              {q.question}
            </h3>

            <div className="space-y-3">
              {q.options.map((opt, oi) => (
                <label
                  key={oi}
                  className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    answers[q.index] === opt.text
                      ? "border-urdu-gold bg-urdu-cream/30"
                      : "border-gray-200 hover:border-urdu-gold/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name={`q-${q.index}`}
                      checked={answers[q.index] === opt.text}
                      onChange={() => handleSelectAnswer(q.index, opt.text)}
                      className="accent-urdu-brown"
                    />
                    <span className="text-urdu-brown">{opt.text}</span>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="small"
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion((c) => c - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              پچھلا
            </Button>

            {currentQuestion < questions.length - 1 ? (
              <Button
                variant="primary"
                size="small"
                onClick={() => setCurrentQuestion((c) => c + 1)}
              >
                اگلا
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="small"
                onClick={handleSubmitQuiz}
                loading={submitLoading}
                disabled={submitLoading}
              >
                جمع کریں / Submit
              </Button>
            )}
          </div>
        </div>

        {/* Professional Popup */}
        <QuizPopup
          show={!!popup}
          type={popup?.type}
          title={popup?.title}
          message={popup?.message}
          onClose={() => setPopup(null)}
          onConfirm={popup?.onConfirm}
          confirmLabel={popup?.confirmLabel}
        />
      </div>
    );
  }

  // ===== RESULT MODE =====
  // Badge helper
  const getQuizBadge = (pct) => {
    if (pct >= 90) return { label: "گولڈ", tier: "gold", gradient: "from-yellow-300 via-amber-400 to-yellow-500", ring: "ring-yellow-400", text: "text-yellow-900", shadow: "shadow-yellow-300/50", icon: "★" };
    if (pct >= 80) return { label: "سلور", tier: "silver", gradient: "from-gray-200 via-slate-300 to-gray-400", ring: "ring-gray-400", text: "text-gray-800", shadow: "shadow-gray-300/50", icon: "★" };
    if (pct >= 50) return { label: "پاس", tier: "pass", gradient: "from-emerald-200 via-green-300 to-teal-400", ring: "ring-green-400", text: "text-green-900", shadow: "shadow-green-300/50", icon: "✓" };
    return { label: "ناکام", tier: "failed", gradient: "from-red-200 via-red-300 to-red-400", ring: "ring-red-300", text: "text-red-900", shadow: "shadow-red-200/50", icon: "✕" };
  };

  if (attemptState === "result" && result) {
    const timeMins = result.timeSpent ? Math.floor(result.timeSpent / 60) : 0;
    const timeSecs = result.timeSpent ? result.timeSpent % 60 : 0;
    const badge = getQuizBadge(result.percentage);

    return (
      <div className="min-h-screen cultural-bg py-8">
        <div className="max-w-3xl mx-auto px-4">
          <Card>
            {/* Professional Badge */}
            <div className="flex justify-center mb-6">
              <div className={`relative w-28 h-28 rounded-full bg-gradient-to-br ${badge.gradient} ring-4 ${badge.ring} shadow-xl ${badge.shadow} flex items-center justify-center`}>
                <div className="absolute inset-1 rounded-full bg-white/20 backdrop-blur-sm" />
                <div className="relative text-center">
                  <div className={`text-3xl font-black ${badge.text}`}>{result.percentage}%</div>
                  <div className={`text-[10px] font-bold ${badge.text} tracking-wider uppercase`}>{badge.label}</div>
                </div>
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-urdu-brown">
                {badge.tier === "gold" ? "شاندار! اعلیٰ نمبرات" : badge.tier === "silver" ? "بہترین کارکردگی" : badge.tier === "pass" ? "کامیاب! کوئز پاس" : "کوئز مکمل ہو گیا"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {badge.tier === "gold"
                  ? "سب سے اعلیٰ درجے کی کارکردگی — آپ نے سونے کا تمغا حاصل کیا!"
                  : badge.tier === "silver"
                  ? "آپ نے چاندی کا تمغا حاصل کیا — بہت خوب!"
                  : badge.tier === "pass"
                  ? "آپ نے کوئز پاس کر لیا — مزید محنت سے بہتر نتیجہ ممکن ہے!"
                  : "ہمت نہ ہاریں، علم کی راہ میں ہر قدم قابلِ قدر ہے"}
              </p>
            </div>

            {/* Score Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="text-center p-4 bg-urdu-cream/30 rounded-lg">
                <div className="text-2xl font-bold text-urdu-brown">{result.percentage}%</div>
                <div className="text-xs text-gray-500">فیصد</div>
              </div>
              <div className="text-center p-4 bg-urdu-cream/30 rounded-lg">
                <div className="text-2xl font-bold text-urdu-brown">
                  {result.score}/{result.totalPoints}
                </div>
                <div className="text-xs text-gray-500">اسکور</div>
              </div>
              <div className="text-center p-4 bg-urdu-cream/30 rounded-lg">
                <div className="text-2xl font-bold text-urdu-brown">
                  {result.correctCount}/{result.totalQuestions}
                </div>
                <div className="text-xs text-gray-500">صحیح جوابات</div>
              </div>
              <div className="text-center p-4 bg-urdu-cream/30 rounded-lg">
                <div className="text-2xl font-bold text-urdu-brown">
                  {timeMins}:{String(timeSecs).padStart(2, "0")}
                </div>
                <div className="text-xs text-gray-500">وقت صرف ہوا</div>
              </div>
            </div>

            {/* Answer Details */}
            {result.details && (
              <div className="space-y-3 mb-6">
                <h3 className="font-semibold text-urdu-brown">تفصیلات</h3>
                {result.details.map((d, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      d.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-800 mb-1">{d.question}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span>
                        آپ کا جواب:{" "}
                        <span className={d.isCorrect ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                          {d.yourAnswer || "—"}
                        </span>
                      </span>
                      {!d.isCorrect && (
                        <span>
                          صحیح: <span className="text-green-700 font-medium">{d.correctAnswer}</span>
                        </span>
                      )}
                    </div>
                    {d.explanation && (
                      <p className="text-xs text-gray-500 mt-1">{d.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="primary" size="small" onClick={() => navigate("/quizzes")}>
                واپس جائیں
              </Button>
            </div>
          </Card>
        </div>

        {/* Professional Popup */}
        <QuizPopup
          show={!!popup}
          type={popup?.type}
          title={popup?.title}
          message={popup?.message}
          onClose={() => setPopup(null)}
          onConfirm={popup?.onConfirm}
          confirmLabel={popup?.confirmLabel}
        />
      </div>
    );
  }

  // ===== QUIZ INFO MODE =====
  const tabs = [
    { key: "details", label: "تفصیلات", icon: <Star className="w-4 h-4" /> },
    { key: "leaderboard", label: "لیڈربورڈ", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "feedback", label: "رائے", icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen cultural-bg py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate("/quizzes")}
          className="flex items-center text-urdu-brown hover:text-urdu-gold mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          تمام کوئزز
        </button>

        {/* Header */}
        <Card className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-urdu-brown">{quiz.title}</h1>
              <p className="text-urdu-maroon mt-1">{quiz.description}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                quiz.difficulty === "beginner"
                  ? "bg-green-100 text-green-800"
                  : quiz.difficulty === "intermediate"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {quiz.difficulty === "beginner" ? "آسان" : quiz.difficulty === "intermediate" ? "درمیانہ" : "مشکل"}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
            <div className="bg-urdu-cream/30 rounded-lg p-3">
              <HelpCircle className="w-5 h-5 text-urdu-gold mx-auto mb-1" />
              <div className="font-semibold text-urdu-brown">{quiz.totalQuestions || quiz.questions?.length || 0}</div>
              <div className="text-xs text-gray-500">سوالات</div>
            </div>
            <div className="bg-urdu-cream/30 rounded-lg p-3">
              <Clock className="w-5 h-5 text-urdu-gold mx-auto mb-1" />
              <div className="font-semibold text-urdu-brown">{quiz.timeLimit} منٹ</div>
              <div className="text-xs text-gray-500">وقت</div>
            </div>
            <div className="bg-urdu-cream/30 rounded-lg p-3">
              <Award className="w-5 h-5 text-urdu-gold mx-auto mb-1" />
              <div className="font-semibold text-urdu-brown">{quiz.passingScore}%</div>
              <div className="text-xs text-gray-500">پاسنگ</div>
            </div>
            <div className="bg-urdu-cream/30 rounded-lg p-3">
              <BarChart3 className="w-5 h-5 text-urdu-gold mx-auto mb-1" />
              <div className="font-semibold text-urdu-brown">{quiz.stats?.totalAttempts || 0}</div>
              <div className="text-xs text-gray-500">کوششیں</div>
            </div>
          </div>

          {/* Start Button */}
          {user ? (
            quiz.canAttempt ? (
              <div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>
                    وقت کی حد: <strong>{quiz.timeLimit} منٹ</strong> — وقت ختم ہونے پر جوابات خود بخود جمع ہو جائیں گے
                  </span>
                </div>
                <Button variant="primary" onClick={handleStartQuiz} className="w-full">
                  <Brain className="w-4 h-4 mr-2" />
                  کوئز شروع کریں
                </Button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                آپ یہ کوئز پہلے دے چکے ہیں۔ دوبارہ کوشش کی اجازت نہیں ہے
              </div>
            )
          ) : (
            <Link to="/auth">
              <Button variant="primary">کوئز دینے کے لیے لاگ ان کریں</Button>
            </Link>
          )}

          {/* Previous Attempts */}
          {quiz.userAttempts?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-urdu-brown mb-2">آپ کی پچھلی کوششیں</h4>
              <div className="space-y-1">
                {quiz.userAttempts.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <span>کوشش {a.attemptNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        مکمل ✓
                      </span>
                    </div>
                    <span className={a.passed ? "text-green-600 font-medium" : "text-red-500"}>
                      {a.percentage}% — {a.passed ? "پاس ✓" : "فیل ✗"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "bg-urdu-brown text-white"
                  : "bg-white text-urdu-brown hover:bg-urdu-cream/40"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <Card>
          {activeTab === "details" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-urdu-brown mb-2">قسم</h3>
                <span className="text-urdu-maroon">{categoryUrdu[quiz.category] || quiz.category?.replace("_", " ")}</span>
              </div>
              {quiz.stats && (
                <div>
                  <h3 className="font-semibold text-urdu-brown mb-2">اعداد و شمار</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>اوسط اسکور: {Math.round(quiz.stats.averageScore || 0)}%</div>
                    <div>پاس ریٹ: {Math.round(quiz.stats.passRate || 0)}%</div>
                    <div>مکمل ریٹ: {Math.round(quiz.stats.completionRate || 0)}%</div>
                    <div>کل مکمل: {quiz.stats.totalCompletions || 0}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "leaderboard" && (
            <LeaderboardTable
              entries={leaderboard}
              type="quiz"
              title="کوئز لیڈربورڈ"
            />
          )}

          {activeTab === "feedback" && (
            <div>
              {user ? (
                <FeedbackForm onSubmit={handleFeedback} loading={feedbackLoading} />
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-700">
                    رائے دینے کے لیے <Link to="/auth" className="underline font-medium">لاگ ان</Link> کریں
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Professional Popup */}
      <QuizPopup
        show={!!popup}
        type={popup?.type}
        title={popup?.title}
        message={popup?.message}
        onClose={() => setPopup(null)}
        onConfirm={popup?.onConfirm}
        confirmLabel={popup?.confirmLabel}
      />
    </div>
  );
};

// ============= MAIN EXPORT =============
const QuizzesPage = () => {
  const { id } = useParams();

  if (id) {
    return <QuizDetails />;
  }
  return <QuizList />;
};

export default QuizzesPage;
