import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import {
  User,
  Users,
  BookOpen,
  Heart,
  Star,
  MapPin,
  Calendar,
  Search,
} from "lucide-react";

const Poets = () => {
  const { id } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [poets, setPoets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    era: "all",
    isAlive: "all",
    sortBy: "name",
    sortOrder: "asc",
  });

  // Fetch poets from API
  useEffect(() => {
    fetchPoets();
  }, [filters, searchTerm]);

  const fetchPoets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Dynamic import to avoid circular dependencies
      const { poetAPI } = await import("../services/api.jsx");

      const params = {
        ...filters,
        search: searchTerm || undefined,
        era: filters.era === "all" ? undefined : filters.era,
        isAlive: filters.isAlive === "all" ? undefined : filters.isAlive,
      };

      const response = await poetAPI.getAllPoets(params);

      if (response?.data?.success) {
        // Ensure poets is always an array
        const poetsData = response.data.poets || response.data.data || [];
        setPoets(Array.isArray(poetsData) ? poetsData : []);
      } else {
        console.error("Failed to fetch poets:", response?.data?.message);
        setPoets([]);
        setError(response?.data?.message || "Failed to fetch poets");
      }
    } catch (error) {
      console.error("Error fetching poets:", error);
      setPoets([]);

      // Set user-friendly error messages
      if (error.response?.status === 404) {
        setError("No poets found");
      } else if (error.response?.status >= 500) {
        setError("Server error - please try again later");
      } else if (error.code === "NETWORK_ERROR") {
        setError("Network error - please check your connection");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const poet = id ? poets.find((p) => p._id === id) : null;

  if (id && poet) {
    return (
      <div className="min-h-screen cultural-bg py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Poet Profile Header */}
          <div className="card p-8 mb-6">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-6">
              <div className="w-32 h-32 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center">
                {poet.profilePicture ? (
                  <img
                    src={poet.profilePicture}
                    alt={poet.name}
                    className="w-32 h-32 rounded-full object-cover"
                  />
                ) : (
                  <User className="text-white w-16 h-16" />
                )}
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
                  <h1 className="text-3xl font-bold text-urdu-brown">
                    {poet.name}
                  </h1>
                  {poet.isVerified && (
                    <Star className="w-5 h-5 text-urdu-gold fill-current" />
                  )}
                </div>

                <p className="text-urdu-maroon mb-4">
                  {poet.bio || "کوئی تعارف دستیاب نہیں"}
                </p>

                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-urdu-brown">
                  {poet.birthPlace && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{poet.birthPlace}</span>
                    </div>
                  )}
                  {poet.era && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {poet.era === "contemporary" ? "معاصر" : poet.era}
                      </span>
                    </div>
                  )}
                  {poet.dateOfBirth && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(poet.dateOfBirth).getFullYear()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-urdu-cream">
              {[
                {
                  icon: BookOpen,
                  label: "نظمیں",
                  value: poet.stats?.poemCount || 0,
                },
                {
                  icon: Users,
                  label: "پیروکار",
                  value: poet.stats?.followers || 0,
                },
                {
                  icon: Heart,
                  label: "پسندیدگی",
                  value: poet.stats?.totalLikes || 0,
                },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <stat.icon className="w-6 h-6 text-urdu-gold mx-auto mb-1" />
                  <div className="text-2xl font-bold text-urdu-brown">
                    {stat.value}
                  </div>
                  <div className="text-sm text-urdu-maroon">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          {poet.achievements && poet.achievements.length > 0 && (
            <div className="card p-6 mb-6">
              <h2 className="text-xl font-bold text-urdu-brown mb-4">
                Achievements
              </h2>
              <div className="flex flex-wrap gap-2">
                {poet.achievements.map((achievement, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-urdu-gold/10 text-urdu-brown rounded-full text-sm"
                  >
                    {achievement}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Poet's Poems Placeholder */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-urdu-brown mb-4">
              Poems by {poet.name}
            </h2>
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-urdu-maroon">Poems will be displayed here</p>
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
          <h1 className="text-4xl font-bold gradient-text mb-4">Our Poets</h1>
          <p className="text-lg text-urdu-brown">
            Discover talented poets from the Urdu poetry community
          </p>
        </div>

        {/* Search Bar */}
        <div className="card p-4 mb-6">
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search poets by name or location..."
              className="input-field pl-10"
            />
          </div>
        </div>

        {/* Poets Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="card p-8 text-center">
            <Users className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-600 mb-2">
              Error Loading Poets
            </h3>
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchPoets}
              className="px-4 py-2 bg-urdu-gold text-white rounded-lg hover:bg-urdu-brown transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {poets && poets.length > 0 ? (
              poets.map((poet) => (
                <Link
                  key={poet._id}
                  to={`/poets/${poet._id}`}
                  className="card p-6 hover:shadow-xl transition-all duration-300 group"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center">
                      {poet.avatar ? (
                        <img
                          src={poet.avatar}
                          alt={poet.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="text-white w-8 h-8" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1">
                        <h3 className="font-semibold text-urdu-brown group-hover:text-urdu-maroon">
                          {poet.name}
                        </h3>
                        {poet.isVerified && (
                          <Star className="w-4 h-4 text-urdu-gold fill-current" />
                        )}
                      </div>
                      <p className="text-sm text-urdu-maroon">
                        @{poet.username}
                      </p>
                      {poet.location && (
                        <p className="text-xs text-urdu-maroon opacity-75">
                          {poet.location}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-urdu-maroon mb-4 line-clamp-2">
                    {poet.bio || "A passionate poet sharing beautiful verses"}
                  </p>

                  <div className="flex items-center justify-between text-sm text-urdu-brown">
                    <div className="flex items-center space-x-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{poet.stats?.poemCount || 0} poems</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4" />
                      <span>{poet.stats?.totalLikes || 0} likes</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full">
                <div className="card p-8 text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-urdu-brown mb-2">
                    No Poets Found
                  </h3>
                  <p className="text-urdu-maroon">
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "No poets available at the moment"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Poets;
