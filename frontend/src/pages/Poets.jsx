import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import PoetTimeline from "../components/poetry/PoetTimeline";
import MemorialContributions from "../components/poetry/MemorialContributions";
import EnhancedPoetSearch from "../components/poetry/EnhancedPoetSearch";
import {
  User,
  Users,
  BookOpen,
  Heart,
  Star,
  MapPin,
  Calendar,
  Search,
  Award,
  Clock,
  Globe,
} from "lucide-react";

const Poets = () => {
  const { id } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [poets, setPoets] = useState([]);
  const [selectedPoet, setSelectedPoet] = useState(null);
  const [poetPoems, setPoetPoems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPoems, setLoadingPoems] = useState(false);
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

  // Fetch specific poet and their poems when id changes
  useEffect(() => {
    if (id) {
      fetchPoetDetail(id);
    }
  }, [id]);

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

      // Fetch poets from MongoDB
      const response = await poetAPI.getAllPoets(params);
      let allPoets = [];

      if (response?.data?.success) {
        allPoets = response.data.poets || response.data.data || [];
      }

      console.log("Fetched poets with images:");
      allPoets.forEach(p => {
        console.log(`${p.name}:`, {
          profileImage: p.profileImage,
          'profileImage.url': p.profileImage?.url,
          avatar: p.avatar,
          image: p.image,
          profilePicture: p.profilePicture
        });
      });

      setPoets(Array.isArray(allPoets) ? allPoets : []);

      if (allPoets.length === 0) {
        setError("No poets found");
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

  const fetchPoetDetail = async (poetId) => {
    try {
      setLoading(true);
      setLoadingPoems(true);
      setError(null);

      const { poetAPI } = await import("../services/api.jsx");
      
      const response = await poetAPI.getPoetById(poetId);
      
      if (response?.data?.success) {
        // Merge the stats from API response into the poet object
        const poetWithStats = {
          ...response.data.poet,
          stats: {
            poemCount: response.data.stats?.totalPoems || 0,
            totalLikes: response.data.stats?.totalLikes || 0,
            totalViews: response.data.stats?.totalViews || 0,
            totalComments: response.data.stats?.totalComments || 0,
            averageRating: response.data.stats?.averageRating || 0,
            followers: response.data.poet?.stats?.followers || 0,
          }
        };
        console.log("Fetched poet detail:", {
          name: poetWithStats.name,
          bio: poetWithStats.bio,
          profileImage: poetWithStats.profileImage
        });
        setSelectedPoet(poetWithStats);
        setPoetPoems(response.data.poems || []);
      } else {
        setError("Poet not found");
      }
    } catch (error) {
      console.error("Error fetching poet detail:", error);
      setError("Failed to load poet details");
    } finally {
      setLoading(false);
      setLoadingPoems(false);
    }
  };

  const [searchResults, setSearchResults] = useState([]);
  const [selectedTab, setSelectedTab] = useState("biography");

  const poet = id ? (selectedPoet || poets.find((p) => p._id === id)) : null;

  if (id && poet) {
    console.log("Poet detail page - poet data:", {
      name: poet.name,
      bio: poet.bio,
      profileImage: poet.profileImage,
      avatar: poet.avatar,
      profilePicture: poet.profilePicture
    });

    return (
      <div className="min-h-screen cultural-bg pt-20 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Enhanced Poet Profile Header with Cultural Design */}
          <div className="bg-gradient-to-br from-urdu-cream via-white to-cultural-pearl p-8 mb-6 rounded-2xl shadow-cultural border border-urdu-gold/20 overflow-hidden relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-10 right-10 w-32 h-32 bg-urdu-gold rounded-full"></div>
              <div className="absolute bottom-10 left-10 w-24 h-24 bg-cultural-amber rounded-full"></div>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              <div className="w-40 h-40 bg-gradient-to-r from-urdu-gold via-cultural-amber to-urdu-brown rounded-full flex items-center justify-center overflow-hidden shadow-cultural ring-4 ring-urdu-gold/20">
                {(poet.profileImage?.url || poet.avatar || poet.profilePicture) ? (
                  <img
                    src={
                      (poet.profileImage?.url || poet.avatar || poet.profilePicture).startsWith('http')
                        ? (poet.profileImage?.url || poet.avatar || poet.profilePicture)
                        : `http://localhost:5001${poet.profileImage?.url || poet.avatar || poet.profilePicture}`
                    }
                    alt={poet.name}
                    className="w-40 h-40 rounded-full object-cover filter grayscale hover:filter-none transition-all duration-500"
                  />
                ) : (
                  <User className="text-white w-20 h-20" />
                )}
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start space-x-3 mb-3">
                  <h1 className="text-4xl font-bold text-urdu-brown font-urdu urdu-heading-lg">
                    {poet.name}
                  </h1>
                  {poet.isVerified && (
                    <div className="bg-gradient-to-r from-urdu-gold to-cultural-amber p-2 rounded-full shadow-md">
                      <Star className="w-6 h-6 text-white fill-current" />
                    </div>
                  )}
                </div>

                {/* Enhanced Bio Section */}
                <div className="bg-gradient-to-r from-urdu-light/50 to-cultural-pearl/50 p-4 rounded-xl mb-4 border border-urdu-gold/10">
                  <p className="text-urdu-maroon mb-2 font-urdu urdu-body text-lg leading-relaxed">
                    {poet.bio || "کوئی تعارف دستیاب نہیں"}
                  </p>
                  
                  {/* Birth and Death Dates */}
                  {(poet.dateOfBirth || poet.dateOfDeath) && (
                    <div className="mt-3 pt-3 border-t border-urdu-gold/20">
                      <div className="flex items-center justify-center gap-4 text-sm">
                        {poet.dateOfBirth && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-urdu-gold" />
                            <span className="text-urdu-brown font-urdu">
                              پیدائش: {new Date(poet.dateOfBirth).toLocaleDateString('ur-PK', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          </div>
                        )}
                        {poet.dateOfDeath && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-cultural-burgundy" />
                            <span className="text-urdu-brown font-urdu">
                              وفات: {new Date(poet.dateOfDeath).toLocaleDateString('ur-PK', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
                  {poet.birthPlace && (
                    <div className="flex items-center space-x-2 bg-urdu-gold/10 px-3 py-2 rounded-full">
                      <MapPin className="w-4 h-4 text-urdu-gold" />
                      <span className="text-urdu-brown font-urdu urdu-caption">
                        {typeof poet.birthPlace === 'object' 
                          ? `${poet.birthPlace.city}, ${poet.birthPlace.region}` 
                          : poet.birthPlace}
                      </span>
                    </div>
                  )}
                  {poet.era && (
                    <div className="flex items-center space-x-2 bg-cultural-amber/10 px-3 py-2 rounded-full">
                      <Calendar className="w-4 h-4 text-cultural-amber" />
                      <span className="text-urdu-brown font-urdu urdu-caption">
                        {poet.era === "contemporary" ? "معاصر" : poet.era}
                      </span>
                    </div>
                  )}
                  {poet.dateOfBirth && (
                    <div className="flex items-center space-x-2 bg-cultural-burgundy/10 px-3 py-2 rounded-full">
                      <Calendar className="w-4 h-4 text-cultural-burgundy" />
                      <span className="text-urdu-brown font-urdu urdu-caption">
                        {new Date(poet.dateOfBirth).getFullYear()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Stats Section */}
            <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t border-urdu-gold/30">
              {[
                {
                  icon: BookOpen,
                  label: "نظمیں",
                  labelEn: "Poems",
                  value: poet.stats?.poemCount || 0,
                  colorClasses: "text-urdu-gold",
                  bgClasses: "bg-urdu-gold/10 border-urdu-gold/20",
                },
                {
                  icon: Users,
                  label: "پیروکار",
                  labelEn: "Followers",
                  value: poet.stats?.followers || 0,
                  colorClasses: "text-cultural-amber",
                  bgClasses: "bg-cultural-amber/10 border-cultural-amber/20",
                },
                {
                  icon: Heart,
                  label: "پسندیدگی",
                  labelEn: "Likes",
                  value: poet.stats?.totalLikes || 0,
                  colorClasses: "text-cultural-burgundy",
                  bgClasses:
                    "bg-cultural-burgundy/10 border-cultural-burgundy/20",
                },
              ].map((stat, index) => (
                <div
                  key={index}
                  className={`text-center p-4 rounded-xl ${stat.bgClasses} hover:shadow-md transition-all`}
                >
                  <stat.icon
                    className={`w-8 h-8 ${stat.colorClasses} mx-auto mb-2`}
                  />
                  <div className="text-3xl font-bold text-urdu-brown font-urdu">
                    {stat.value}
                  </div>
                  <div
                    className={`text-sm ${stat.colorClasses} font-urdu urdu-caption`}
                  >
                    {stat.label}
                  </div>
                  <div className="text-xs text-urdu-maroon/70">
                    {stat.labelEn}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Achievements Section */}
          {poet.achievements && poet.achievements.length > 0 && (
            <div className="bg-gradient-to-br from-cultural-pearl via-urdu-cream to-urdu-light p-6 mb-6 rounded-2xl shadow-cultural border border-cultural-amber/20">
              <div className="flex items-center mb-4">
                <Award className="w-6 h-6 text-urdu-gold mr-3" />
                <h2 className="text-2xl font-bold text-urdu-brown font-urdu urdu-heading-md">
                  اعزازات / Achievements
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {poet.achievements.map((achievement, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-gradient-to-r from-urdu-gold/20 to-cultural-amber/20 text-urdu-brown rounded-full text-sm font-urdu urdu-body border border-urdu-gold/30 hover:shadow-md transition-all"
                  >
                    {achievement}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Poems Section */}
          <div className="bg-gradient-to-br from-urdu-cream via-cultural-pearl to-white p-8 rounded-2xl shadow-cultural border border-urdu-gold/20 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-4 right-4 w-20 h-20 bg-urdu-gold/5 rounded-full"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 bg-cultural-amber/5 rounded-full"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <BookOpen className="w-8 h-8 text-urdu-gold mr-3" />
                  <h2 className="text-2xl font-bold text-urdu-brown font-urdu urdu-heading-md">
                    {poet.name} کے اشعار / Poems by {poet.name}
                  </h2>
                </div>
                <span className="text-sm bg-urdu-gold/10 px-4 py-2 rounded-full text-urdu-brown font-urdu">
                  کل: {poetPoems.length}
                </span>
              </div>

              {loadingPoems ? (
                <div className="text-center py-12">
                  <LoadingSpinner />
                  <p className="mt-4 text-urdu-maroon font-urdu">Loading poems...</p>
                </div>
              ) : poetPoems.length > 0 ? (
                <div className="space-y-4">
                  {poetPoems.map((poem) => (
                    <Link
                      key={poem._id}
                      to={`/poems/${poem._id}`}
                      className="block bg-white p-6 rounded-xl border border-urdu-gold/20 hover:shadow-lg hover:border-urdu-gold/40 transition-all duration-300"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-bold text-urdu-brown font-urdu urdu-heading-sm">
                          {poem.title}
                        </h3>
                        <span className="text-xs bg-cultural-amber/20 px-3 py-1 rounded-full text-cultural-brown">
                          {poem.category}
                        </span>
                      </div>
                      
                      <p className="text-urdu-maroon font-urdu urdu-body leading-relaxed mb-4 line-clamp-3">
                        {poem.content}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-urdu-maroon/70">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>{poem.likes?.length || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{poem.views || 0} views</span>
                        </div>
                        {poem.averageRating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-current text-urdu-gold" />
                            <span>{poem.averageRating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-r from-urdu-gold/20 to-cultural-amber/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-urdu-gold/30">
                    <BookOpen className="w-12 h-12 text-urdu-gold" />
                  </div>
                  <h3 className="text-xl font-urdu urdu-heading-sm text-urdu-brown mb-2">
                    ابھی تک کوئی شاعری نہیں
                  </h3>
                  <p className="text-urdu-maroon font-urdu urdu-body">
                    No poems available yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen cultural-bg pt-20 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold gradient-text mb-4 urdu-heading-lg">
              ہمارے شعراء
            </h1>
            <h2 className="text-3xl font-urdu text-urdu-brown mb-2">
              Our Poets
            </h2>
            <p className="text-lg text-urdu-maroon urdu-body">
              اردو شاعری کمیونٹی کے باصلاحیت شعراء کو دریافت کریں
            </p>
            <p className="text-base text-cultural-brown">
              Discover talented poets from the Urdu poetry community
            </p>
          </div>

          {/* Search Bar */}
          <div className="bg-gradient-to-r from-urdu-cream to-cultural-pearl p-6 rounded-xl shadow-cultural mb-6 border border-urdu-gold/20">
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-urdu-brown w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="شاعر کا نام یا مقام تلاش کریں... / Search poets by name or location..."
                className="w-full pl-10 pr-4 py-3 bg-white/80 border-2 border-urdu-gold/30 rounded-lg focus:border-urdu-gold focus:ring-2 focus:ring-urdu-gold/20 transition-all placeholder-urdu-maroon/60 font-urdu text-urdu-base"
              />
            </div>
          </div>

          {/* Poets Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-8 text-center rounded-xl border border-red-200 shadow-cultural">
              <Users className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-red-700 mb-2 font-urdu urdu-heading-md">
                شعراء لوڈ کرنے میں خرابی / Error Loading Poets
              </h3>
              <p className="text-red-600 mb-4 font-urdu urdu-body">{error}</p>
              <button
                onClick={fetchPoets}
                className="px-6 py-3 bg-gradient-to-r from-urdu-gold to-cultural-amber text-white rounded-lg hover:from-cultural-amber hover:to-urdu-gold transition-all font-urdu urdu-body shadow-md"
              >
                دوبارہ کوشش کریں / Try Again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {poets && poets.length > 0 ? (
                poets.map((poet) => (
                  <Link
                    key={poet._id || poet.slug}
                    to={
                      poet.isExternal
                        ? `/poets/external/${poet.slug}`
                        : `/poets/${poet._id}`
                    }
                    className="bg-gradient-to-br from-urdu-cream via-white to-cultural-pearl hover:from-urdu-light hover:to-cultural-pearl hover:shadow-cultural transform hover:-translate-y-1 transition-all duration-300 group overflow-hidden rounded-xl border border-urdu-gold/20 shadow-poetry"
                  >
                    {/* Large Classical Image at Top */}
                    <div className="h-60 bg-gradient-to-br from-cultural-charcoal to-cultural-slate flex items-center justify-center relative overflow-hidden">
                      {poet.profileImage?.url || poet.avatar || poet.image || poet.profilePicture ? (
                        <img
                          src={
                            (poet.profileImage?.url || poet.avatar || poet.image || poet.profilePicture).startsWith('http')
                              ? (poet.profileImage?.url || poet.avatar || poet.image || poet.profilePicture)
                              : `http://localhost:5001${poet.profileImage?.url || poet.avatar || poet.image || poet.profilePicture}`
                          }
                          alt={poet.name}
                          className="w-full h-full object-cover bg-center filter grayscale hover:filter-none transition-all duration-500"
                        />
                      ) : (
                        <div className="w-32 h-32 bg-gradient-to-r from-urdu-gold to-cultural-amber rounded-full flex items-center justify-center shadow-lg">
                          <User className="text-white w-16 h-16" />
                        </div>
                      )}
                      {/* Classical overlay effect */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10"></div>
                      {/* Status badges */}
                      <div className="absolute top-3 right-3 flex flex-col gap-1">
                        {poet.isVerified && (
                          <span className="bg-gradient-to-r from-urdu-gold to-cultural-amber text-white px-3 py-1 rounded-full text-xs flex items-center shadow-md urdu-caption">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            تصدیق شدہ
                          </span>
                        )}
                        {poet.isExternal && (
                          <span className="bg-gradient-to-r from-cultural-brown to-urdu-brown text-white px-3 py-1 rounded-full text-xs urdu-caption shadow-md">
                            کلاسیکی
                          </span>
                        )}
                        {poet.isDeceased && (
                          <span className="bg-gradient-to-r from-cultural-charcoal to-cultural-slate text-white px-3 py-1 rounded-full text-xs urdu-caption shadow-md">
                            مرحوم
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6 bg-gradient-to-b from-transparent to-urdu-cream/30">
                      {/* Poet Name and Info */}
                      <div className="mb-4">
                        <h3 className="font-bold text-xl text-urdu-brown group-hover:text-cultural-burgundy mb-1 transition-colors font-urdu urdu-heading-md">
                          {poet.name}
                        </h3>
                        {!poet.isExternal && (
                          <p className="text-sm text-urdu-maroon font-modern">
                            @{poet.username}
                          </p>
                        )}
                        {poet.penName && (
                          <p className="text-sm text-cultural-burgundy font-urdu urdu-body">
                            {poet.penName}
                          </p>
                        )}
                        {(poet.location || poet.birthPlace) && (
                          <div className="flex items-center text-xs text-urdu-maroon/80 mt-2">
                            <MapPin className="w-3 h-3 mr-1 text-urdu-gold" />
                            <span className="font-urdu urdu-caption">
                              {poet.location || (typeof poet.birthPlace === 'object' 
                                ? `${poet.birthPlace.city}, ${poet.birthPlace.region}` 
                                : poet.birthPlace)}
                            </span>
                          </div>
                        )}
                        {poet.era && (
                          <p className="text-xs text-cultural-brown mt-1 capitalize bg-urdu-gold/10 px-2 py-1 rounded-full inline-block">
                            {poet.era}
                          </p>
                        )}
                      </div>

                      <p className="text-sm text-urdu-maroon mb-4 line-clamp-2 font-urdu urdu-body leading-relaxed">
                        {poet.bio ||
                          poet.description ||
                          "خوبصورت اشعار کا اشتراک کرنے والا شاعر / A passionate poet sharing beautiful verses"}
                      </p>

                      <div className="flex items-center justify-between text-sm text-urdu-brown bg-cultural-pearl/50 rounded-lg p-3">
                        <div className="flex items-center space-x-1">
                          <BookOpen className="w-4 h-4 text-urdu-gold" />
                          <span className="font-urdu urdu-caption">
                            {poet.isExternal
                              ? `${poet.totalPoems || 0} کلام`
                              : `${poet.stats?.poemCount || 0} نظمیں`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {poet.isExternal ? (
                            <>
                              <Globe className="w-4 h-4 text-cultural-amber" />
                              <span className="font-urdu urdu-caption">
                                ریختہ
                              </span>
                            </>
                          ) : (
                            <>
                              <Heart className="w-4 h-4 text-cultural-burgundy" />
                              <span className="font-urdu urdu-caption">
                                {poet.stats?.totalLikes || 0} پسندیدگی
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Additional info for external poets */}
                      {poet.isExternal && poet.famousPoems && (
                        <div className="mt-3 pt-3 border-t border-urdu-gold/20">
                          <p className="text-xs text-urdu-maroon/75 font-urdu urdu-caption">
                            مشہور کلام:{" "}
                            {poet.famousPoems.slice(0, 2).join("، ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full">
                  <div className="bg-gradient-to-br from-urdu-cream to-cultural-pearl p-8 text-center rounded-xl border border-urdu-gold/20 shadow-cultural">
                    <Users className="w-16 h-16 text-urdu-gold mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-urdu-brown mb-2 font-urdu urdu-heading-md">
                      کوئی شاعر نہیں ملا / No Poets Found
                    </h3>
                    <p className="text-urdu-maroon font-urdu urdu-body">
                      {searchTerm
                        ? "اپنی تلاش کے الفاظ کو تبدیل کر کے دیکھیں / Try adjusting your search terms"
                        : "فی الوقت کوئی شاعر دستیاب نہیں / No poets available at the moment"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Poets;
