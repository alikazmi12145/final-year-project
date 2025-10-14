import React, { useState, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  BookOpen,
  Star,
  Gift,
  Flame,
  Users,
  Quote,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";

const MemorialContributions = ({ poet }) => {
  const { user } = useAuth();
  const [contributions, setContributions] = useState([]);
  const [newTribute, setNewTribute] = useState({
    type: "tribute",
    title: "",
    content: "",
    contentUrdu: "",
    isAnonymous: false,
  });
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState({
    totalTributes: 0,
    totalMemories: 0,
    totalVotes: 0,
    contributorCount: 0,
  });

  // Load memorial contributions
  useEffect(() => {
    loadContributions();
  }, [poet._id]);

  const loadContributions = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual API
      const mockContributions = [
        {
          id: 1,
          type: "tribute",
          title: "A Master of Ghazal",
          content: `${poet.name} was truly a master of the ghazal form. Their ability to weave emotion and meaning into such beautiful verses continues to inspire poets today.`,
          contentUrdu: `${poet.name} غزل کے حقیقی استاد تھے۔ ان کی جذبات اور معنی کو خوبصورت اشعار میں پرونے کی صلاحیت آج بھی شاعروں کو متاثر کرتی ہے۔`,
          author: "Ahmad Ali",
          authorUrdu: "احمد علی",
          date: "2024-01-15",
          votes: 24,
          isAnonymous: false,
        },
        {
          id: 2,
          type: "memory",
          title: "Meeting the Great Poet",
          content: `I had the privilege of meeting ${poet.name} in 1950. Their humility and kindness were as remarkable as their poetry.`,
          contentUrdu: `مجھے 1950 میں ${poet.name} سے ملنے کا شرف حاصل ہوا۔ ان کی عاجزی اور مہربانی ان کی شاعری کی طرح ہی قابل ذکر تھی۔`,
          author: "Fatima Khan",
          authorUrdu: "فاطمہ خان",
          date: "2024-01-10",
          votes: 18,
          isAnonymous: false,
        },
        {
          id: 3,
          type: "poem_dedication",
          title: "In Memory of a Legend",
          content: `This poem is dedicated to the eternal memory of ${poet.name}, whose words continue to echo in our hearts.`,
          contentUrdu: `یہ نظم ${poet.name} کی لازوال یاد کے نام ہے، جن کے الفاظ ہمارے دلوں میں آج بھی گونجتے ہیں۔`,
          author: "Anonymous Admirer",
          authorUrdu: "گمنام معتقد",
          date: "2024-01-08",
          votes: 32,
          isAnonymous: true,
        },
      ];

      setContributions(mockContributions);
      setStats({
        totalTributes: mockContributions.filter((c) => c.type === "tribute")
          .length,
        totalMemories: mockContributions.filter((c) => c.type === "memory")
          .length,
        totalVotes: mockContributions.reduce((sum, c) => sum + c.votes, 0),
        contributorCount: new Set(mockContributions.map((c) => c.author)).size,
      });
    } catch (error) {
      console.error("Error loading contributions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTribute.title.trim() || !newTribute.content.trim()) return;

    setIsSubmitting(true);
    try {
      // Simulate API call - replace with actual API
      const contribution = {
        id: Date.now(),
        ...newTribute,
        author: newTribute.isAnonymous ? "Anonymous" : user?.name || "Unknown",
        authorUrdu: newTribute.isAnonymous ? "گمنام" : user?.name || "نامعلوم",
        date: new Date().toISOString().split("T")[0],
        votes: 0,
      };

      setContributions((prev) => [contribution, ...prev]);
      setNewTribute({
        type: "tribute",
        title: "",
        content: "",
        contentUrdu: "",
        isAnonymous: false,
      });

      // Update stats
      setStats((prev) => ({
        ...prev,
        totalTributes:
          prev.totalTributes + (contribution.type === "tribute" ? 1 : 0),
        totalMemories:
          prev.totalMemories + (contribution.type === "memory" ? 1 : 0),
        contributorCount: prev.contributorCount + 1,
      }));
    } catch (error) {
      console.error("Error submitting contribution:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (contributionId) => {
    try {
      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId ? { ...c, votes: c.votes + 1 } : c
        )
      );
      setStats((prev) => ({ ...prev, totalVotes: prev.totalVotes + 1 }));
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const getContributionIcon = (type) => {
    const icons = {
      tribute: Heart,
      memory: MessageCircle,
      poem_dedication: BookOpen,
    };
    return icons[type] || Heart;
  };

  const getContributionColor = (type) => {
    const colors = {
      tribute: "from-red-400 to-pink-500",
      memory: "from-blue-400 to-indigo-500",
      poem_dedication: "from-purple-400 to-violet-500",
    };
    return colors[type] || "from-urdu-gold to-urdu-brown";
  };

  if (!poet.isAlive === false) {
    return null; // Only show for deceased poets
  }

  return (
    <div className="space-y-6">
      {/* Memorial Header */}
      <div className="text-center bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Flame className="w-16 h-16 text-amber-500" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-t from-orange-400 to-yellow-400 rounded-full animate-pulse"></div>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Memorial Contributions
        </h2>
        <h3 className="text-lg text-gray-600 mb-4" dir="rtl">
          یادگاری خراج تحسین
        </h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Honor the memory of {poet.name} by sharing your tributes, memories,
          and dedications.
        </p>
        <p className="text-sm text-gray-500 mt-2" dir="rtl">
          {poet.name} کی یاد کو خراج تحسین، یادیں، اور اعزازات کے ذریعے زندہ
          رکھیں۔
        </p>
      </div>

      {/* Memorial Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center bg-gradient-to-br from-red-50 to-pink-50">
          <Heart className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-red-600">
            {stats.totalTributes}
          </div>
          <div className="text-sm text-gray-600">Tributes</div>
          <div className="text-xs text-gray-500" dir="rtl">
            خراج تحسین
          </div>
        </Card>

        <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-indigo-50">
          <MessageCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalMemories}
          </div>
          <div className="text-sm text-gray-600">Memories</div>
          <div className="text-xs text-gray-500" dir="rtl">
            یادیں
          </div>
        </Card>

        <Card className="p-4 text-center bg-gradient-to-br from-amber-50 to-yellow-50">
          <Star className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-amber-600">
            {stats.totalVotes}
          </div>
          <div className="text-sm text-gray-600">Appreciations</div>
          <div className="text-xs text-gray-500" dir="rtl">
            تعریف
          </div>
        </Card>

        <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50">
          <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600">
            {stats.contributorCount}
          </div>
          <div className="text-sm text-gray-600">Contributors</div>
          <div className="text-xs text-gray-500" dir="rtl">
            شراکت داران
          </div>
        </Card>
      </div>

      {/* Add New Contribution Form */}
      {user && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Gift className="w-5 h-5 mr-2 text-urdu-gold" />
            Share Your Tribute
            <span className="text-sm text-gray-500 mr-2" dir="rtl">
              اپنا خراج تحسین شیئر کریں
            </span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type of Contribution
                </label>
                <select
                  value={newTribute.type}
                  onChange={(e) =>
                    setNewTribute((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent"
                >
                  <option value="tribute">Tribute / خراج تحسین</option>
                  <option value="memory">Personal Memory / ذاتی یاد</option>
                  <option value="poem_dedication">
                    Poem Dedication / نظم کا اعزاز
                  </option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center space-x-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={newTribute.isAnonymous}
                    onChange={(e) =>
                      setNewTribute((prev) => ({
                        ...prev,
                        isAnonymous: e.target.checked,
                      }))
                    }
                    className="text-urdu-gold focus:ring-urdu-gold"
                  />
                  <span>Submit Anonymously / گمنام طور پر جمع کریں</span>
                </label>
              </div>
            </div>

            <div>
              <Input
                placeholder="Title (English) / عنوان (انگریزی)"
                value={newTribute.title}
                onChange={(e) =>
                  setNewTribute((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <textarea
                placeholder="Your contribution in English..."
                value={newTribute.content}
                onChange={(e) =>
                  setNewTribute((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent"
                rows="4"
                required
              />
            </div>

            <div>
              <textarea
                placeholder="آپ کا تبصرہ اردو میں (اختیاری)..."
                value={newTribute.contentUrdu}
                onChange={(e) =>
                  setNewTribute((prev) => ({
                    ...prev,
                    contentUrdu: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent"
                rows="3"
                dir="rtl"
              />
            </div>

            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !newTribute.title.trim() ||
                !newTribute.content.trim()
              }
              className="w-full bg-gradient-to-r from-urdu-gold to-urdu-brown hover:from-urdu-brown hover:to-urdu-maroon"
            >
              {isSubmitting ? <LoadingSpinner size="small" /> : null}
              Submit Tribute / خراج تحسین جمع کریں
            </Button>
          </form>
        </Card>
      )}

      {/* Contributions List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center">
          <Quote className="w-5 h-5 mr-2 text-urdu-brown" />
          Community Tributes
          <span className="text-sm text-gray-500 mr-2" dir="rtl">
            کمیونٹی کے خراج تحسین
          </span>
        </h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <div className="space-y-4">
            {contributions.map((contribution) => {
              const IconComponent = getContributionIcon(contribution.type);
              return (
                <Card
                  key={contribution.id}
                  className="p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`p-2 rounded-lg bg-gradient-to-r ${getContributionColor(
                        contribution.type
                      )}`}
                    >
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-800">
                          {contribution.title}
                        </h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{contribution.date}</span>
                          <button
                            onClick={() => handleVote(contribution.id)}
                            className="flex items-center space-x-1 text-urdu-gold hover:text-urdu-brown transition-colors"
                          >
                            <Heart className="w-4 h-4" />
                            <span>{contribution.votes}</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-2">
                        {contribution.content}
                      </p>

                      {contribution.contentUrdu && (
                        <p className="text-gray-600 text-sm mb-2" dir="rtl">
                          {contribution.contentUrdu}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>
                          by {contribution.author} / {contribution.authorUrdu}
                        </span>
                        <span className="capitalize px-2 py-1 bg-gray-100 rounded text-xs">
                          {contribution.type.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Memorial Quote */}
      <Card className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 text-center">
        <Quote className="w-8 h-8 text-urdu-brown mx-auto mb-4" />
        <div className="text-lg text-urdu-brown italic mb-2">
          "Great poets never die; they live on in the hearts and minds of those
          who cherish their words."
        </div>
        <div className="text-urdu-maroon text-sm" dir="rtl">
          "عظیم شاعر کبھی نہیں مرتے؛ وہ ان لوگوں کے دلوں اور ذہنوں میں زندہ رہتے
          ہیں جو ان کے کلام کو عزیز رکھتے ہیں۔"
        </div>
      </Card>
    </div>
  );
};

export default MemorialContributions;
