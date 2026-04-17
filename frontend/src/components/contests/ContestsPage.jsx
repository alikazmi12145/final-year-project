import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Trophy, Calendar, Users, Award, Clock, Star, Search,
  ChevronLeft, Filter, Feather, ThumbsUp, MessageSquare,
  BarChart3, PlusCircle,
} from "lucide-react";
import { contestAPI } from "../../services/api";
import { poetryAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import SubmitPoetryForm from "./SubmitPoetryForm";
import VotingSection from "./VotingSection";
import LeaderboardTable from "./LeaderboardTable";
import FeedbackForm from "./FeedbackForm";
import CreateContestForm from "./CreateContestForm";
import toast from "react-hot-toast";

// ============= CONTEST LIST =============
const ContestList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    status: "all",
    category: "all",
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const fetchContests = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 12 };
      if (filters.status !== "all") params.status = filters.status;
      if (filters.category !== "all") params.category = filters.category;
      if (filters.search) params.search = filters.search;
      params.sortBy = filters.sortBy;
      params.sortOrder = filters.sortOrder;

      const { data } = await contestAPI.getAllContests(params);
      if (data.success) {
        setContests(data.contests || []);
        setPagination(data.pagination || {});
      }
    } catch (error) {
      console.error("Error fetching contests:", error);
      toast.error("مقابلے لوڈ نہیں ہو سکے");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  const handleCreateContest = async (formData) => {
    try {
      setCreateLoading(true);
      const { data } = await contestAPI.createContest(formData);
      if (data.success) {
        toast.success("مقابلہ کامیابی سے بنایا گیا!");
        setShowCreateForm(false);
        fetchContests();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "مقابلہ بنانے میں خرابی");
    } finally {
      setCreateLoading(false);
    }
  };

  const getStatusBadge = (contest) => {
    const status = contest.status || "upcoming";
    const map = {
      active: { label: "جاری / Active", cls: "bg-green-100 text-green-800" },
      upcoming: { label: "آنے والا / Upcoming", cls: "bg-blue-100 text-blue-800" },
      voting: { label: "ووٹنگ / Voting", cls: "bg-purple-100 text-purple-800" },
      completed: { label: "مکمل / Completed", cls: "bg-gray-100 text-gray-700" },
      registration_open: { label: "رجسٹریشن کھلی / Open", cls: "bg-emerald-100 text-emerald-800" },
      submission_open: { label: "جمع کھلی / Submissions Open", cls: "bg-teal-100 text-teal-800" },
    };
    const info = map[status] || map.upcoming;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${info.cls}`}>
        {info.label}
      </span>
    );
  };

  const canCreate = user && (user.role === "admin" || user.role === "moderator" || user.role === "poet");

  return (
    <div className="min-h-screen cultural-bg py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">مقابلے / Poetry Contests</h1>
          <p className="text-lg text-urdu-brown">
            شاعری کے مقابلوں میں حصہ لیں اور اپنا ہنر دکھائیں
          </p>
        </div>

        {/* Create Button */}
        {canCreate && (
          <div className="mb-6 text-right">
            <Button
              variant="primary"
              size="small"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <PlusCircle className="w-4 h-4 mr-1" />
              {showCreateForm ? "بند کریں" : "نیا مقابلہ / New Contest"}
            </Button>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <Card className="mb-8">
            <CreateContestForm onSubmit={handleCreateContest} loading={createLoading} />
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
              placeholder="تلاش کریں..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-urdu-gold focus:outline-none text-sm"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => {
              setFilters((f) => ({ ...f, status: e.target.value }));
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-urdu-gold focus:outline-none"
          >
            <option value="all">تمام حالت</option>
            <option value="active">جاری</option>
            <option value="upcoming">آنے والے</option>
            <option value="completed">مکمل</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => {
              setFilters((f) => ({ ...f, category: e.target.value }));
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-urdu-gold focus:outline-none"
          >
            <option value="all">تمام قسم</option>
            <option value="ghazal">غزل</option>
            <option value="nazm">نظم</option>
            <option value="rubai">رباعی</option>
            <option value="free-verse">آزاد نظم</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => {
              setFilters((f) => ({ ...f, sortBy: e.target.value }));
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-urdu-gold focus:outline-none"
          >
            <option value="createdAt">تاریخ</option>
            <option value="participantsCount">شرکاء</option>
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        )}

        {/* Contests Grid */}
        {!loading && contests.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contests.map((contest) => (
              <Link
                key={contest._id}
                to={`/contests/${contest._id}`}
                className="card p-6 hover:shadow-xl transition-all duration-300 group block"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-urdu-brown group-hover:text-urdu-maroon truncate flex-1 mr-2">
                    {contest.title}
                  </h3>
                  {getStatusBadge(contest)}
                </div>

                {contest.theme && (
                  <p className="text-urdu-gold text-sm mb-1">
                    <Feather className="inline w-3 h-3 mr-1" />
                    {contest.theme}
                  </p>
                )}

                <p className="text-urdu-maroon mb-4 text-sm line-clamp-2">
                  {contest.description}
                </p>

                <div className="flex items-center justify-between text-xs text-urdu-brown mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {contest.submissionDeadline
                        ? new Date(contest.submissionDeadline).toLocaleDateString()
                        : contest.submissionEnd
                        ? new Date(contest.submissionEnd).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      {contest.participantsCount || contest.participants?.length || 0} شرکاء
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-urdu-gold font-medium capitalize">
                    {contest.category}
                  </span>
                  {contest.submissionCount != null && (
                    <span className="text-gray-500">
                      {contest.submissionCount} جمع شدہ
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && contests.length === 0 && (
          <div className="card p-8 text-center">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-urdu-brown mb-2">
              کوئی مقابلہ نہیں / No Contests Found
            </h3>
            <p className="text-urdu-maroon">نئے مقابلوں کے لیے بعد میں آئیں</p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="small"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              پچھلا
            </Button>
            <span className="px-4 py-2 text-sm text-urdu-brown">
              {pagination.page || page} / {pagination.totalPages || pagination.pages}
            </span>
            <Button
              variant="outline"
              size="small"
              disabled={page >= (pagination.totalPages || pagination.pages)}
              onClick={() => setPage((p) => p + 1)}
            >
              اگلا
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============= CONTEST DETAILS =============
const ContestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [userPoems, setUserPoems] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    fetchContest();
    if (user) fetchUserPoems();
  }, [id]);

  const fetchContest = async () => {
    try {
      setLoading(true);
      const { data } = await contestAPI.getContestById(id);
      if (data.success) {
        setContest(data.contest);
      }
    } catch (error) {
      console.error("Error fetching contest:", error);
      toast.error("مقابلہ لوڈ نہیں ہو سکا");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPoems = async () => {
    try {
      const { data } = await poetryAPI.getMyPoems({ limit: 100 });
      if (data.success) {
        setUserPoems(data.poems || []);
      }
    } catch {
      // Silently fail — user may not have poems
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data } = await contestAPI.getContestLeaderboard(id);
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "leaderboard") {
      fetchLeaderboard();
    }
  }, [activeTab]);

  const handleSubmitPoetry = async ({ poemId, title, content, isNew }) => {
    try {
      setSubmitLoading(true);
      const payload = isNew ? { title, content, isNew: true } : { poemId };
      const { data } = await contestAPI.participateInContest(id, payload);
      if (data.success) {
        toast.success(data.message || "شاعری کامیابی سے جمع ہو گئی!");
        fetchContest();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "جمع کرنے میں خرابی");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleVote = async (participantId, rating) => {
    try {
      setVoteLoading(true);
      const { data } = await contestAPI.voteForSubmission(id, participantId, rating);
      if (data.success) {
        toast.success("ووٹ کامیابی سے دیا گیا!");
        fetchContest();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "ووٹ دینے میں خرابی");
    } finally {
      setVoteLoading(false);
    }
  };

  const handleFeedback = async (feedbackData) => {
    try {
      setFeedbackLoading(true);
      const { data } = await contestAPI.submitFeedback(id, feedbackData);
      if (data.success) {
        toast.success("آپ کی رائے جمع ہو گئی!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "رائے جمع کرنے میں خرابی");
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

  if (!contest) {
    return (
      <div className="min-h-screen cultural-bg flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-urdu-brown">مقابلہ نہیں ملا</h2>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/contests")}>
            واپس جائیں
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "details", label: "تفصیلات", icon: <Star className="w-4 h-4" /> },
    { key: "submissions", label: "جمع شدہ", icon: <Feather className="w-4 h-4" /> },
    { key: "vote", label: "ووٹنگ", icon: <ThumbsUp className="w-4 h-4" /> },
    { key: "leaderboard", label: "لیڈربورڈ", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "feedback", label: "رائے", icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen cultural-bg py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <button
          onClick={() => navigate("/contests")}
          className="flex items-center text-urdu-brown hover:text-urdu-gold mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          تمام مقابلے
        </button>

        {/* Header Card */}
        <Card className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-urdu-brown">{contest.title}</h1>
              {contest.theme && (
                <p className="text-urdu-gold mt-1">
                  <Feather className="inline w-4 h-4 mr-1" />
                  {contest.theme}
                </p>
              )}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                contest.status === "active" || contest.status === "submission_open"
                  ? "bg-green-100 text-green-800"
                  : contest.status === "voting"
                  ? "bg-purple-100 text-purple-800"
                  : contest.status === "completed"
                  ? "bg-gray-100 text-gray-700"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {contest.status}
            </span>
          </div>

          <p className="text-urdu-maroon mb-6">{contest.description}</p>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-urdu-cream/30 rounded-lg p-3">
              <Users className="w-5 h-5 text-urdu-gold mx-auto mb-1" />
              <div className="font-semibold text-urdu-brown">
                {contest.participants?.length || contest.participantsCount || 0}
              </div>
              <div className="text-xs text-gray-500">شرکاء</div>
            </div>
            <div className="bg-urdu-cream/30 rounded-lg p-3">
              <Feather className="w-5 h-5 text-urdu-gold mx-auto mb-1" />
              <div className="font-semibold text-urdu-brown">
                {contest.submissionCount || contest.submissions?.length || 0}
              </div>
              <div className="text-xs text-gray-500">جمع شدہ</div>
            </div>
            <div className="bg-urdu-cream/30 rounded-lg p-3">
              <Calendar className="w-5 h-5 text-urdu-gold mx-auto mb-1" />
              <div className="font-semibold text-urdu-brown text-sm">
                {contest.submissionDeadline
                  ? new Date(contest.submissionDeadline).toLocaleDateString()
                  : contest.submissionEnd
                  ? new Date(contest.submissionEnd).toLocaleDateString()
                  : "—"}
              </div>
              <div className="text-xs text-gray-500">آخری تاریخ</div>
            </div>
            <div className="bg-urdu-cream/30 rounded-lg p-3">
              <Award className="w-5 h-5 text-urdu-gold mx-auto mb-1" />
              <div className="font-semibold text-urdu-brown capitalize">
                {contest.category || "—"}
              </div>
              <div className="text-xs text-gray-500">قسم</div>
            </div>
          </div>
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

        {/* Tab Content */}
        <Card>
          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="space-y-6">
              {/* Rules */}
              {contest.rules?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-urdu-brown mb-3">قواعد / Rules</h3>
                  <ul className="space-y-2">
                    {contest.rules.map((rule, i) => (
                      <li key={i} className="flex items-start gap-2 text-urdu-maroon text-sm">
                        <Star className="w-4 h-4 text-urdu-gold mt-0.5 flex-shrink-0" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prizes */}
              {contest.prizes?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-urdu-brown mb-3">انعامات / Prizes</h3>
                  <div className="grid gap-2">
                    {contest.prizes.map((prize, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-urdu-cream/20 rounded-lg"
                      >
                        <Award className="w-5 h-5 text-urdu-gold" />
                        <div>
                          <span className="font-medium text-urdu-brown">
                            {prize.position || prize.title}
                          </span>
                          {prize.prize && (
                            <span className="text-urdu-gold ml-2">{prize.prize}</span>
                          )}
                          {prize.description && (
                            <p className="text-xs text-gray-500">{prize.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Organizer */}
              {contest.organizer && (
                <div>
                  <h3 className="font-semibold text-urdu-brown mb-2">منتظم / Organizer</h3>
                  <p className="text-urdu-maroon text-sm">
                    {contest.organizer.name || contest.organizer.username || "—"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Submissions Tab */}
          {activeTab === "submissions" && (
            <div className="space-y-6">
              {/* User submission form */}
              {user && !contest.userHasParticipated && contest.canSubmit !== false && (
                <SubmitPoetryForm
                  contestId={id}
                  userPoems={userPoems}
                  onSubmit={handleSubmitPoetry}
                  loading={submitLoading}
                />
              )}

              {contest.userHasParticipated && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-700 font-medium">
                    ✅ آپ نے اس مقابلے میں شاعری جمع کر دی ہے
                  </p>
                </div>
              )}

              {!user && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-700">
                    جمع کرانے کے لیے <Link to="/auth" className="underline font-medium">لاگ ان</Link> کریں
                  </p>
                </div>
              )}

              {/* Submissions list (visible for completed/voting contests) */}
              {contest.participants?.filter((p) => p.submission).length > 0 && (
                <div>
                  <h3 className="font-semibold text-urdu-brown mb-3">جمع شدہ شاعری</h3>
                  <div className="space-y-3">
                    {contest.participants
                      .filter((p) => p.submission)
                      .map((p) => (
                        <div key={p._id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-urdu-brown">
                              {p.user?.name || "نامعلوم"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {p.rating ? `${p.rating.toFixed(1)} ★` : ""}
                              {p.votes?.length ? ` (${p.votes.length} votes)` : ""}
                            </span>
                          </div>
                          {p.submission?.title && (
                            <p className="text-urdu-maroon text-sm font-medium">{p.submission.title}</p>
                          )}
                          {p.submission?.content && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-3 font-urdu">
                              {p.submission.content}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Voting Tab */}
          {activeTab === "vote" && (
            <div>
              {user ? (
                <VotingSection
                  submissions={contest.participants?.filter((p) => p.submission) || []}
                  onVote={handleVote}
                  userHasVoted={false}
                  loading={voteLoading}
                />
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-700">
                    ووٹ دینے کے لیے <Link to="/auth" className="underline font-medium">لاگ ان</Link> کریں
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === "leaderboard" && (
            <LeaderboardTable
              entries={leaderboard}
              type="contest"
              title="مقابلے کا لیڈربورڈ / Contest Leaderboard"
            />
          )}

          {/* Feedback Tab */}
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
    </div>
  );
};

// ============= MAIN EXPORT =============
const ContestsPage = () => {
  const { id } = useParams();

  if (id) {
    return <ContestDetails />;
  }
  return <ContestList />;
};

export default ContestsPage;
