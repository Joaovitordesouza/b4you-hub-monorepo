
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  src?: string;
  duration?: string; // ex: "0:45"
  isMe?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, duration: initialDuration = "0:00", isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Gera barras de onda estéticas e aleatórias (simulando visualização real)
  const bars = useMemo(() => Array.from({ length: 36 }, () => Math.random() * 0.6 + 0.2), []);

  useEffect(() => {
    if (src) {
        const audio = new Audio(src);
        audioRef.current = audio;

        // Tenta parsear a duração inicial se o metadado do áudio demorar
        if (initialDuration && initialDuration !== "0:00") {
            const parts = initialDuration.split(':');
            if (parts.length === 2) {
                setDuration(parseInt(parts[0]) * 60 + parseInt(parts[1]));
            }
        }

        audio.addEventListener('loadedmetadata', () => {
            if(audio.duration !== Infinity && !isNaN(audio.duration)) {
                setDuration(audio.duration);
            }
        });

        audio.addEventListener('timeupdate', () => {
            setCurrentTime(audio.currentTime);
        });

        audio.addEventListener('ended', () => {
            setIsPlaying(false);
            setCurrentTime(0);
            audio.currentTime = 0;
        });

        return () => {
            audio.pause();
            audio.src = '';
        };
    }
  }, [src]);

  const togglePlay = () => {
      if (!audioRef.current) return;
      if (isPlaying) audioRef.current.pause();
      else {
          audioRef.current.play().catch(e => console.error("Erro playback:", e));
      }
      setIsPlaying(!isPlaying);
  };

  const changeSpeed = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!audioRef.current) return;
      const rates = [1, 1.5, 2];
      const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
      const nextRate = rates[nextIndex];
      audioRef.current.playbackRate = nextRate;
      setPlaybackRate(nextRate);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!audioRef.current || !progressRef.current || !duration) return;
      const rect = progressRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      audioRef.current.currentTime = pct * duration;
      setCurrentTime(audioRef.current.currentTime);
  };

  const formatTime = (time: number) => {
      if (isNaN(time)) return "0:00";
      const m = Math.floor(time / 60);
      const s = Math.floor(time % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Tema Dinâmico (Elite UI)
  const theme = isMe ? {
      btnBg: 'bg-white/20 hover:bg-white/30 text-white border-white/20',
      wavePlayed: 'bg-white',
      waveUnplayed: 'bg-[#0f5c4e]', // Tom mais escuro do verde para contraste sutil
      textMain: 'text-white',
      textSec: 'text-green-100/80',
      speedBtn: 'bg-black/10 text-white hover:bg-black/20'
  } : {
      btnBg: 'bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-200/50',
      wavePlayed: 'bg-brand-500',
      waveUnplayed: 'bg-gray-200',
      textMain: 'text-gray-700',
      textSec: 'text-gray-400',
      speedBtn: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  };

  return (
      <div className={`flex items-center gap-3 p-1.5 min-w-[260px] select-none rounded-xl transition-colors`}>
          
          {/* Play/Pause Button */}
          <button 
              onClick={togglePlay}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 backdrop-blur-sm ${theme.btnBg}`}
          >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>

          {/* Waveform & Time */}
          <div className="flex-1 flex flex-col justify-center gap-1.5 cursor-pointer group" ref={progressRef} onClick={handleSeek}>
              <div className="flex items-center gap-[2px] h-8 relative">
                  {/* Invisible Overlay for easier clicking */}
                  <div className="absolute inset-0 z-10"></div>
                  
                  {bars.map((height, i) => {
                      const pct = (i / bars.length);
                      const currentPct = duration ? currentTime / duration : 0;
                      const isPlayed = pct <= currentPct;
                      
                      return (
                          <div 
                              key={i}
                              className={`w-1 rounded-full transition-all duration-150 ease-out ${isPlayed ? theme.wavePlayed : theme.waveUnplayed}`}
                              style={{ 
                                  height: `${Math.max(20, height * 100)}%`,
                                  opacity: isPlayed ? 1 : 0.6,
                                  transform: isPlaying && isPlayed ? 'scaleY(1.1)' : 'scaleY(1)'
                              }}
                          />
                      );
                  })}
              </div>
              <div className={`flex justify-between text-[10px] font-medium font-mono px-0.5 leading-none`}>
                  <span className={theme.textMain}>{formatTime(currentTime)}</span>
                  <span className={theme.textSec}>{formatTime(duration) || initialDuration}</span>
              </div>
          </div>

          {/* Speed Toggle */}
          <button 
              onClick={changeSpeed}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all min-w-[36px] text-center ${theme.speedBtn}`}
          >
              {playbackRate}x
          </button>
      </div>
  );
};
