import React, { useState } from "react";
import {
  Calendar,
  BookOpen,
  Award,
  Heart,
  MapPin,
  Clock,
  Star,
} from "lucide-react";

const PoetTimeline = ({ poet, events = [] }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Sample timeline events if none provided
  const defaultEvents = [
    {
      id: 1,
      year: poet.birthYear || "1875",
      title: "Birth / پیدائش",
      description: `Born in ${
        typeof poet.birthPlace === 'object' 
          ? `${poet.birthPlace.city}, ${poet.birthPlace.region}` 
          : (poet.birthPlace || "Aligarh")
      }, ${poet.location?.country || "India"}`,
      descriptionUrdu: `${
        typeof poet.birthPlace === 'object' 
          ? poet.birthPlace.city 
          : (poet.birthPlace || "علی گڑھ")
      }، ${poet.location?.country || "ہندوستان"} میں پیدائش`,
      type: "birth",
      icon: "🌟",
      isImportant: true,
    },
    {
      id: 2,
      year: poet.educationYear || "1895",
      title: "Education / تعلیم",
      description: `Completed education in ${
        poet.education || "Islamic Studies and Literature"
      }`,
      descriptionUrdu: `${
        poet.education || "اسلامی علوم اور ادب"
      } میں تعلیم مکمل کی`,
      type: "education",
      icon: "📚",
      isImportant: true,
    },
    {
      id: 3,
      year: poet.firstPublicationYear || "1900",
      title: "First Publication / پہلی اشاعت",
      description: `Published first collection of poetry`,
      descriptionUrdu: `شاعری کا پہلا مجموعہ شائع کیا`,
      type: "publication",
      icon: "📖",
      isImportant: true,
    },
    {
      id: 4,
      year: poet.recognitionYear || "1920",
      title: "Literary Recognition / ادبی پہچان",
      description: `Gained recognition as a prominent Urdu poet`,
      descriptionUrdu: `ایک نامور اردو شاعر کے طور پر پہچان حاصل کی`,
      type: "recognition",
      icon: "🏆",
      isImportant: true,
    },
    {
      id: 5,
      year: poet.deathYear || (poet.isAlive ? null : "1958"),
      title: poet.isAlive ? "Present Day / موجودہ دور" : "Death / وفات",
      description: poet.isAlive
        ? `Continues to contribute to Urdu literature`
        : `Passed away in ${poet.deathPlace || (typeof poet.birthPlace === 'object' ? poet.birthPlace.city : poet.birthPlace) || "India"}`,
      descriptionUrdu: poet.isAlive
        ? `اردو ادب میں اپنا حصہ ڈالتے رہے ہیں`
        : `${poet.deathPlace || (typeof poet.birthPlace === 'object' ? poet.birthPlace.city : poet.birthPlace) || "ہندوستان"} میں وفات`,
      type: poet.isAlive ? "present" : "death",
      icon: poet.isAlive ? "✨" : "🌙",
      isImportant: true,
    },
  ].filter((event) => event.year); // Filter out events without years

  const timelineEvents = events.length > 0 ? events : defaultEvents;

  const getEventColor = (type) => {
    const colors = {
      birth: "from-green-400 to-emerald-500",
      education: "from-blue-400 to-indigo-500",
      publication: "from-purple-400 to-violet-500",
      recognition: "from-yellow-400 to-amber-500",
      death: "from-gray-400 to-slate-500",
      present: "from-pink-400 to-rose-500",
      work: "from-teal-400 to-cyan-500",
      award: "from-orange-400 to-red-500",
    };
    return colors[type] || "from-urdu-gold to-urdu-brown";
  };

  const getEventTextColor = (type) => {
    const colors = {
      birth: "text-green-700",
      education: "text-blue-700",
      publication: "text-purple-700",
      recognition: "text-yellow-700",
      death: "text-gray-700",
      present: "text-pink-700",
      work: "text-teal-700",
      award: "text-orange-700",
    };
    return colors[type] || "text-urdu-brown";
  };

  return (
    <div className="relative">
      {/* Timeline Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-urdu-brown mb-2">
          Life Timeline / زندگی کا خاکہ
        </h2>
        <p className="text-urdu-maroon">
          Journey through the life and works of {poet.name}
        </p>
        <p className="text-sm text-urdu-maroon mt-1" dir="rtl">
          {poet.name} کی زندگی اور کارناموں کا سفر
        </p>
      </div>

      {/* Timeline Container */}
      <div className="relative">
        {/* Central Timeline Line */}
        <div className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-gradient-to-b from-urdu-gold via-urdu-brown to-urdu-maroon h-full rounded-full shadow-lg"></div>

        {/* Timeline Events */}
        <div className="space-y-8">
          {timelineEvents.map((event, index) => {
            const isEven = index % 2 === 0;

            return (
              <div
                key={event.id}
                className={`relative flex items-center ${
                  isEven ? "flex-row" : "flex-row-reverse"
                }`}
              >
                {/* Event Content */}
                <div className={`w-5/12 ${isEven ? "pr-8" : "pl-8"}`}>
                  <div
                    className={`bg-white rounded-lg shadow-lg p-6 border-l-4 border-gradient-to-b ${getEventColor(
                      event.type
                    )} cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                      selectedEvent === event.id
                        ? "ring-2 ring-urdu-gold scale-105"
                        : ""
                    }`}
                    onClick={() =>
                      setSelectedEvent(
                        selectedEvent === event.id ? null : event.id
                      )
                    }
                  >
                    {/* Year Badge */}
                    <div
                      className={`inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r ${getEventColor(
                        event.type
                      )} text-white text-sm font-bold mb-3`}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {event.year}
                    </div>

                    {/* Event Title */}
                    <h3
                      className={`text-lg font-bold ${getEventTextColor(
                        event.type
                      )} mb-2 flex items-center`}
                    >
                      <span className="text-2xl mr-2">{event.icon}</span>
                      {event.title}
                    </h3>

                    {/* Event Description */}
                    <p className="text-gray-700 mb-2">{event.description}</p>
                    <p className="text-gray-600 text-sm" dir="rtl">
                      {event.descriptionUrdu}
                    </p>

                    {/* Expand Icon */}
                    <div className="mt-3 flex justify-end">
                      <div
                        className={`w-6 h-6 rounded-full bg-gradient-to-r ${getEventColor(
                          event.type
                        )} flex items-center justify-center`}
                      >
                        <Clock className="w-3 h-3 text-white" />
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {selectedEvent === event.id && event.details && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="space-y-3">
                          {event.details.map((detail, detailIndex) => (
                            <div
                              key={detailIndex}
                              className="flex items-start space-x-3"
                            >
                              <div
                                className={`w-2 h-2 rounded-full bg-gradient-to-r ${getEventColor(
                                  event.type
                                )} mt-2`}
                              ></div>
                              <div>
                                <p className="text-gray-700">{detail.text}</p>
                                {detail.textUrdu && (
                                  <p
                                    className="text-gray-600 text-sm mt-1"
                                    dir="rtl"
                                  >
                                    {detail.textUrdu}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Central Timeline Node */}
                <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
                  <div
                    className={`w-6 h-6 rounded-full bg-gradient-to-r ${getEventColor(
                      event.type
                    )} border-4 border-white shadow-lg flex items-center justify-center`}
                  >
                    {event.isImportant && (
                      <Star className="w-3 h-3 text-white fill-current" />
                    )}
                  </div>
                </div>

                {/* Spacer for opposite side */}
                <div className="w-5/12"></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Stats */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 text-center shadow-lg">
          <div className="text-2xl font-bold text-green-600">
            {poet.birthYear || "1875"}
          </div>
          <div className="text-sm text-gray-600">Birth Year</div>
          <div className="text-xs text-gray-500" dir="rtl">
            سال پیدائش
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 text-center shadow-lg">
          <div className="text-2xl font-bold text-blue-600">
            {poet.stats?.totalPoems || 150}
          </div>
          <div className="text-sm text-gray-600">Total Works</div>
          <div className="text-xs text-gray-500" dir="rtl">
            کل کارنامے
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 text-center shadow-lg">
          <div className="text-2xl font-bold text-purple-600">
            {poet.stats?.totalAwards || 5}
          </div>
          <div className="text-sm text-gray-600">Awards</div>
          <div className="text-xs text-gray-500" dir="rtl">
            ایوارڈز
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 text-center shadow-lg">
          <div className="text-2xl font-bold text-amber-600">
            {poet.era || "Modern"}
          </div>
          <div className="text-sm text-gray-600">Era</div>
          <div className="text-xs text-gray-500" dir="rtl">
            دور
          </div>
        </div>
      </div>

      {/* Cultural Quote */}
      <div className="mt-8 bg-gradient-to-r from-urdu-gold/10 to-urdu-brown/10 rounded-lg p-6 text-center">
        <div className="text-lg text-urdu-brown italic mb-2">
          "{poet.famousQuote || "Poetry is the language of the soul"}"
        </div>
        <div className="text-urdu-maroon text-sm" dir="rtl">
          "{poet.famousQuoteUrdu || "شاعری روح کی زبان ہے"}"
        </div>
        <div className="text-xs text-gray-500 mt-2">- {poet.name}</div>
      </div>
    </div>
  );
};

export default PoetTimeline;
