import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Volume1,
  Repeat,
  Shuffle,
  Download,
  Heart,
  Share2,
  MoreHorizontal,
  X,
  Maximize2,
  Minimize2,
  Music,
  Clock,
  Headphones
} from 'lucide-react';

/**
 * Professional Audio Player Component
 * Features: Play/Pause, Skip, Volume, Progress, Loop, Speed Control, Download
 */
const AudioPlayer = ({ 
  src, 
  title = 'نامعلوم تلاوت',
  artist = 'نامعلوم شاعر',
  description = '',
  coverImage = null,
  onClose = null,
  showExpanded = false,
  className = '',
  accentColor = 'urdu-gold'
}) => {
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isExpanded, setIsExpanded] = useState(showExpanded);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Format time in MM:SS
  const formatTime = useCallback((time) => {
    if (isNaN(time) || time === Infinity) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Calculate progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Playback failed:', err);
      });
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Skip forward/backward
  const skip = useCallback((seconds) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
  }, [duration]);

  // Handle progress bar click
  const handleProgressClick = useCallback((e) => {
    if (!progressRef.current || !audioRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, newTime));
  }, [duration]);

  // Volume control
  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
  }, [isMuted]);

  // Toggle loop
  const toggleLoop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.loop = !isLooping;
    setIsLooping(!isLooping);
  }, [isLooping]);

  // Change playback speed
  const changeSpeed = useCallback((rate) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  }, []);

  // Download audio
  const handleDownload = useCallback(() => {
    if (!src) return;
    const link = document.createElement('a');
    link.href = src;
    link.download = `${title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [src, title]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [isLooping]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
          skip(-5);
          break;
        case 'arrowright':
          skip(5);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange({ target: { value: Math.min(1, volume + 0.1) } });
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange({ target: { value: Math.max(0, volume - 0.1) } });
          break;
        case 'm':
          toggleMute();
          break;
        case 'l':
          toggleLoop();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePlay, skip, handleVolumeChange, toggleMute, toggleLoop, volume]);

  // Volume icon based on level
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // Speed options
  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className={`relative bg-gradient-to-br from-urdu-cream via-white to-amber-50 rounded-2xl shadow-xl overflow-hidden border border-urdu-gold/30 ${className}`}>
      {/* Classical corner brackets */}
      <span className="pointer-events-none absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-urdu-gold/60 rounded-tl-md z-10"></span>
      <span className="pointer-events-none absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-urdu-gold/60 rounded-tr-md z-10"></span>
      <span className="pointer-events-none absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-urdu-gold/60 rounded-bl-md z-10"></span>
      <span className="pointer-events-none absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-urdu-gold/60 rounded-br-md z-10"></span>
      {/* Floating ornament blobs */}
      <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 bg-urdu-gold/15 rounded-full blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-8 -left-8 w-40 h-40 bg-amber-200/30 rounded-full blur-3xl"></div>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {isExpanded ? (
        /* ============ EXPANDED PLAYER ============ */
        <div className="p-8 relative">
          {/* Header with close/minimize */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 hover:bg-urdu-gold/15 rounded-full transition-all text-urdu-brown hover:text-urdu-maroon"
              title="چھوٹا کریں"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-2 rounded-full transition-all ${isFavorite ? 'text-red-600 bg-red-100' : 'text-urdu-brown hover:text-urdu-maroon hover:bg-urdu-gold/15'}`}
                title="پسندیدہ"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-urdu-gold/15 rounded-full transition-all text-urdu-brown hover:text-urdu-maroon"
                title="ڈاؤن لوڈ"
              >
                <Download className="w-5 h-5" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-urdu-gold/15 rounded-full transition-all text-urdu-brown hover:text-urdu-maroon"
                  title="بند کریں"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Cover Art / Visualizer */}
          <div className="flex justify-center mb-6 relative z-10">
            <div className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-urdu-gold/40 ${isPlaying ? 'animate-pulse' : ''}`}>
              {coverImage ? (
                <img src={coverImage} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-urdu-gold via-amber-500 to-urdu-maroon flex items-center justify-center">
                  <Music className="w-24 h-24 text-white/90" />
                </div>
              )}
              {isBuffering && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {/* Ornamental divider */}
          <div className="flex justify-center items-center mb-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-urdu-gold"></div>
            <span className="mx-3 text-urdu-gold text-lg">✦</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-urdu-gold"></div>
          </div>

          {/* Track Info */}
          <div className="text-center mb-6 relative z-10" dir="rtl">
            <h2 className="text-2xl font-bold text-urdu-maroon mb-2 truncate nastaleeq-heading">{title}</h2>
            <p className="text-urdu-brown text-lg nastaleeq-primary">{artist}</p>
            {description && (
              <p className="text-urdu-brown/70 text-sm mt-2 line-clamp-2 urdu-body">{description}</p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6 relative z-10">
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              className="relative h-2 bg-urdu-gold/20 rounded-full cursor-pointer group"
            >
              {/* Buffered indicator */}
              <div className="absolute inset-0 bg-urdu-gold/10 rounded-full"></div>
              
              {/* Progress fill */}
              <div
                className="absolute h-full bg-gradient-to-r from-urdu-gold via-amber-500 to-urdu-maroon rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
              
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-urdu-maroon border-2 border-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progressPercent}% - 8px)` }}
              />
            </div>
            
            {/* Time labels */}
            <div className="flex justify-between mt-2 text-sm text-urdu-brown font-semibold">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-6 mb-6 relative z-10">
            {/* Loop */}
            <button
              onClick={toggleLoop}
              className={`p-3 rounded-full transition-all ${isLooping ? 'text-urdu-maroon bg-urdu-gold/30 ring-2 ring-urdu-gold/40' : 'text-urdu-brown hover:text-urdu-maroon hover:bg-urdu-gold/15'}`}
              title="دہرائیں"
            >
              <Repeat className="w-5 h-5" />
            </button>

            {/* Skip Back */}
            <button
              onClick={() => skip(-10)}
              className="p-4 text-urdu-maroon hover:bg-urdu-gold/15 rounded-full transition-all hover:scale-110"
              title="10 سیکنڈ پیچھے"
            >
              <SkipBack className="w-8 h-8" fill="currentColor" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-6 bg-gradient-to-br from-urdu-gold via-amber-500 to-urdu-maroon hover:from-amber-500 hover:to-urdu-maroon text-white rounded-full transition-all shadow-xl hover:shadow-2xl hover:scale-105 ring-4 ring-urdu-gold/30"
            >
              {isPlaying ? (
                <Pause className="w-10 h-10" fill="currentColor" />
              ) : (
                <Play className="w-10 h-10 ml-1" fill="currentColor" />
              )}
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => skip(10)}
              className="p-4 text-urdu-maroon hover:bg-urdu-gold/15 rounded-full transition-all hover:scale-110"
              title="10 سیکنڈ آگے"
            >
              <SkipForward className="w-8 h-8" fill="currentColor" />
            </button>

            {/* Speed Control */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className={`p-3 rounded-full transition-all ${playbackRate !== 1 ? 'text-urdu-maroon bg-urdu-gold/30 ring-2 ring-urdu-gold/40' : 'text-urdu-brown hover:text-urdu-maroon hover:bg-urdu-gold/15'}`}
                title="رفتار"
              >
                <span className="text-xs font-bold">{playbackRate}x</span>
              </button>
              
              {showSpeedMenu && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-urdu-gold/40 rounded-xl shadow-xl py-2 min-w-[80px] z-20">
                  {speedOptions.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => changeSpeed(speed)}
                      className={`w-full px-4 py-2 text-sm transition-colors ${playbackRate === speed ? 'text-urdu-maroon bg-urdu-gold/20 font-bold' : 'text-urdu-brown hover:bg-urdu-cream'}`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Volume Control */}
          <div className="flex items-center justify-center gap-4 relative z-10">
            <button
              onClick={toggleMute}
              className="p-2 text-urdu-brown hover:text-urdu-maroon transition-colors"
            >
              <VolumeIcon className="w-6 h-6" />
            </button>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-32 h-1.5 bg-urdu-gold/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-urdu-maroon [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
            />
            
            <span className="text-urdu-brown text-sm w-10 text-center font-semibold">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>
      ) : (
        /* ============ COMPACT PLAYER ============ */
        <div className="p-4 relative">
          <div className="flex items-center gap-4 relative z-10">
            {/* Mini Cover */}
            <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-lg ring-2 ring-urdu-gold/40">
              {coverImage ? (
                <img src={coverImage} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-urdu-gold to-urdu-maroon flex items-center justify-center">
                  <Music className="w-6 h-6 text-white/90" />
                </div>
              )}
              {isBuffering && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Track Info & Progress */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1" dir="rtl">
                <h4 className="text-urdu-maroon font-semibold truncate text-sm nastaleeq-primary">{title}</h4>
                <span className="text-urdu-brown/70 text-xs ml-2 font-semibold">{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
              <p className="text-urdu-brown text-xs mb-2 truncate nastaleeq-primary" dir="rtl">{artist}</p>
              
              {/* Mini Progress Bar */}
              <div
                ref={progressRef}
                onClick={handleProgressClick}
                className="h-1.5 bg-urdu-gold/20 rounded-full cursor-pointer"
              >
                <div
                  className="h-full bg-gradient-to-r from-urdu-gold via-amber-500 to-urdu-maroon rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Mini Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => skip(-10)}
                className="p-2 text-urdu-brown hover:text-urdu-maroon hover:bg-urdu-gold/15 rounded-full transition-all"
                title="10 سیکنڈ پیچھے"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              
              <button
                onClick={togglePlay}
                className="p-3 bg-gradient-to-br from-urdu-gold to-urdu-maroon hover:from-amber-500 hover:to-red-800 text-white rounded-full transition-all shadow-lg hover:scale-105 ring-2 ring-urdu-gold/30"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" fill="currentColor" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                )}
              </button>
              
              <button
                onClick={() => skip(10)}
                className="p-2 text-urdu-brown hover:text-urdu-maroon hover:bg-urdu-gold/15 rounded-full transition-all"
                title="10 سیکنڈ آگے"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Volume (Compact) */}
              <div className="relative">
                <button
                  onClick={toggleMute}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  className="p-2 text-urdu-brown hover:text-urdu-maroon hover:bg-urdu-gold/15 rounded-full transition-all"
                >
                  <VolumeIcon className="w-4 h-4" />
                </button>
                
                {showVolumeSlider && (
                  <div 
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-urdu-gold/40 rounded-xl p-3 shadow-xl z-20"
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-24 h-1 bg-urdu-gold/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-urdu-maroon"
                      style={{ writingMode: 'horizontal-tb' }}
                    />
                  </div>
                )}
              </div>

              {/* Expand Button */}
              <button
                onClick={() => setIsExpanded(true)}
                className="p-2 text-urdu-brown hover:text-urdu-maroon hover:bg-urdu-gold/15 rounded-full transition-all"
                title="بڑا کریں"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              {/* Loop Indicator */}
              <button
                onClick={toggleLoop}
                className={`p-2 rounded-full transition-all ${isLooping ? 'text-urdu-maroon bg-urdu-gold/30 ring-2 ring-urdu-gold/40' : 'text-urdu-brown hover:text-urdu-maroon hover:bg-urdu-gold/15'}`}
                title="دہرائیں"
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      {isExpanded && (
        <div className="border-t border-urdu-gold/30 px-8 py-4 text-center text-urdu-brown/80 text-xs bg-gradient-to-r from-urdu-cream/40 via-white/60 to-urdu-cream/40 relative z-10">
          <span className="font-semibold text-urdu-maroon nastaleeq-primary">کی بورڈ شارٹ کٹس: </span>
          <span className="mx-2 nastaleeq-primary"><kbd className="px-1.5 py-0.5 bg-white border border-urdu-gold/40 rounded text-urdu-maroon">Space</kbd> چلائیں / روکیں</span>
          <span className="mx-2 nastaleeq-primary"><kbd className="px-1.5 py-0.5 bg-white border border-urdu-gold/40 rounded text-urdu-maroon">← →</kbd> آگے / پیچھے</span>
          <span className="mx-2 nastaleeq-primary"><kbd className="px-1.5 py-0.5 bg-white border border-urdu-gold/40 rounded text-urdu-maroon">M</kbd> خاموش</span>
          <span className="mx-2 nastaleeq-primary"><kbd className="px-1.5 py-0.5 bg-white border border-urdu-gold/40 rounded text-urdu-maroon">L</kbd> دہرائیں</span>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
