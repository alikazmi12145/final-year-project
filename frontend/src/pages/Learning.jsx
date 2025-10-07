import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import api from '../services/api';
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
  Star
} from "lucide-react";

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
  }, []);

  const fetchLearningResources = async () => {
    try {
      setLoading(true);
      const response = await api.get('/learning/resources');
      setResources(response.data.resources || []);
    } catch (error) {
      console.error('Error fetching learning resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchQaafia = async () => {
    if (!searchWord.trim()) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/learning/qaafia/${searchWord}?advanced=true`);
      setQaafiResults(response.data);
    } catch (error) {
      console.error('Error searching qaafia:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHarfRavi = async (letter = '') => {
    try {
      const response = await api.get(`/learning/harf-ravi/${letter}`);
      setHarfResults(letter ? response.data.info : response.data.letters);
    } catch (error) {
      console.error('Error fetching harf-ravi:', error);
    }
  };

  const fetchMeters = async () => {
    try {
      const response = await api.get('/learning/meters');
      setMeterResults(response.data.meters || []);
    } catch (error) {
      console.error('Error fetching meters:', error);
    }
  };

  const analyzeWord = async () => {
    if (!searchWord.trim()) return;

    try {
      setLoading(true);
      const response = await api.post('/learning/analyze-word', {
        word: searchWord
      });
      setWordAnalysis(response.data.analysis);
    } catch (error) {
      console.error('Error analyzing word:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLetterClick = (letter) => {
    setSelectedLetter(letter);
    fetchHarfRavi(letter);
  };

  const renderTutorials = () => {
    const tutorials = resources.filter(r => r.category === 'tutorial');
    
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
            
            <button className="btn-primary w-full">
              شروع کریں
            </button>
          </div>
        ))}
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
              className="input-field flex-1 text-right"
              dir="rtl"
            />
            <button
              onClick={searchQaafia}
              disabled={loading}
              className="btn-primary px-6"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'تلاش کریں'}
            </button>
          </div>
        </div>

        <div className="text-center mb-6">
          <button
            onClick={analyzeWord}
            disabled={loading || !searchWord}
            className="bg-cultural-teal hover:bg-cultural-emerald text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            لفظ کا تجزیہ کریں
          </button>
        </div>

        {qaafiResults && (
          <div className="space-y-4">
            <div className="bg-urdu-cream/30 p-6 rounded-lg">
              <h4 className="font-bold text-lg mb-4 text-right text-urdu-brown">
                "{qaafiResults.word}" کے ہم قافیہ الفاظ:
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {qaafiResults.rhymes.map((rhyme, index) => (
                  <div
                    key={index}
                    className="bg-white p-3 rounded-lg border text-center hover:bg-urdu-gold hover:text-white transition-colors cursor-pointer shadow-sm"
                  >
                    {rhyme}
                  </div>
                ))}
              </div>
            </div>

            {qaafiResults.analysis && (
              <div className="bg-blue-50 p-6 rounded-lg">
                <h5 className="font-bold mb-4 text-right text-urdu-brown">تفصیلی تجزیہ:</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                  <div className="space-y-2">
                    <p><span className="font-medium">حروف کی تعداد:</span> {qaafiResults.analysis.wordLength}</p>
                    <p><span className="font-medium">مصوتے:</span> {qaafiResults.analysis.syllablePattern}</p>
                  </div>
                  <div className="space-y-2">
                    <p><span className="font-medium">مناسب بحر:</span></p>
                    <div className="text-sm text-urdu-gold">
                      {qaafiResults.analysis.meterSuggestions?.map(m => m.name).join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {wordAnalysis && (
          <div className="bg-gray-50 p-6 rounded-lg mt-4">
            <h5 className="font-bold mb-4 text-right text-urdu-brown">مکمل تجزیہ:</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
              <div>
                <h6 className="font-bold mb-2">بنیادی معلومات:</h6>
                <div className="space-y-1 text-sm">
                  <p>لفظ: <span className="font-medium">{wordAnalysis.word}</span></p>
                  <p>لمبائی: <span className="font-medium">{wordAnalysis.length} حروف</span></p>
                  <p>مصوتے: <span className="font-medium">{wordAnalysis.syllables}</span></p>
                  <p>مشکل درجہ: <span className="font-medium">{wordAnalysis.difficulty}</span></p>
                </div>
              </div>
              <div>
                <h6 className="font-bold mb-2">شاعری میں استعمال:</h6>
                <div className="space-y-2">
                  {wordAnalysis.poetryUsage?.map((usage, index) => (
                    <div key={index} className="text-sm bg-white p-2 rounded">
                      <span className="font-medium">{usage.title}</span>
                      <br />
                      <span className="text-urdu-maroon">از: {usage.author}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-urdu-cream/30 rounded-lg">
          <p className="text-sm text-urdu-brown text-center">
            مثال: "دل" داخل کریں اور ہم قافیہ الفاظ جیسے "گل"، "مل"، "قل" دیکھیں
          </p>
        </div>
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

  const tabs = [
    { id: 'tutorials', label: 'ٹیوٹوریلز', icon: BookOpen },
    { id: 'qaafia', label: 'قافیہ تلاش', icon: Search },
    { id: 'harf-ravi', label: 'حرف راوی', icon: FileText },
    { id: 'meters', label: 'بحور', icon: Headphones }
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
            اردو شاعری سیکھنے کے لیے جامع وسائل - قافیہ تلاش، حرف راوی، بحور اور ٹیوٹوریلز
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
              {activeTab === 'meters' && renderMeters()}
            </>
          )}
        </div>

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
      </div>
    </div>
  );
};

export default Learning;
