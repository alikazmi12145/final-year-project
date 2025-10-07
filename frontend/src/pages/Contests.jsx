import React from "react";
import { useParams, Link } from "react-router-dom";
import {
  Trophy,
  Calendar,
  Users,
  Award,
  Clock,
  Star,
  BookOpen,
  Feather,
} from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

const Contests = () => {
  const { id } = useParams();

  // Enhanced contests data with Urdu cultural content
  const contests = [
    {
      id: 1,
      title: "بہاری غزل کا مقابلہ",
      englishTitle: "Spring Ghazal Competition",
      description:
        "بہار کے موسم کے لیے اپنی بہترین غزلیں جمع کرائیں۔ موضوع: تجدید اور امید",
      englishDescription:
        "Submit your best ghazals for the spring season. Theme: Renewal and Hope",
      status: "active",
      startDate: "2024-03-01",
      endDate: "2024-03-31",
      participants: 45,
      prize: "₹10,000",
      rules: [
        "صرف اصل کام Original work only",
        "زیادہ سے زیادہ 10 شعر Maximum 10 verses",
        "موضوع کا اتباع ضروری Theme must be followed",
      ],
    },
    {
      id: 2,
      title: "اردو نظم نگاری کا مقابلہ",
      englishTitle: "Urdu Nazm Writing Contest",
      description: '"امید اور لچک" کے موضوع پر اصل نظمیں تخلیق کریں',
      englishDescription:
        'Create original nazms on the theme of "Hope and Resilience"',
      status: "upcoming",
      startDate: "2024-04-01",
      endDate: "2024-04-30",
      participants: 23,
      prize: "₹15,000",
      rules: [
        "اصل تخلیق Original composition",
        "کم سے کم 15 مصرعے Minimum 15 lines",
        "موضوع کی پیروی ضروری Theme adherence required",
      ],
    },
  ];

  const contest = id ? contests.find((c) => c.id === parseInt(id)) : null;

  if (id && contest) {
    return (
      <div className="min-h-screen cultural-bg py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Contest Details */}
          <div className="card p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-urdu-brown">
                {contest.title}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  contest.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {contest.status === "active" ? "Active" : "Upcoming"}
              </span>
            </div>

            <p className="text-lg text-urdu-maroon mb-6">
              {contest.description}
            </p>

            {/* Contest Info */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-urdu-gold" />
                <div>
                  <div className="text-sm text-urdu-maroon">Dates</div>
                  <div className="text-urdu-brown">
                    {new Date(contest.startDate).toLocaleDateString()} -{" "}
                    {new Date(contest.endDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-urdu-gold" />
                <div>
                  <div className="text-sm text-urdu-maroon">Participants</div>
                  <div className="text-urdu-brown">{contest.participants}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Award className="w-5 h-5 text-urdu-gold" />
                <div>
                  <div className="text-sm text-urdu-maroon">Prize</div>
                  <div className="text-urdu-brown">{contest.prize}</div>
                </div>
              </div>
            </div>

            {/* Rules */}
            <div className="mb-6">
              <h3 className="font-semibold text-urdu-brown mb-3">
                Contest Rules
              </h3>
              <ul className="space-y-2">
                {contest.rules.map((rule, index) => (
                  <li
                    key={index}
                    className="flex items-center space-x-2 text-urdu-maroon"
                  >
                    <Star className="w-4 h-4 text-urdu-gold fill-current" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <button className="btn-primary">Submit Entry</button>
              <button className="btn-secondary">View Participants</button>
              <button className="btn-secondary">Share Contest</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cultural-bg py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Poetry Contests
          </h1>
          <p className="text-lg text-urdu-brown">
            Participate in exciting poetry competitions and showcase your talent
          </p>
        </div>

        {/* Contests Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {contests.map((contest) => (
            <Link
              key={contest.id}
              to={`/contests/${contest.id}`}
              className="card p-6 hover:shadow-xl transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-urdu-brown group-hover:text-urdu-maroon">
                  {contest.title}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    contest.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {contest.status === "active" ? "Active" : "Upcoming"}
                </span>
              </div>

              <p className="text-urdu-maroon mb-4 line-clamp-2">
                {contest.description}
              </p>

              <div className="flex items-center justify-between text-sm text-urdu-brown mb-4">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Ends {new Date(contest.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{contest.participants} participants</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 text-urdu-gold">
                  <Award className="w-4 h-4" />
                  <span className="font-semibold">{contest.prize}</span>
                </div>
                <Clock className="w-4 h-4 text-urdu-maroon" />
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {contests.length === 0 && (
          <div className="card p-8 text-center">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-urdu-brown mb-2">
              No Contests Available
            </h3>
            <p className="text-urdu-maroon">
              Check back later for new poetry competitions
            </p>
          </div>
        )}

        {/* Contest Tips */}
        <div className="card p-6 mt-8">
          <h3 className="font-semibold text-urdu-brown mb-3">Contest Tips</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-urdu-maroon">
            <ul className="space-y-2">
              <li>• Read the theme carefully before writing</li>
              <li>• Follow all contest rules and guidelines</li>
              <li>• Submit your entry before the deadline</li>
            </ul>
            <ul className="space-y-2">
              <li>• Proofread your work before submission</li>
              <li>• Be original and creative</li>
              <li>• Engage with other participants' work</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contests;
