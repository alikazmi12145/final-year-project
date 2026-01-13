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
  title = 'Unknown Track',
  artist = 'Unknown Artist',
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
    <div className={`bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl overflow-hidden ${className}`}>
      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {isExpanded ? (
        /* ============ EXPANDED PLAYER ============ */
        <div className="p-8">
          {/* Header with close/minimize */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white"
              title="چھوٹا کریں"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-2 rounded-full transition-all ${isFavorite ? 'text-red-500 bg-red-500/20' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                title="پسندیدہ"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white"
                title="ڈاؤن لوڈ"
              >
                <Download className="w-5 h-5" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white"
                  title="بند کریں"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Cover Art / Visualizer */}
          <div className="flex justify-center mb-8">
            <div className={`relative w-64 h-64 rounded-2xl overflow-hidden shadow-2xl ${isPlaying ? 'animate-pulse' : ''}`}>
              {coverImage ? (
                <img src={coverImage} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-500 via-orange-600 to-red-700 flex items-center justify-center">
                  <Music className="w-24 h-24 text-white/80" />
                </div>
              )}
              {isBuffering && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {/* Track Info */}
          <div className="text-center mb-8" dir="rtl">
            <h2 className="text-2xl font-bold text-white mb-2 truncate">{title}</h2>
            <p className="text-white/60 text-lg">{artist}</p>
            {description && (
              <p className="text-white/40 text-sm mt-2 line-clamp-2">{description}</p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              className="relative h-2 bg-white/20 rounded-full cursor-pointer group"
            >
              {/* Buffered indicator */}
              <div className="absolute inset-0 bg-white/10 rounded-full"></div>
              
              {/* Progress fill */}
              <div
                className="absolute h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
              
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progressPercent}% - 8px)` }}
              />
            </div>
            
            {/* Time labels */}
            <div className="flex justify-between mt-2 text-sm text-white/60">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-6 mb-8">
            {/* Loop */}
            <button
              onClick={toggleLoop}
              className={`p-3 rounded-full transition-all ${isLooping ? 'text-amber-400 bg-amber-400/20' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
              title="دہرائیں"
            >
              <Repeat className="w-5 h-5" />
            </button>

            {/* Skip Back */}
            <button
              onClick={() => skip(-10)}
              className="p-4 text-white hover:bg-white/10 rounded-full transition-all hover:scale-110"
              title="10 سیکنڈ پیچھے"
            >
              <SkipBack className="w-8 h-8" fill="currentColor" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-6 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105"
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
              className="p-4 text-white hover:bg-white/10 rounded-full transition-all hover:scale-110"
              title="10 سیکنڈ آگے"
            >
              <SkipForward className="w-8 h-8" fill="currentColor" />
            </button>

            {/* Speed Control */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className={`p-3 rounded-full transition-all ${playbackRate !== 1 ? 'text-amber-400 bg-amber-400/20' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                title="رفتار"
              >
                <span className="text-xs font-bold">{playbackRate}x</span>
              </button>
              
              {showSpeedMenu && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-700 rounded-xl shadow-xl py-2 min-w-[80px]">
                  {speedOptions.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => changeSpeed(speed)}
                      className={`w-full px-4 py-2 text-sm transition-colors ${playbackRate === speed ? 'text-amber-400 bg-amber-400/20' : 'text-white hover:bg-white/10'}`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Volume Control */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={toggleMute}
              className="p-2 text-white/60 hover:text-white transition-colors"
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
              className="w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
            />
            
            <span className="text-white/60 text-sm w-10 text-center">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>
      ) : (
        /* ============ COMPACT PLAYER ============ */
        <div className="p-4">
          <div className="flex items-center gap-4">
            {/* Mini Cover */}
            <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
              {coverImage ? (
                <img src={coverImage} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Music className="w-6 h-6 text-white/80" />
                </div>
              )}
              {isBuffering && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Track Info & Progress */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1" dir="rtl">
                <h4 className="text-white font-semibold truncate text-sm">{title}</h4>
                <span className="text-white/40 text-xs ml-2">{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
              <p className="text-white/50 text-xs mb-2 truncate" dir="rtl">{artist}</p>
              
              {/* Mini Progress Bar */}
              <div
                ref={progressRef}
                onClick={handleProgressClick}
                className="h-1.5 bg-white/20 rounded-full cursor-pointer"
              >
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Mini Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => skip(-10)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
                title="10 سیکنڈ پیچھے"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              
              <button
                onClick={togglePlay}
                className="p-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white rounded-full transition-all shadow-lg hover:scale-105"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" fill="currentColor" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                )}
              </button>
              
              <button
                onClick={() => skip(10)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
                title="10 سیکنڈ آگے"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Volume (Compact) */}
              <div className="relative">
                <button
                  onClick={toggleMute}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
                >
                  <VolumeIcon className="w-4 h-4" />
                </button>
                
                {showVolumeSlider && (
                  <div 
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-700 rounded-xl p-3 shadow-xl"
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400"
                      style={{ writingMode: 'horizontal-tb' }}
                    />
                  </div>
                )}
              </div>

              {/* Expand Button */}
              <button
                onClick={() => setIsExpanded(true)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
                title="بڑا کریں"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              {/* Loop Indicator */}
              <button
                onClick={toggleLoop}
                className={`p-2 rounded-full transition-all ${isLooping ? 'text-amber-400 bg-amber-400/20' : 'text-white/40 hover:text-white/60 hover:bg-white/10'}`}
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
        <div className="border-t border-white/10 px-8 py-4 text-center text-white/30 text-xs">
          <span>کی بورڈ شارٹ کٹس: </span>
          <span className="mx-2">Space = چلائیں/روکیں</span>
          <span className="mx-2">← → = آگے/پیچھے</span>
          <span className="mx-2">M = خاموش</span>
          <span className="mx-2">L = دہرائیں</span>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
