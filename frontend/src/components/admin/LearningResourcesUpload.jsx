import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Music, Video, FileText, Loader, CheckCircle, AlertCircle, Trash2, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const LearningResourcesUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'audio',
    narrator: '',
    poet: '',
    transcript: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioList, setAudioList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [currentTime, setCurrentTime] = useState({});
  const [duration, setDuration] = useState({});
  const [volume, setVolume] = useState({});
  const [isMuted, setIsMuted] = useState({});
  const audioRefs = useRef({});

  // Fetch audio list on component mount
  useEffect(() => {
    fetchAudioList();
  }, []);

  const fetchAudioList = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/learning/audio`);
      console.log('Fetched audio list:', response.data);
      if (response.data.success) {
        const audios = response.data.audios || [];
        setAudioList(audios);
        // Initialize volume and mute state for each audio
        const initialVolume = {};
        const initialMute = {};
        audios.forEach(audio => {
          initialVolume[audio._id] = 1;
          initialMute[audio._id] = false;
        });
        setVolume(initialVolume);
        setIsMuted(initialMute);
      }
    } catch (error) {
      console.error('Error fetching audio list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = (audioId) => {
    const audio = audioRefs.current[audioId];
    if (!audio) return;

    if (playingId === audioId) {
      audio.pause();
      setPlayingId(null);
    } else {
      // Pause other audios
      Object.keys(audioRefs.current).forEach(id => {
        if (id !== audioId && audioRefs.current[id]) {
          audioRefs.current[id].pause();
        }
      });
      audio.play();
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

  const handleDeleteAudio = async (audioId) => {
    if (!confirm('کیا آپ واقعی اس آڈیو کو حذف کرنا چاہتے ہیں؟')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/learning/audio/${audioId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUploadStatus({
        type: 'success',
        message: 'آڈیو کامیابی سے حذف ہو گئی'
      });
      
      // Refresh the list
      fetchAudioList();
    } catch (error) {
      console.error('Delete error:', error);
      setUploadStatus({
        type: 'error',
        message: 'آڈیو حذف کرنے میں خرابی'
      });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm'];
      const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
      
      const isAudio = validAudioTypes.includes(file.type);
      const isVideo = validVideoTypes.includes(file.type);
      
      if (isAudio || isVideo) {
        setSelectedFile(file);
        setFormData(prev => ({ ...prev, category: isAudio ? 'audio' : 'video' }));
        setUploadStatus(null);
      } else {
        setUploadStatus({
          type: 'error',
          message: 'براہ کرم صرف آڈیو (MP3, WAV, OGG) یا ویڈیو (MP4, WEBM) فائلز اپ لوڈ کریں'
        });
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setUploadStatus({
        type: 'error',
        message: 'براہ کرم فائل منتخب کریں'
      });
      return;
    }

    if (!formData.title.trim()) {
      setUploadStatus({
        type: 'error',
        message: 'براہ کرم عنوان درج کریں'
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus(null);

    const uploadFormData = new FormData();
    uploadFormData.append('audio', selectedFile);
    uploadFormData.append('title', formData.title);
    uploadFormData.append('description', formData.description);
    uploadFormData.append('category', formData.category);
    uploadFormData.append('narrator', formData.narrator);
    uploadFormData.append('poet', formData.poet);
    uploadFormData.append('transcript', formData.transcript);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setUploadStatus({
          type: 'error',
          message: 'لاگ ان کی ضرورت ہے / Please login first'
        });
        return;
      }
      
      console.log('Token found:', token ? 'Yes' : 'No');
      console.log('Uploading to:', `${API_BASE_URL}/learning/audio/upload`);
      
      const response = await axios.post(
        `${API_BASE_URL}/learning/audio/upload`,
        uploadFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      );

      setUploadStatus({
        type: 'success',
        message: 'فائل کامیابی سے اپ لوڈ ہو گئی!'
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'audio',
        narrator: '',
        poet: '',
        transcript: ''
      });
      setSelectedFile(null);
      setUploadProgress(0);

      // Clear the file input
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';

      // Refresh the audio list
      fetchAudioList();

    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'اپ لوڈ میں خرابی آ گئی';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setUploadStatus({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    const fileInput = document.getElementById('file-upload');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-urdu-brown mb-2 text-right">
          📚 تعلیمی وسائل اپ لوڈ کریں
        </h2>
        <p className="text-urdu-maroon text-right">
          صوتی تلاوتیں، ویڈیو ٹیوٹوریلز اور تعلیمی مواد اپ لوڈ کریں
        </p>
      </div>

      <form onSubmit={handleUpload} className="space-y-6">
        {/* File Upload Area */}
        <div className="border-2 border-dashed border-urdu-gold rounded-lg p-8 text-center hover:bg-urdu-cream/10 transition-colors">
          <input
            type="file"
            id="file-upload"
            accept="audio/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            {selectedFile ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-8 h-8" />
                  <span className="text-lg font-medium">{selectedFile.name}</span>
                </div>
                <p className="text-sm text-gray-600">
                  سائز: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 mx-auto"
                >
                  <X className="w-4 h-4" />
                  فائل ہٹائیں
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-16 h-16 text-urdu-gold mb-4 mx-auto" />
                <p className="text-lg font-medium text-urdu-brown mb-2">
                  فائل منتخب کرنے کے لیے یہاں کلک کریں
                </p>
                <p className="text-sm text-gray-600">
                  MP3, WAV, OGG (آڈیو) یا MP4, WEBM (ویڈیو)
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  زیادہ سے زیادہ سائز: 50MB
                </p>
              </>
            )}
          </label>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>اپ لوڈ ہو رہا ہے...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-urdu-gold h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status Message */}
        {uploadStatus && (
          <div className={`p-4 rounded-lg flex items-start gap-3 ${
            uploadStatus.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-right flex-1">{uploadStatus.message}</p>
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-right" dir="rtl">
            <label className="block text-urdu-brown font-medium mb-2">
              عنوان <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="مثلاً: میر تقی میر کی غزل"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent"
              required
              dir="rtl"
            />
          </div>

          <div className="text-right" dir="rtl">
            <label className="block text-urdu-brown font-medium mb-2">
              راوی / استاد کا نام
            </label>
            <input
              type="text"
              name="narrator"
              value={formData.narrator}
              onChange={handleInputChange}
              placeholder="مثلاً: پروفیسر احمد علی"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent"
              dir="rtl"
            />
          </div>

          <div className="text-right" dir="rtl">
            <label className="block text-urdu-brown font-medium mb-2">
              شاعر کا نام
            </label>
            <input
              type="text"
              name="poet"
              value={formData.poet}
              onChange={handleInputChange}
              placeholder="مثلاً: میر تقی میر، غالب"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent"
              dir="rtl"
            />
          </div>

          <div className="text-right" dir="rtl">
            <label className="block text-urdu-brown font-medium mb-2">
              قسم
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent"
              dir="rtl"
            >
              <option value="audio">صوتی تلاوت</option>
              <option value="video">ویڈیو ٹیوٹوریل</option>
              <option value="tutorial">تعلیمی مواد</option>
            </select>
          </div>
        </div>

        <div className="text-right" dir="rtl">
          <label className="block text-urdu-brown font-medium mb-2">
            تفصیل
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="اس تلاوت یا ویڈیو کی تفصیل لکھیں..."
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent"
            dir="rtl"
          />
        </div>

        <div className="text-right" dir="rtl">
          <label className="block text-urdu-brown font-medium mb-2">
            نقل / شاعری کا متن
          </label>
          <textarea
            name="transcript"
            value={formData.transcript}
            onChange={handleInputChange}
            placeholder="شاعری کے اشعار یہاں لکھیں..."
            rows="5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent font-urdu"
            dir="rtl"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="bg-urdu-gold hover:bg-urdu-brown text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                اپ لوڈ ہو رہا ہے...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                اپ لوڈ کریں
              </>
            )}
          </button>
        </div>
      </form>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg text-right" dir="rtl">
        <h3 className="font-bold text-urdu-brown mb-2 flex items-center justify-end gap-2">
          <FileText className="w-5 h-5" />
          ہدایات
        </h3>
        <ul className="space-y-2 text-sm text-urdu-maroon">
          <li className="flex items-start gap-2 justify-end">
            <span>• صرف ایڈمن فائلز اپ لوڈ کر سکتے ہیں</span>
          </li>
          <li className="flex items-start gap-2 justify-end">
            <span>• آڈیو: MP3، WAV، OGG فارمیٹس سپورٹ ہیں</span>
          </li>
          <li className="flex items-start gap-2 justify-end">
            <span>• ویڈیو: MP4، WEBM فارمیٹس سپورٹ ہیں</span>
          </li>
          <li className="flex items-start gap-2 justify-end">
            <span>• زیادہ سے زیادہ فائل سائز: 50MB</span>
          </li>
          <li className="flex items-start gap-2 justify-end">
            <span>• فائلز Cloudinary پر محفوظ ہوں گی</span>
          </li>
          <li className="flex items-start gap-2 justify-end">
            <span>• اپ لوڈ کے بعد فائلز تعلیمی مرکز میں نظر آئیں گی</span>
          </li>
        </ul>
      </div>

      {/* Uploaded Audio List */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-urdu-brown mb-4 text-right flex items-center justify-end gap-2">
          <Music className="w-6 h-6" />
          اپ لوڈ شدہ آڈیو فائلز ({audioList.length})
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <Loader className="w-8 h-8 animate-spin mx-auto text-urdu-gold" />
            <p className="text-gray-600 mt-2">لوڈ ہو رہا ہے...</p>
          </div>
        ) : audioList.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Music className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600">ابھی تک کوئی آڈیو فائل اپ لوڈ نہیں ہوئی</p>
          </div>
        ) : (
          <div className="space-y-4">
            {audioList.map((audio) => (
              <div
                key={audio._id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex flex-col gap-4">
                  {/* Audio Info */}
                  <div className="text-right" dir="rtl">
                    <div className="flex items-start justify-between">
                      <button
                        onClick={() => handleDeleteAudio(audio._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف کریں"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <div className="flex-1">
                        <h4 className="font-bold text-urdu-brown text-lg mb-1">
                          {audio.title}
                        </h4>
                        {audio.description && (
                          <p className="text-gray-600 text-sm mb-2">
                            {audio.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 justify-end mb-2">
                          {audio.tags?.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-urdu-gold/10 text-urdu-brown text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        {audio.author?.name && (
                          <p className="text-sm text-gray-500">
                            اپ لوڈ کردہ: {audio.author.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Custom Audio Player */}
                  {audio.media?.audio?.url && (
                    <div className="bg-gradient-to-r from-urdu-gold/5 to-urdu-brown/5 rounded-lg p-4 border border-urdu-gold/20">
                      {/* Hidden Audio Element */}
                      <audio
                        ref={el => audioRefs.current[audio._id] = el}
                        src={audio.media.audio.url}
                        onTimeUpdate={() => handleTimeUpdate(audio._id)}
                        onLoadedMetadata={() => handleLoadedMetadata(audio._id)}
                        onEnded={() => setPlayingId(null)}
                        className="hidden"
                      />

                      {/* Custom Controls */}
                      <div className="space-y-3">
                        {/* Progress Bar */}
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

                        {/* Control Buttons */}
                        <div className="flex items-center justify-center gap-4">
                          {/* Skip Back */}
                          <button
                            onClick={() => handleSkip(audio._id, -10)}
                            className="p-2 hover:bg-urdu-gold/10 rounded-full transition-colors"
                            title="10 سیکنڈ پیچھے"
                          >
                            <SkipBack className="w-5 h-5 text-urdu-brown" />
                          </button>

                          {/* Play/Pause */}
                          <button
                            onClick={() => handlePlayPause(audio._id)}
                            className="p-4 bg-urdu-gold hover:bg-urdu-brown text-white rounded-full transition-colors shadow-lg"
                          >
                            {playingId === audio._id ? (
                              <Pause className="w-6 h-6" />
                            ) : (
                              <Play className="w-6 h-6" />
                            )}
                          </button>

                          {/* Skip Forward */}
                          <button
                            onClick={() => handleSkip(audio._id, 10)}
                            className="p-2 hover:bg-urdu-gold/10 rounded-full transition-colors"
                            title="10 سیکنڈ آگے"
                          >
                            <SkipForward className="w-5 h-5 text-urdu-brown" />
                          </button>
                        </div>

                        {/* Volume Control */}
                        <div className="flex items-center gap-3 justify-center">
                          <button
                            onClick={() => handleMuteToggle(audio._id)}
                            className="p-2 hover:bg-urdu-gold/10 rounded-full transition-colors"
                          >
                            {isMuted[audio._id] || volume[audio._id] === 0 ? (
                              <VolumeX className="w-5 h-5 text-urdu-brown" />
                            ) : (
                              <Volume2 className="w-5 h-5 text-urdu-brown" />
                            )}
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
                          <span className="text-xs text-gray-600 w-8">
                            {Math.round((isMuted[audio._id] ? 0 : (volume[audio._id] || 1)) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningResourcesUpload;
