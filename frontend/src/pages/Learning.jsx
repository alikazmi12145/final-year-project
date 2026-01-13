import React, { useState, useEffect, useRef } from 'react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import axios from 'axios';
import AudioPlayer from '../components/common/AudioPlayer';
import {
  BookOpen,
  Search,
  PlayCircle,
  Book,
  Users,
  Award,
  FileText,
  Headphones
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const Learning = () => {
  // Tab and navigation state
  const [activeTab, setActiveTab] = useState('tutorials');
  const [loading, setLoading] = useState(false);
  
  // Learning resources state
  const [resources, setResources] = useState([]);
  const [selectedTutorial, setSelectedTutorial] = useState(null);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  
  // Qaafia search state
  const [searchWord, setSearchWord] = useState('');
  const [qaafiResults, setQaafiResults] = useState(null);
  
  // Harf-e-Ravi state
  const [selectedLetter, setSelectedLetter] = useState('');
  const [harfResults, setHarfResults] = useState(null);
  const [harfRaviText, setHarfRaviText] = useState('');
  const [harfRaviResult, setHarfRaviResult] = useState(null);
  
  // Audio player state
  const [audioRecitations, setAudioRecitations] = useState([]);
  const [filteredRecitations, setFilteredRecitations] = useState([]);
  const [audioSearchQuery, setAudioSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState(null);
  const [currentTime, setCurrentTime] = useState({});
  const [duration, setDuration] = useState({});
  const [volume, setVolume] = useState({});
  const [isMuted, setIsMuted] = useState({});
  const audioRefs = useRef({});

  // Urdu letters for Harf-e-Ravi
  const urduLetters = [
    'ا', 'ب', 'پ', 'ت', 'ٹ', 'ث', 'ج', 'چ', 'ح', 'خ',
    'د', 'ڈ', 'ذ', 'ر', 'ڑ', 'ز', 'ژ', 'س', 'ش', 'ص',
    'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'گ', 'ل',
    'م', 'ن', 'ں', 'و', 'ہ', 'ء', 'ی', 'ے'
  ];

  // Poetry meters data
  const poetryMeters = {
    "بحر_ہزج": {
      name: "بحر ہزج",
      pattern: "مفعولن مفعولن مفعولن مفعولن",
      examples: ["مجھے تم سے محبت ہے مجھے تم سے محبت ہے", "کوئی دن گار ہو جائے کوئی دن گار ہو جائے"]
    },
    "بحر_رمل": {
      name: "بحر رمل", 
      pattern: "فاعلاتن فاعلاتن فاعلاتن فاعلن",
      examples: ["چلو پھر سے وہی دعوتِ محشر لے چلیں", "یہ کیا جگہ ہے دوستو یہ کیا محفل ہے"]
    },
    "بحر_متقارب": {
      name: "بحر متقارب",
      pattern: "فعولن فعولن فعولن فعولن", 
      examples: ["کہیں کوئی مل گیا ہے پرانا دوست", "بہت دن بعد آئے ہو تم یہاں"]
    }
  };

  // Audio player functions
  const handlePlayPause = (audioId) => {
    const audio = audioRefs.current[audioId];
    if (!audio) return;
    
    if (playingId === audioId) {
      audio.pause();
      setPlayingId(null);
    } else {
      Object.keys(audioRefs.current).forEach(id => {
        if (id !== audioId && audioRefs.current[id]) {
          audioRefs.current[id].pause();
        }
      });
      setPlayingId(audioId);
    }
  };

  const handleTimeUpdate = (audioId) => {
    const audio = audioRefs.current[audioId];
    if (audio) {
      setCurrentTime(prev => ({ ...prev, [audioId]: audio.currentTime }));
    }
  };

  const handleLoadedMetadata = (audioId) => {
    const audio = audioRefs.current[audioId];
    if (audio) {
      setDuration(prev => ({ ...prev, [audioId]: audio.duration }));
    }
  };

  const handleSeek = (audioId, value) => {
    const audio = audioRefs.current[audioId];
    if (audio) {
      audio.currentTime = value;
      setCurrentTime(prev => ({ ...prev, [audioId]: value }));
    }
  };

  const handleVolumeChange = (audioId, value) => {
    const audio = audioRefs.current[audioId];
    if (audio) {
      audio.volume = value;
      setVolume(prev => ({ ...prev, [audioId]: value }));
      if (value > 0) {
        setIsMuted(prev => ({ ...prev, [audioId]: false }));
      }
    }
  };

  const handleMuteToggle = (audioId) => {
    const audio = audioRefs.current[audioId];
    if (audio) {
      const newMuted = !isMuted[audioId];
      audio.muted = newMuted;
      setIsMuted(prev => ({ ...prev, [audioId]: newMuted }));
    }
  };

  const handleSkip = (audioId, seconds) => {
    const audio = audioRefs.current[audioId];
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Auto-play when player expands
  useEffect(() => {
    if (playingId && audioRefs.current[playingId]) {
      audioRefs.current[playingId].play().catch(err => {
        console.error('Autoplay failed:', err);
      });
    }
  }, [playingId]);

  // Fetch data on component mount
  useEffect(() => {
    fetchLearningResources();
    fetchAudioRecitations();
  }, []);

  // API Functions
  const fetchLearningResources = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/learning/resources`);
      setResources(response.data.resources || []);
    } catch (error) {
      console.error('Error fetching learning resources:', error);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const searchQaafia = async () => {
    if (!searchWord.trim()) {
      alert('براہ کرم لفظ درج کریں');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/learning/ai/qaafia`, {
        word: searchWord,
        limit: 20,
        min_similarity: 0.5
      });
      setQaafiResults(response.data);
    } catch (error) {
      console.error('Error searching qaafia:', error);
      
      if (error.response?.data?.fallback) {
        try {
          const fallbackResponse = await axios.get(`${API_BASE_URL}/learning/qaafia/${searchWord}?advanced=true`);
          setQaafiResults(fallbackResponse.data);
        } catch (fallbackError) {
          alert('قافیہ تلاش میں خرابی');
          setQaafiResults(null);
        }
      } else {
        alert('قافیہ تلاش میں خرابی');
        setQaafiResults(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLetterClick = async (letter) => {
    setSelectedLetter(letter);
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/learning/harf-ravi/${letter}`);
      setHarfResults(response.data.info);
    } catch (error) {
      console.error('Error fetching harf-ravi:', error);
      setHarfResults(null);
    } finally {
      setLoading(false);
    }
  };

  const extractHarfRavi = async () => {
    if (!harfRaviText.trim()) {
      alert('براہ کرم متن داخل کریں');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/learning/ai/harf-ravi`, {
        text: harfRaviText,
        extract_all: true
      });
      setHarfRaviResult(response.data);
    } catch (error) {
      console.error('Error extracting harf-ravi:', error);
      alert('حرف راوی نکالنے میں خرابی');
      setHarfRaviResult(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAudioRecitations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/learning/audio`);
      const audios = response.data.audios || [];
      setAudioRecitations(audios);
      setFilteredRecitations(audios);
    } catch (error) {
      console.error('Error fetching audio recitations:', error);
      setAudioRecitations([]);
      setFilteredRecitations([]);
    }
  };

  // Search/filter audio recitations
  const handleAudioSearch = (query) => {
    setAudioSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredRecitations(audioRecitations);
      return;
    }
    
    const searchLower = query.toLowerCase();
    const filtered = audioRecitations.filter(audio => {
      const title = (audio.title || '').toLowerCase();
      const description = (audio.description || '').toLowerCase();
      const authorName = (audio.author?.name || '').toLowerCase();
      const tags = (audio.tags || []).join(' ').toLowerCase();
      
      return title.includes(searchLower) ||
             description.includes(searchLower) ||
             authorName.includes(searchLower) ||
             tags.includes(searchLower) ||
             title.includes(query) ||
             description.includes(query) ||
             authorName.includes(query);
    });
    
    setFilteredRecitations(filtered);
  };

  const handleTutorialClick = (tutorial) => {
    setSelectedTutorial(tutorial);
    setShowTutorialModal(true);
  };

  // Render Functions
  const renderTutorials = () => {
    const tutorials = resources.filter(r => r.category === 'tutorial' || r.type === 'tutorial');
    
    if (tutorials.length === 0) {
      return (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-urdu-gold opacity-50" />
          <p className="text-urdu-maroon">ابھی کوئی ٹیوٹوریل دستیاب نہیں ہے</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tutorials.map((tutorial, index) => (
          <div key={tutorial._id || index} className="card p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                tutorial.level === 'beginner' || tutorial.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                tutorial.level === 'intermediate' || tutorial.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {(tutorial.level === 'beginner' || tutorial.difficulty === 'beginner') ? 'ابتدائی' :
                 (tutorial.level === 'intermediate' || tutorial.difficulty === 'intermediate') ? 'درمیانی' : 'اعلیٰ'}
              </div>
              <BookOpen className="text-urdu-gold w-5 h-5" />
            </div>
            
            <h3 className="text-xl font-bold text-urdu-brown mb-3 text-right">
              {tutorial.title}
            </h3>
            
            <p className="text-urdu-maroon mb-4 text-right leading-relaxed">
              {tutorial.description}
            </p>
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-500">
                {tutorial.duration || '30 منٹ'}
              </span>
              <span className="text-sm text-urdu-gold font-medium">
                {tutorial.author?.name || tutorial.author?.username || 'سسٹم'}
              </span>
            </div>
            
            <button 
              onClick={() => handleTutorialClick(tutorial)}
              className="btn-primary w-full hover:bg-urdu-brown transition-colors"
            >
              شروع کریں
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderTutorialModal = () => {
    if (!showTutorialModal || !selectedTutorial) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowTutorialModal(false)}>
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-gradient-to-r from-urdu-gold to-urdu-brown text-white p-6 flex justify-between items-center">
            <button 
              onClick={() => setShowTutorialModal(false)}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold text-right">{selectedTutorial.title}</h2>
          </div>
          
          <div className="p-6 text-right" dir="rtl">
            <div className="mb-6">
              <div className="flex items-center justify-end gap-4 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  (selectedTutorial.level === 'beginner' || selectedTutorial.difficulty === 'beginner') ? 'bg-green-100 text-green-800' :
                  (selectedTutorial.level === 'intermediate' || selectedTutorial.difficulty === 'intermediate') ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {(selectedTutorial.level === 'beginner' || selectedTutorial.difficulty === 'beginner') ? 'ابتدائی' :
                   (selectedTutorial.level === 'intermediate' || selectedTutorial.difficulty === 'intermediate') ? 'درمیانی' : 'اعلیٰ'}
                </span>
                <span className="text-sm text-gray-500">{selectedTutorial.duration || '30 منٹ'}</span>
              </div>
              
              <p className="text-lg text-urdu-maroon leading-relaxed mb-6">
                {selectedTutorial.description}
              </p>
            </div>

            <div className="prose prose-lg max-w-none text-right" dir="rtl">
              <div className="bg-urdu-cream/30 p-6 rounded-lg mb-6">
                <h3 className="text-xl font-bold text-urdu-brown mb-4">تفصیل:</h3>
                <div className="text-urdu-maroon leading-relaxed whitespace-pre-line">
                  {selectedTutorial.content?.text || selectedTutorial.content || 'یہ ٹیوٹوریل آپ کو اردو شاعری کے بنیادی اصولوں سے آشنا کرائے گا۔ اس میں قافیہ، ردیف، بحر اور دیگر اہم عناصر کی تفصیل شامل ہے۔'}
                </div>
              </div>

              {selectedTutorial.tags && selectedTutorial.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end mt-6">
                  {selectedTutorial.tags.map((tag, idx) => (
                    <span key={idx} className="bg-urdu-gold text-white px-3 py-1 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => setShowTutorialModal(false)}
                className="btn-primary px-8"
              >
                بند کریں
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderQaafia = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-white w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-urdu-brown mb-2">
            قافیہ تلاش کنندہ (AI)
          </h3>
          <p className="text-urdu-maroon">
            اردو الفاظ کے ہم قافیہ الفاظ تلاش کریں
          </p>
        </div>
        
        <div className="max-w-md mx-auto mb-6">
          <div className="flex gap-4">
            <button
              onClick={searchQaafia}
              disabled={loading || !searchWord.trim()}
              className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'تلاش کریں'}
            </button>
            <input
              type="text"
              placeholder="اردو لفظ داخل کریں... (مثلاً: دل، محبت، رات)"
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && searchQaafia()}
              className="input-field flex-1 text-right"
              dir="rtl"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-right">
            💡 مثالیں: دل، محبت، رات، شب، نظر، خیال، دنیا، زندگی
          </p>
        </div>

        {qaafiResults && (
          <div className="bg-urdu-cream/30 p-6 rounded-lg">
            <div className="mb-4">
              <h4 className="text-xl font-bold text-right text-urdu-brown">
                لفظ "{qaafiResults.word}" کے ہم قافیہ الفاظ:
              </h4>
              
              {/* Display pattern analysis from AI */}
              {qaafiResults.pattern_analysis && (
                <div className="text-right mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    🔍 صوتی نمونہ: <span className="font-bold text-urdu-brown">{qaafiResults.pattern_analysis.phonetic_qaafia || 'N/A'}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    الگورتھم: {qaafiResults.pattern_analysis.matching_strategy === 'ai_weighted_phonetic' ? 'AI وزنی صوتی' : 'بنیادی'}
                  </p>
                </div>
              )}
              
              {/* Display count and match type */}
              {qaafiResults.count !== undefined && (
                <p className="text-sm text-urdu-gold text-right mt-2 font-bold">
                  ✨ {qaafiResults.count} نتائج ملے
                </p>
              )}
            </div>
            
            {qaafiResults.rhymes && qaafiResults.rhymes.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {qaafiResults.rhymes.map((rhyme, index) => {
                  const matchType = rhyme.qaafia_type;
                  const similarityScore = rhyme.similarity_score || rhyme.similarity;
                  
                  // Color coding based on match quality
                  let borderColor = 'border-gray-300';
                  let bgColor = 'bg-white';
                  let matchLabel = '';
                  
                  if (matchType === 'exact') {
                    borderColor = 'border-green-500';
                    bgColor = 'bg-green-50';
                    matchLabel = '✓ بالکل درست';
                  } else if (matchType === 'similar') {
                    borderColor = 'border-blue-500';
                    bgColor = 'bg-blue-50';
                    matchLabel = '≈ مماثل';
                  } else if (matchType === 'close') {
                    borderColor = 'border-yellow-500';
                    bgColor = 'bg-yellow-50';
                    matchLabel = '~ قریب';
                  } else if (matchType === 'loose') {
                    borderColor = 'border-orange-400';
                    bgColor = 'bg-orange-50';
                    matchLabel = '◊ ڈھیلا';
                  }
                  
                  return (
                    <div 
                      key={index} 
                      className={`${bgColor} p-4 rounded-lg text-right border-2 ${borderColor} hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer`}
                      onClick={() => {
                        setSearchWord(typeof rhyme === 'string' ? rhyme : rhyme.word);
                        searchQaafia();
                      }}
                      title={`صوتی نمونہ: ${rhyme.phonetic_pattern || 'N/A'}`}
                    >
                      <span className="text-xl font-bold text-urdu-brown block">
                        {typeof rhyme === 'string' ? rhyme : rhyme.word}
                      </span>
                      
                      {/* Display similarity score */}
                      {similarityScore !== undefined && (
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-xs font-semibold text-gray-700">
                            {(similarityScore * 100).toFixed(0)}%
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-urdu-gold h-1.5 rounded-full transition-all"
                              style={{ width: `${(similarityScore * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {/* Display match type label */}
                      {matchLabel && (
                        <span className="text-xs text-gray-600 block mt-1">
                          {matchLabel}
                        </span>
                      )}
                      
                      {/* Display phonetic pattern */}
                      {rhyme.phonetic_pattern && (
                        <span className="text-xs text-gray-500 block mt-0.5">
                          صوتی: {rhyme.phonetic_pattern}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-urdu-maroon text-lg">
                  😕 افسوس! کوئی ہم قافیہ الفاظ نہیں ملے
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  کسی دوسرے لفظ سے کوشش کریں
                </p>
              </div>
            )}
          </div>
        )}
        
        {!qaafiResults && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 mx-auto mb-4 text-urdu-gold opacity-30" />
            <p className="text-urdu-maroon">
              اوپر اردو لفظ داخل کر کے "تلاش کریں" پر کلک کریں
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderHarfRavi = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="text-white w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-urdu-brown mb-2">
            حرف راوی - اردو حروف تہجی
          </h3>
          <p className="text-urdu-maroon">
            اردو حروف کی تفصیلی معلومات اور مثالیں
          </p>
        </div>
        
        <div className="grid grid-cols-6 md:grid-cols-10 gap-3 mb-6">
          {urduLetters.map((letter, index) => (
            <button
              key={index}
              onClick={() => handleLetterClick(letter)}
              className={`p-3 rounded-lg border-2 text-xl font-bold transition-colors ${
                selectedLetter === letter
                  ? 'bg-urdu-gold text-white border-urdu-gold'
                  : 'bg-white text-urdu-brown border-urdu-cream hover:border-urdu-gold hover:bg-urdu-gold hover:text-white'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>

        {loading && selectedLetter && (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        )}

        {harfResults && selectedLetter && !loading && (
          <div className="bg-urdu-cream/30 p-6 rounded-lg">
            <h4 className="text-xl font-bold mb-4 text-right text-urdu-brown">
              حرف "{selectedLetter}" ({harfResults.name})
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-bold mb-3 text-right">مثالی الفاظ:</h5>
                <div className="space-y-2">
                  {harfResults.examples?.map((example, index) => (
                    <div key={index} className="bg-white p-3 rounded text-right border">
                      {example}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h5 className="font-bold mb-3 text-right">شاعری میں استعمال:</h5>
                <div className="space-y-2">
                  {harfResults.poetry?.map((poem, index) => (
                    <div key={index} className="bg-white p-3 rounded text-right italic border">
                      "{poem}"
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedLetter && (
          <div className="text-center text-urdu-maroon py-8">
            <Book className="w-12 h-12 mx-auto mb-4 text-urdu-gold" />
            <p>کوئی حرف منتخب کریں تفصیلات دیکھنے کے لیے</p>
          </div>
        )}

        {/* AI Harf-e-Ravi Extractor */}
        <div className="mt-8 pt-8 border-t border-urdu-cream">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-urdu-brown mb-2">
              🤖 AI حرف راوی نکالنے والا
            </h3>
            <p className="text-urdu-maroon">
              اپنی شاعری داخل کریں اور AI سے حرف راوی دریافت کریں
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <textarea
              placeholder="شاعری یا الفاظ یہاں لکھیں... مثال: دل گل مل"
              value={harfRaviText}
              onChange={(e) => setHarfRaviText(e.target.value)}
              className="input-field w-full h-32 text-right resize-none"
              dir="rtl"
            />
            <button
              onClick={extractHarfRavi}
              disabled={loading || !harfRaviText.trim()}
              className="btn-primary w-full mt-4"
            >
              {loading ? <LoadingSpinner size="sm" /> : '🔍 AI سے حرف راوی نکالیں'}
            </button>
          </div>

          {harfRaviResult && (
            <div className="bg-white p-6 rounded-lg shadow-lg mt-6">
              <div className="text-center mb-4">
                <div className="bg-gradient-to-r from-urdu-gold to-urdu-brown text-white text-4xl font-bold p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto">
                  {harfRaviResult.harf_ravi}
                </div>
                <h4 className="text-xl font-bold text-urdu-brown mt-4">
                  حرف راوی: <span className="text-urdu-gold text-3xl">{harfRaviResult.harf_ravi}</span>
                </h4>
              </div>
              
              {harfRaviResult.analysis && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-urdu-cream/30 p-4 rounded text-center">
                      <div className="font-bold text-urdu-brown text-sm">اعتماد</div>
                      <div className="text-2xl text-urdu-gold mt-2 font-bold">
                        {(harfRaviResult.analysis.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="bg-urdu-cream/30 p-4 rounded text-center">
                      <div className="font-bold text-urdu-brown text-sm">تعدد</div>
                      <div className="text-2xl text-urdu-gold mt-2 font-bold">
                        {harfRaviResult.analysis.frequency}
                      </div>
                    </div>
                    <div className="bg-urdu-cream/30 p-4 rounded text-center">
                      <div className="font-bold text-urdu-brown text-sm">کل سطریں</div>
                      <div className="text-2xl text-urdu-gold mt-2 font-bold">
                        {harfRaviResult.analysis.total_lines || harfRaviResult.analysis.total_words || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-urdu-cream/30 p-4 rounded text-center">
                      <div className="font-bold text-urdu-brown text-sm">قسم</div>
                      <div className="text-lg text-urdu-gold mt-2 font-bold">
                        {harfRaviResult.analysis.pattern_type === 'consistent' ? '✓ مستقل' : 
                         harfRaviResult.analysis.pattern_type === 'mixed' ? '≈ مخلوط' : 
                         harfRaviResult.analysis.pattern || 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  {harfRaviResult.analysis.example_words && harfRaviResult.analysis.example_words.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-bold text-right mb-2 text-urdu-brown">مثالی الفاظ:</h5>
                      <div className="flex flex-wrap gap-2 justify-end">
                        {harfRaviResult.analysis.example_words.map((word, index) => (
                          <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {harfRaviResult.last_words_analyzed && harfRaviResult.last_words_analyzed.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-bold text-right mb-2 text-urdu-brown">تجزیہ شدہ آخری الفاظ:</h5>
                      <div className="flex flex-wrap gap-2 justify-end">
                        {harfRaviResult.last_words_analyzed.slice(0, 8).map((word, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {harfRaviResult.all_candidates && harfRaviResult.all_candidates.length > 1 && (
                <div className="mt-6">
                  <h5 className="font-bold text-right mb-3 text-urdu-brown">دیگر ممکنہ حرف راوی:</h5>
                  <div className="flex flex-wrap gap-3 justify-end">
                    {harfRaviResult.all_candidates.slice(1, 6).map((candidate, index) => (
                      <div key={index} className="bg-gray-100 px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-urdu-gold transition-colors">
                        <div className="text-center">
                          <span className="font-bold text-2xl text-urdu-brown block">{candidate.letter}</span>
                          <span className="text-xs text-gray-600">
                            {candidate.frequency} ({candidate.percentage || 0}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMeters = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center mx-auto mb-4">
            <Book className="text-white w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-urdu-brown mb-2">
            شاعری کی بحور
          </h3>
          <p className="text-urdu-maroon">
            اردو شاعری میں استعمال ہونے والی مختلف بحور
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(poetryMeters).map(([key, meter], index) => (
            <div key={index} className="bg-urdu-cream/30 p-6 rounded-lg">
              <h4 className="text-xl font-bold text-urdu-brown mb-3 text-right">
                {meter.name}
              </h4>
              
              <div className="space-y-4 text-right">
                <div>
                  <span className="font-medium">پیٹرن: </span>
                  <div className="text-urdu-gold font-mono bg-white p-2 rounded mt-1">
                    {meter.pattern}
                  </div>
                </div>
                
                <div>
                  <span className="font-medium">مثالیں:</span>
                  <div className="mt-2 space-y-2">
                    {meter.examples.map((example, idx) => (
                      <div key={idx} className="bg-white p-3 rounded italic border">
                        "{example}"
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAudioRecitations = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center mx-auto mb-4">
            <Headphones className="text-white w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-urdu-brown mb-2">
            🎧 صوتی تلاوتیں
          </h3>
          <p className="text-urdu-maroon">
            مشہور شاعری کی صوتی تلاوتیں سنیں
          </p>
        </div>

        {/* Search Bar for Audio Recitations */}
        <div className="mb-6">
          <div className="relative max-w-xl mx-auto">
            <input
              type="text"
              value={audioSearchQuery}
              onChange={(e) => handleAudioSearch(e.target.value)}
              placeholder="شاعری تلاش کریں... (شاعر، عنوان، یا موضوع)"
              className="w-full px-5 py-4 pr-14 text-right text-lg rounded-xl border-2 border-urdu-gold/30 focus:border-urdu-gold focus:ring-2 focus:ring-urdu-gold/20 bg-white shadow-md transition-all placeholder:text-gray-400"
              dir="rtl"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Search className="w-6 h-6 text-urdu-gold" />
            </div>
            {audioSearchQuery && (
              <button
                onClick={() => handleAudioSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-urdu-brown transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          {audioSearchQuery && (
            <p className="text-center mt-3 text-urdu-maroon">
              {filteredRecitations.length > 0 
                ? `"${audioSearchQuery}" کے لیے ${filteredRecitations.length} نتائج ملے`
                : `"${audioSearchQuery}" کے لیے کوئی نتیجہ نہیں ملا`
              }
            </p>
          )}
        </div>

        {!filteredRecitations || filteredRecitations.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-2xl mx-auto">
              <Headphones className="w-20 h-20 mx-auto mb-6 text-urdu-gold opacity-50" />
              {audioSearchQuery ? (
                // No search results
                <>
                  <h3 className="text-2xl font-bold text-urdu-brown mb-4">کوئی نتیجہ نہیں ملا</h3>
                  <p className="text-urdu-maroon text-lg mb-6 leading-relaxed">
                    "{audioSearchQuery}" کے لیے کوئی صوتی تلاوت نہیں ملی
                  </p>
                  <button
                    onClick={() => handleAudioSearch('')}
                    className="px-6 py-3 bg-gradient-to-r from-urdu-gold to-urdu-brown text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    تمام تلاوتیں دیکھیں
                  </button>
                </>
              ) : (
                // No recitations available
                <>
                  <h3 className="text-2xl font-bold text-urdu-brown mb-4">صوتی تلاوتیں جلد آ رہی ہیں</h3>
                  <p className="text-urdu-maroon text-lg mb-6 leading-relaxed">
                    ہم مشہور شعراء کی اعلیٰ معیار کی صوتی تلاوتیں شامل کرنے پر کام کر رہے ہیں
                  </p>
                  <div className="bg-urdu-cream/50 p-6 rounded-lg text-right" dir="rtl">
                    <h4 className="font-bold text-urdu-brown mb-3">آنے والی تلاوتیں:</h4>
                    <ul className="space-y-2 text-urdu-maroon">
                      <li className="flex items-center justify-end gap-2">
                        <span>میر تقی میر کی منتخب غزلیں</span>
                        <span className="text-urdu-gold">✦</span>
                      </li>
                      <li className="flex items-center justify-end gap-2">
                        <span>مرزا غالب کا کلام</span>
                        <span className="text-urdu-gold">✦</span>
                      </li>
                      <li className="flex items-center justify-end gap-2">
                        <span>علامہ اقبال کی نظمیں</span>
                        <span className="text-urdu-gold">✦</span>
                      </li>
                      <li className="flex items-center justify-end gap-2">
                        <span>فیض احمد فیض کا شاعری</span>
                        <span className="text-urdu-gold">✦</span>
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredRecitations.map((audio) => (
              <div key={audio._id}>
                {playingId === audio._id ? (
                  // Professional Audio Player - Expanded View
                  <AudioPlayer
                    src={audio.media?.audio?.url}
                    title={audio.title}
                    artist={audio.author?.name || 'نامعلوم فنکار'}
                    description={audio.description}
                    coverImage={audio.media?.image?.url}
                    showExpanded={true}
                    onClose={() => setPlayingId(null)}
                    className="animate-fade-in"
                  />
                ) : (
                  // Collapsed Card View
                  <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-[1.02] border-2 border-transparent hover:border-urdu-gold/50 overflow-hidden">
                    <div className="p-6 flex items-center justify-between gap-6">
                      <div className="flex-1 text-right" dir="rtl">
                        <h4 className="text-xl font-bold text-urdu-brown mb-2">{audio.title}</h4>
                        {audio.description && (
                          <p className="text-sm text-urdu-maroon mb-3 leading-relaxed">{audio.description}</p>
                        )}
                        <div className="flex items-center gap-2 justify-end text-sm text-gray-600">
                          <span>{audio.author?.name || 'نامعلوم'}</span>
                          <span>•</span>
                          <span>🎙️</span>
                        </div>
                        {audio.tags && audio.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 justify-end mt-3">
                            {audio.tags.slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="text-xs bg-urdu-cream text-urdu-brown px-3 py-1 rounded-full font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => setPlayingId(audio._id)}
                        className="group flex flex-col items-center gap-3 min-w-[100px]"
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-urdu-gold rounded-full animate-ping opacity-20"></div>
                          <div className="relative bg-gradient-to-br from-urdu-gold to-urdu-brown hover:from-urdu-brown hover:to-urdu-gold text-white p-5 rounded-full transition-all shadow-lg group-hover:shadow-2xl group-hover:scale-110 transform">
                            <PlayCircle className="w-8 h-8" />
                          </div>
                        </div>
                        <span className="text-sm font-bold text-urdu-gold group-hover:text-urdu-brown transition-colors">
                          سنیں
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Tab configuration
  const tabs = [
    { id: 'tutorials', label: 'سبق', icon: BookOpen },
    { id: 'qaafia', label: 'قافیہ تلاش (AI)', icon: Search },
    { id: 'harf-ravi', label: 'حرف راوی (AI)', icon: FileText },
    { id: 'audio', label: 'صوتی تلاوتیں', icon: Headphones },
    { id: 'meters', label: 'بحور', icon: Book }
  ];

  return (
    <div className="min-h-screen cultural-bg py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-4">
            📚 تعلیمی مرکز
          </h1>
          <p className="text-lg text-urdu-brown">
            اردو شاعری سیکھنے کے لیے جامع وسائل - AI قافیہ تلاش، حرف راوی، صوتی تلاوتیں، بحور اور سبق
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-urdu-gold text-white shadow-lg'
                    : 'bg-white text-urdu-brown hover:bg-urdu-cream shadow border border-urdu-cream'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="max-w-6xl mx-auto">
          {loading && activeTab === 'tutorials' ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {activeTab === 'tutorials' && renderTutorials()}
              {activeTab === 'qaafia' && renderQaafia()}
              {activeTab === 'harf-ravi' && renderHarfRavi()}
              {activeTab === 'audio' && renderAudioRecitations()}
              {activeTab === 'meters' && renderMeters()}
            </>
          )}
        </div>

        {/* Tutorial Modal */}
        {renderTutorialModal()}

        {/* Learning Stats */}
        <div className="grid md:grid-cols-4 gap-6 mt-12">
          {[
            { icon: Book, label: "وسائل", value: "50+" },
            { icon: PlayCircle, label: "سبق", value: "25+" },
            { icon: Users, label: "اساتذہ", value: "15+" },
            { icon: Award, label: "کورسز", value: "10+" },
          ].map((stat, index) => (
            <div key={index} className="card p-6 text-center">
              <stat.icon className="w-8 h-8 text-urdu-gold mx-auto mb-3" />
              <div className="text-2xl font-bold text-urdu-brown mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-urdu-maroon">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Learning;
