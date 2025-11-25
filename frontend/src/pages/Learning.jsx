import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import axios from 'axios';
import {
  BookOpen,
  Search,
  PlayCircle,
  Download,
  Book,
  Users,
  Award,
  FileText,
  Headphones,
  Star,
  Pause,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const Learning = () => {
  const [activeTab, setActiveTab] = useState('tutorials');
  const [resources, setResources] = useState([]);
  const [qaafiResults, setQaafiResults] = useState(null);
  const [harfResults, setHarfResults] = useState([]);
  const [meterResults, setMeterResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchWord, setSearchWord] = useState('');
  const [selectedLetter, setSelectedLetter] = useState('');
  const [wordAnalysis, setWordAnalysis] = useState(null);
  const [harfRaviText, setHarfRaviText] = useState('');
  const [harfRaviResult, setHarfRaviResult] = useState(null);
  const [audioRecitations, setAudioRecitations] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const [currentTime, setCurrentTime] = useState({});
  const [duration, setDuration] = useState({});
  const [volume, setVolume] = useState({});
  const [isMuted, setIsMuted] = useState({});
  const audioRefs = useRef({});
    // Custom audio player logic
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

    // Auto-play when player expands
    useEffect(() => {
      if (playingId && audioRefs.current[playingId]) {
        audioRefs.current[playingId].play();
      }
    }, [playingId]);

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
  const [selectedTutorial, setSelectedTutorial] = useState(null);
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  // Urdu letters for Harf-e-Ravi
  const urduLetters = [
    'ا', 'ب', 'پ', 'ت', 'ٹ', 'ث', 'ج', 'چ', 'ح', 'خ',
    'د', 'ڈ', 'ذ', 'ر', 'ڑ', 'ز', 'ژ', 'س', 'ش', 'ص',
    'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'گ', 'ل',
    'م', 'ن', 'ں', 'و', 'ہ', 'ء', 'ی', 'ے'
  ];

  // Poetry meters data (for display)
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

  useEffect(() => {
    fetchLearningResources();
    fetchHarfRavi();
    fetchMeters();
    fetchAudioRecitations();
  }, []);

  const fetchLearningResources = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/learning/resources`);
      setResources(response.data.resources || []);
    } catch (error) {
      console.error('Error fetching learning resources:', error);
      // Set empty array on error to avoid breaking the UI
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const searchQaafia = async () => {
    if (!searchWord.trim()) return;
    
    try {
      setLoading(true);
      // Use new AI endpoint
      const response = await axios.post(`${API_BASE_URL}/learning/ai/qaafia`, {
        word: searchWord,
        limit: 20,
        min_similarity: 0.5
      });
      setQaafiResults(response.data);
    } catch (error) {
      console.error('Error searching qaafia:', error);
      
      // Fallback to old endpoint if AI service is unavailable
      if (error.response?.data?.fallback) {
        try {
          const fallbackResponse = await axios.get(`${API_BASE_URL}/learning/qaafia/${searchWord}?advanced=true`);
          setQaafiResults(fallbackResponse.data);
        } catch (fallbackError) {
          setQaafiResults(null);
        }
      } else {
        setQaafiResults(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHarfRavi = async (letter = '') => {
    try {
      const response = await axios.get(`${API_BASE_URL}/learning/harf-ravi/${letter}`);
      setHarfResults(letter ? response.data.info : response.data.letters);
    } catch (error) {
      console.error('Error fetching harf-ravi:', error);
      setHarfResults([]);
    }
  };

  const fetchMeters = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/learning/meters`);
      setMeterResults(response.data.meters || []);
    } catch (error) {
      console.error('Error fetching meters:', error);
      setMeterResults([]);
    }
  };

  const analyzeWord = async () => {
    if (!searchWord.trim()) return;

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/learning/analyze-word`, {
        word: searchWord
      });
      setWordAnalysis(response.data.analysis);
    } catch (error) {
      console.error('Error analyzing word:', error);
      setWordAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLetterClick = (letter) => {
    setSelectedLetter(letter);
    fetchHarfRavi(letter);
  };

  const extractHarfRavi = async () => {
    if (!harfRaviText.trim()) return;

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/learning/ai/harf-ravi`, {
        text: harfRaviText,
        extract_all: true
      });
      setHarfRaviResult(response.data);
    } catch (error) {
      console.error('Error extracting harf-ravi:', error);
      setHarfRaviResult(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAudioRecitations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/learning/audio`);
      setAudioRecitations(response.data.audios || []);
    } catch (error) {
      console.error('Error fetching audio recitations:', error);
      setAudioRecitations([]);
    }
  };

  const playAudio = (audio) => {
    if (currentAudio?._id === audio._id && isPlaying) {
      // Pause current audio
      audioElement?.pause();
      setIsPlaying(false);
    } else {
      // Play new audio
      if (audioElement) {
        audioElement.pause();
      }
      const newAudio = new Audio(audio.media?.audio?.url);
      newAudio.play();
      setAudioElement(newAudio);
      setCurrentAudio(audio);
      setIsPlaying(true);

      newAudio.onended = () => {
        setIsPlaying(false);
      };
    }
  };

  const handleTutorialClick = (tutorial) => {
    setSelectedTutorial(tutorial);
    setShowTutorialModal(true);
  };

  const renderTutorials = () => {
    const tutorials = resources.filter(r => r.category === 'tutorial');
    
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
                tutorial.level === 'beginner' ? 'bg-green-100 text-green-800' :
                tutorial.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {tutorial.level === 'beginner' ? 'ابتدائی' :
                 tutorial.level === 'intermediate' ? 'درمیانی' : 'اعلیٰ'}
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
                {tutorial.author?.name || 'سسٹم'}
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
                  selectedTutorial.level === 'beginner' ? 'bg-green-100 text-green-800' :
                  selectedTutorial.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {selectedTutorial.level === 'beginner' ? 'ابتدائی' :
                   selectedTutorial.level === 'intermediate' ? 'درمیانی' : 'اعلیٰ'}
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
                  {selectedTutorial.content || 'یہ ٹیوٹوریل آپ کو اردو شاعری کے بنیادی اصولوں سے آشنا کرائے گا۔ اس میں قافیہ، ردیف، بحر اور دیگر اہم عناصر کی تفصیل شامل ہے۔'}
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
            <>
              <div className="space-y-6">
                <div className="card p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="text-white w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-urdu-brown mb-2">
                      قافیہ تلاش کنندہ
                    </h3>
                    <p className="text-urdu-maroon">
                      اردو الفاظ کے ہم قافیہ الفاظ تلاش کریں
                    </p>
                  </div>
                  <div className="max-w-md mx-auto mb-6">
                    <div className="flex gap-4">
                      <input
                        type="text"
                        placeholder="اردو لفظ داخل کریں..."
                        value={searchWord}
                        onChange={(e) => setSearchWord(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* Move the audio player fragment outside the input */}
                  <>
                    {playingId
                      ? audioRecitations.filter(audio => audio._id === playingId).map((audio) => (
                          <div key={audio._id} className="w-full flex flex-col items-center justify-center py-12">
                            <div className="max-w-xl w-full bg-white rounded-2xl shadow-2xl p-10 border border-urdu-gold/30">
                              <h4 className="text-3xl font-bold text-urdu-brown mb-4 text-center">{audio.title}</h4>
                              {audio.description && (
                                <p className="text-lg text-urdu-maroon mb-4 text-center">{audio.description}</p>
                              )}
                              {audio.tags && audio.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 justify-center mb-4">
                                  {audio.tags.slice(0, 3).map((tag, idx) => (
                                    <span key={idx} className="text-xs bg-urdu-cream px-3 py-1 rounded-full font-semibold">{tag}</span>
                                  ))}
                                </div>
                              )}
                              {audio.media?.audio?.url && (
                                <div className="bg-gradient-to-r from-urdu-gold/10 to-urdu-brown/10 rounded-xl p-8 border border-urdu-gold/30 mx-auto">
                                  <audio
                                    ref={el => audioRefs.current[audio._id] = el}
                                    src={audio.media.audio.url}
                                    onTimeUpdate={() => handleTimeUpdate(audio._id)}
                                    onLoadedMetadata={() => handleLoadedMetadata(audio._id)}
                                    onEnded={() => setPlayingId(null)}
                                    className="hidden"
                                  />
                                  <div className="space-y-6">
                                    <div className="space-y-2">
                                      <input
                                        type="range"
                                        min="0"
                                        max={duration[audio._id] || 0}
                                        value={currentTime[audio._id] || 0}
                                        onChange={(e) => handleSeek(audio._id, parseFloat(e.target.value))}
                                        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-urdu-gold"
                                        style={{
                                          background: `linear-gradient(to right, #C4A747 0%, #C4A747 ${((currentTime[audio._id] || 0) / (duration[audio._id] || 1)) * 100}%, #e5e7eb ${((currentTime[audio._id] || 0) / (duration[audio._id] || 1)) * 100}%, #e5e7eb 100%)`
                                        }}
                                      />
                                      <div className="flex justify-between text-sm text-gray-600">
                                        <span>{formatTime(currentTime[audio._id] || 0)}</span>
                                        <span>{formatTime(duration[audio._id] || 0)}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-center gap-6">
                                      <button onClick={() => handleSkip(audio._id, -10)} className="p-3 hover:bg-urdu-gold/10 rounded-full transition-colors" title="10 سیکنڈ پیچھے">
                                        <SkipBack className="w-6 h-6 text-urdu-brown" />
                                      </button>
                                      <button onClick={() => handlePlayPause(audio._id)} className="p-6 bg-urdu-gold hover:bg-urdu-brown text-white rounded-full transition-colors shadow-lg text-center">
                                        {playingId === audio._id ? (<Pause className="w-8 h-8" />) : (<PlayCircle className="w-8 h-8" />)}
                                      </button>
                                      <button onClick={() => handleSkip(audio._id, 10)} className="p-3 hover:bg-urdu-gold/10 rounded-full transition-colors" title="10 سیکنڈ آگے">
                                        <SkipForward className="w-6 h-6 text-urdu-brown" />
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-4 justify-center">
                                      <button onClick={() => handleMuteToggle(audio._id)} className="p-2 hover:bg-urdu-gold/10 rounded-full transition-colors">
                                        {isMuted[audio._id] || volume[audio._id] === 0 ? (<VolumeX className="w-6 h-6 text-urdu-brown" />) : (<Volume2 className="w-6 h-6 text-urdu-brown" />)}
                                      </button>
                                      <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={isMuted[audio._id] ? 0 : (volume[audio._id] || 1)}
                                        onChange={(e) => handleVolumeChange(audio._id, parseFloat(e.target.value))}
                                        className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-urdu-gold"
                                        style={{
                                          background: `linear-gradient(to right, #C4A747 0%, #C4A747 ${(isMuted[audio._id] ? 0 : (volume[audio._id] || 1)) * 100}%, #e5e7eb ${(isMuted[audio._id] ? 0 : (volume[audio._id] || 1)) * 100}%, #e5e7eb 100%)`
                                        }}
                                      />
                                      <span className="text-sm text-gray-600 w-10">{Math.round((isMuted[audio._id] ? 0 : (volume[audio._id] || 1)) * 100)}%</span>
                                    </div>
                                  </div>
                                  <button onClick={() => setPlayingId(null)} className="mt-8 px-8 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-urdu-brown font-bold mx-auto block text-lg">بند کریں</button>
                                </div>
                              )}
                              {audio.media?.audio?.transcript && (
                                <div className="mt-8 p-5 bg-gray-50 rounded text-right text-lg text-urdu-brown">
                                  <p className="font-bold mb-2">نقل:</p>
                                  <p className="text-urdu-maroon leading-relaxed">{audio.media.audio.transcript}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {audioRecitations.map((audio) => (
                            <div key={audio._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
                              <div className="p-6 flex items-center justify-between">
                                <div className="flex-1 text-right">
                                  <h4 className="text-lg font-bold text-urdu-brown mb-2">{audio.title}</h4>
                                  {audio.description && (<p className="text-sm text-urdu-maroon mb-2">{audio.description}</p>)}
                                  {audio.tags && audio.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 justify-end mt-2">
                                      {audio.tags.slice(0, 3).map((tag, idx) => (
                                        <span key={idx} className="text-xs bg-urdu-cream px-2 py-1 rounded">{tag}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="mr-4 flex flex-col items-center gap-2">
                                  <button
                                    onClick={() => setPlayingId(audio._id)}
                                    className="bg-urdu-gold hover:bg-urdu-brown text-white p-3 rounded-full transition-colors shadow-md hover:shadow-lg"
                                  >
                                    <PlayCircle className="w-6 h-6" />
                                  </button>
                                  <span className="text-xs text-gray-500">{audio.author?.name || 'نامعلوم'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </>
                  <h3 className="text-2xl font-bold text-urdu-brown mt-10 mb-2">
                    🤖 AI حرف راوی نکالنے والا
                  </h3>
                  <p className="text-urdu-maroon">
                    اپنی شاعری داخل کریں اور AI سے حرف راوی دریافت کریں
                  </p>
                  <div className="max-w-2xl mx-auto mb-6">
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
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                      <div className="text-center mb-4">
                        <div className="bg-gradient-to-r from-urdu-gold to-urdu-brown text-white text-4xl font-bold p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto">
                          {harfRaviResult.harf_ravi}
                        </div>
                        <h4 className="text-xl font-bold text-urdu-brown mt-4">
                          حرف راوی: <span className="text-urdu-gold text-3xl">{harfRaviResult.harf_ravi}</span>
                        </h4>
                      </div>
                      {harfRaviResult.analysis && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                          <div className="bg-urdu-cream/30 p-4 rounded text-center">
                            <div className="font-bold text-urdu-brown">اعتماد</div>
                            <div className="text-2xl text-urdu-gold mt-2">
                              {(harfRaviResult.analysis.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                          <div className="bg-urdu-cream/30 p-4 rounded text-center">
                            <div className="font-bold text-urdu-brown">تعدد</div>
                            <div className="text-2xl text-urdu-gold mt-2">
                              {harfRaviResult.analysis.frequency}
                            </div>
                          </div>
                          <div className="bg-urdu-cream/30 p-4 rounded text-center">
                            <div className="font-bold text-urdu-brown">نمونہ</div>
                            <div className="text-lg text-urdu-gold mt-2">
                              {harfRaviResult.analysis.pattern}
                            </div>
                          </div>
                        </div>
                      )}
                      {harfRaviResult.all_candidates && harfRaviResult.all_candidates.length > 1 && (
                        <div className="mt-6">
                          <h5 className="font-bold text-right mb-3">دیگر ممکنہ حرف راوی:</h5>
                          <div className="flex flex-wrap gap-2 justify-end">
                            {harfRaviResult.all_candidates.slice(1, 6).map((candidate, index) => (
                              <div key={index} className="bg-gray-100 px-4 py-2 rounded-lg">
                                <span className="font-bold text-xl">{candidate.letter}</span>
                                <span className="text-sm text-gray-600 ml-2">({candidate.frequency})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
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

        {harfResults && selectedLetter && (
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
      </div>
    </div>
  );

  const renderMeters = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center mx-auto mb-4">
            <Headphones className="text-white w-8 h-8" />
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

        {!audioRecitations || audioRecitations.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-2xl mx-auto">
              <Headphones className="w-20 h-20 mx-auto mb-6 text-urdu-gold opacity-50" />
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
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  💡 <strong>نوٹ:</strong> اگر آپ کے پاس اردو شاعری کی صوتی تلاوتیں ہیں تو براہ کرم انہیں اپ لوڈ کریں
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {audioRecitations.map((audio) => (
              <div key={audio._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
                {playingId === audio._id ? (
                  <div className="p-8">
                    {/* Expanded Player UI */}
                    <h4 className="text-2xl font-bold text-urdu-brown mb-2 text-center">{audio.title}</h4>
                    {audio.description && (
                      <p className="text-md text-urdu-maroon mb-4 text-center">{audio.description}</p>
                    )}
                    {audio.tags && audio.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center mb-4">
                        {audio.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="text-xs bg-urdu-cream px-2 py-1 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                    {/* Custom Audio Player */}
                    <div className="bg-gradient-to-r from-urdu-gold/10 to-urdu-brown/10 rounded-xl p-6 border border-urdu-gold/30 mx-auto max-w-lg">
                      <audio
                        ref={el => audioRefs.current[audio._id] = el}
                        src={audio.media.audio.url}
                        onTimeUpdate={() => handleTimeUpdate(audio._id)}
                        onLoadedMetadata={() => handleLoadedMetadata(audio._id)}
                        onEnded={() => setPlayingId(null)}
                        className="hidden"
                      />
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <input
                            type="range"
                            min="0"
                            max={duration[audio._id] || 0}
                            value={currentTime[audio._id] || 0}
                            onChange={(e) => handleSeek(audio._id, parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-urdu-gold"
                            style={{
                              background: `linear-gradient(to right, #C4A747 0%, #C4A747 ${((currentTime[audio._id] || 0) / (duration[audio._id] || 1)) * 100}%, #e5e7eb ${((currentTime[audio._id] || 0) / (duration[audio._id] || 1)) * 100}%, #e5e7eb 100%)`
                            }}
                          />
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>{formatTime(currentTime[audio._id] || 0)}</span>
                            <span>{formatTime(duration[audio._id] || 0)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                          <button onClick={() => handleSkip(audio._id, -10)} className="p-2 hover:bg-urdu-gold/10 rounded-full transition-colors" title="10 سیکنڈ پیچھے">
                            <SkipBack className="w-5 h-5 text-urdu-brown" />
                          </button>
                          <button
                            onClick={() => handlePlayPause(audio._id)}
                            className="p-4 bg-urdu-gold hover:bg-urdu-brown text-white rounded-full transition-colors shadow-lg"
                            disabled={!audioRefs.current[audio._id]}
                          >
                            {playingId === audio._id ? (<Pause className="w-6 h-6" />) : (<PlayCircle className="w-6 h-6" />)}
                          </button>
                          <button onClick={() => handleSkip(audio._id, 10)} className="p-2 hover:bg-urdu-gold/10 rounded-full transition-colors" title="10 سیکنڈ آگے">
                            <SkipForward className="w-5 h-5 text-urdu-brown" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3 justify-center">
                          <button onClick={() => handleMuteToggle(audio._id)} className="p-2 hover:bg-urdu-gold/10 rounded-full transition-colors">
                            {isMuted[audio._id] || volume[audio._id] === 0 ? (<VolumeX className="w-5 h-5 text-urdu-brown" />) : (<Volume2 className="w-5 h-5 text-urdu-brown" />)}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={isMuted[audio._id] ? 0 : (volume[audio._id] || 1)}
                            onChange={(e) => handleVolumeChange(audio._id, parseFloat(e.target.value))}
                            className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-urdu-gold"
                            style={{
                              background: `linear-gradient(to right, #C4A747 0%, #C4A747 ${(isMuted[audio._id] ? 0 : (volume[audio._id] || 1)) * 100}%, #e5e7eb ${(isMuted[audio._id] ? 0 : (volume[audio._id] || 1)) * 100}%, #e5e7eb 100%)`
                            }}
                          />
                          <span className="text-xs text-gray-600 w-8">{Math.round((isMuted[audio._id] ? 0 : (volume[audio._id] || 1)) * 100)}%</span>
                        </div>
                      </div>
                      <button onClick={() => setPlayingId(null)} className="mt-6 px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-urdu-brown font-medium mx-auto block">بند کریں</button>
                    </div>
                    {audio.media?.audio?.transcript && (
                      <div className="mt-6 p-4 bg-gray-50 rounded text-right text-md text-urdu-brown">
                        <p className="font-bold mb-1">نقل:</p>
                        <p className="text-urdu-maroon leading-relaxed">{audio.media.audio.transcript}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex-1 text-right">
                      <h4 className="text-lg font-bold text-urdu-brown mb-2">{audio.title}</h4>
                      {audio.description && (<p className="text-sm text-urdu-maroon mb-2">{audio.description}</p>)}
                      {audio.tags && audio.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-end mt-2">
                          {audio.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="text-xs bg-urdu-cream px-2 py-1 rounded">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mr-4 flex flex-col items-center gap-2">
                      <button
                        onClick={() => setPlayingId(audio._id)}
                        className="bg-urdu-gold hover:bg-urdu-brown text-white p-3 rounded-full transition-colors shadow-md hover:shadow-lg"
                      >
                        <PlayCircle className="w-6 h-6" />
                      </button>
                      <span className="text-xs text-gray-500">{audio.author?.name || 'نامعلوم'}</span>
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

  const tabs = [
    { id: 'tutorials', label: 'ٹیوٹوریلز', icon: BookOpen },
    { id: 'qaafia', label: 'قافیہ تلاش (AI)', icon: Search },
    { id: 'harf-ravi', label: 'حرف راوی (AI)', icon: FileText },
    { id: 'audio', label: 'صوتی تلاوتیں', icon: Headphones },
    { id: 'meters', label: 'بحور', icon: Book }
  ];

  return (
    <div className="min-h-screen cultural-bg py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {playingId ? (
          // Full display audio player UI
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            {audioRecitations.filter(audio => audio._id === playingId).map((audio) => (
              <div key={audio._id} className="w-full flex flex-col items-center justify-center">
                <div className="max-w-xl w-full bg-white rounded-2xl shadow-2xl p-10 border border-urdu-gold/30">
                  <h4 className="text-3xl font-bold text-urdu-brown mb-4 text-center">{audio.title}</h4>
                  {audio.description && (
                    <p className="text-lg text-urdu-maroon mb-4 text-center">{audio.description}</p>
                  )}
                  {audio.tags && audio.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center mb-4">
                      {audio.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-xs bg-urdu-cream px-3 py-1 rounded-full font-semibold">{tag}</span>
                      ))}
                    </div>
                  )}
                  {audio.media?.audio?.url && (
                    <div className="bg-gradient-to-r from-urdu-gold/10 to-urdu-brown/10 rounded-xl p-8 border border-urdu-gold/30 mx-auto">
                      <audio
                        ref={el => audioRefs.current[audio._id] = el}
                        src={audio.media.audio.url}
                        onTimeUpdate={() => handleTimeUpdate(audio._id)}
                        onLoadedMetadata={() => handleLoadedMetadata(audio._id)}
                        onEnded={() => setPlayingId(null)}
                        className="hidden"
                      />
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <input
                            type="range"
                            min="0"
                            max={duration[audio._id] || 0}
                            value={currentTime[audio._id] || 0}
                            onChange={(e) => handleSeek(audio._id, parseFloat(e.target.value))}
                            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-urdu-gold"
                            style={{
                              background: `linear-gradient(to right, #C4A747 0%, #C4A747 ${((currentTime[audio._id] || 0) / (duration[audio._id] || 1)) * 100}%, #e5e7eb ${((currentTime[audio._id] || 0) / (duration[audio._id] || 1)) * 100}%, #e5e7eb 100%)`
                            }}
                          />
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>{formatTime(currentTime[audio._id] || 0)}</span>
                            <span>{formatTime(duration[audio._id] || 0)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-6">
                          <button onClick={() => handleSkip(audio._id, -10)} className="p-3 hover:bg-urdu-gold/10 rounded-full transition-colors" title="10 سیکنڈ پیچھے">
                            <SkipBack className="w-6 h-6 text-urdu-brown" />
                          </button>
                          <button onClick={() => handlePlayPause(audio._id)} className="p-6 bg-urdu-gold hover:bg-urdu-brown text-white rounded-full transition-colors shadow-lg text-center">
                            {playingId === audio._id ? (<Pause className="w-8 h-8" />) : (<PlayCircle className="w-8 h-8" />)}
                          </button>
                          <button onClick={() => handleSkip(audio._id, 10)} className="p-3 hover:bg-urdu-gold/10 rounded-full transition-colors" title="10 سیکنڈ آگے">
                            <SkipForward className="w-6 h-6 text-urdu-brown" />
                          </button>
                        </div>
                        <div className="flex items-center gap-4 justify-center">
                          <button onClick={() => handleMuteToggle(audio._id)} className="p-2 hover:bg-urdu-gold/10 rounded-full transition-colors">
                            {isMuted[audio._id] || volume[audio._id] === 0 ? (<VolumeX className="w-6 h-6 text-urdu-brown" />) : (<Volume2 className="w-6 h-6 text-urdu-brown" />)}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={isMuted[audio._id] ? 0 : (volume[audio._id] || 1)}
                            onChange={(e) => handleVolumeChange(audio._id, parseFloat(e.target.value))}
                            className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-urdu-gold"
                            style={{
                              background: `linear-gradient(to right, #C4A747 0%, #C4A747 ${(isMuted[audio._id] ? 0 : (volume[audio._id] || 1)) * 100}%, #e5e7eb ${(isMuted[audio._id] ? 0 : (volume[audio._id] || 1)) * 100}%, #e5e7eb 100%)`
                            }}
                          />
                          <span className="text-sm text-gray-600 w-10">{Math.round((isMuted[audio._id] ? 0 : (volume[audio._id] || 1)) * 100)}%</span>
                        </div>
                      </div>
                      <button onClick={() => setPlayingId(null)} className="mt-8 px-8 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-urdu-brown font-bold mx-auto block text-lg">بند کریں</button>
                    </div>
                  )}
                  {audio.media?.audio?.transcript && (
                    <div className="mt-8 p-5 bg-gray-50 rounded text-right text-lg text-urdu-brown">
                      <p className="font-bold mb-2">نقل:</p>
                      <p className="text-urdu-maroon leading-relaxed">{audio.media.audio.transcript}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-urdu-gold to-urdu-brown rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-white w-10 h-10" />
              </div>
              <h1 className="text-4xl font-bold gradient-text mb-4">
                📚 تعلیمی مرکز
              </h1>
              <p className="text-lg text-urdu-brown">
                اردو شاعری سیکھنے کے لیے جامع وسائل - AI قافیہ تلاش، حرف راوی، صوتی تلاوتیں، بحور اور ٹیوٹوریلز
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
                { icon: PlayCircle, label: "ٹیوٹوریلز", value: "25+" },
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
          </>
        )}
      </div>
    </div>
  );
};

export default Learning;
