import { useEffect, useState, useCallback, useRef } from 'react';
import { Play, Info, ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Anime } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

interface SpotlightProps {
  animeList: Anime[];
}

export default function Spotlight({ animeList }: SpotlightProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % animeList.length);
    }, 8000);
  }, [animeList.length]);

  useEffect(() => {
    resetTimer();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [resetTimer]);

  const go = useCallback((dir: 'prev' | 'next') => {
    setCurrentIndex((prev) =>
      dir === 'next' ? (prev + 1) % animeList.length : (prev - 1 + animeList.length) % animeList.length
    );
    resetTimer();
  }, [animeList.length, resetTimer]);

  const current = animeList[currentIndex];
  if (!current) return null;

  return (
    <div
      className="relative h-[500px] md:h-[680px] w-full overflow-hidden mb-12"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current.mal_id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <img 
              src={current.images.webp.large_image_url} 
              alt="" 
              className="w-full h-full object-cover blur-[2px] scale-105"
            />
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#202125] via-[#202125]/80 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#202125] via-transparent to-transparent"></div>
          </div>

          {/* Content */}
          <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-center gap-4 py-12">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col gap-4 max-w-2xl"
            >
              <div className="flex items-center gap-3 text-primary font-bold text-sm">
                <span>#{(currentIndex + 1)} Spotlight</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight">
                {language === 'en' ? (current.title_english || current.title) : current.title}
              </h1>

              <div className="flex items-center gap-4 text-sm text-gray-300">
                <span className="flex items-center gap-1.5 ">
                   <Play className="w-4 h-4 fill-current" /> {current.type}
                </span>
                <span className="flex items-center gap-1.5">
                   <Clock className="w-4 h-4" /> {current.duration?.split(' ')[0] || '?'} min
                </span>
                <span className="flex items-center gap-1.5">
                   <Calendar className="w-4 h-4" /> {current.rating?.split(' ')[0] || 'PG-13'}
                </span>
                <span className="bg-primary text-black px-1.5 py-0.5 rounded text-[10px] font-bold">HD</span>
              </div>

              <p className="text-gray-300 line-clamp-3 text-sm md:text-base leading-relaxed">
                {current.synopsis || "No description available."}
              </p>

              <div className="flex items-center gap-3 mt-4">
                <button 
                  onClick={() => navigate(`/watch/${current.mal_id}/1`)}
                  className="bg-primary text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:brightness-110 transition-all text-sm"
                >
                  <Play className="w-5 h-5 fill-current" /> Watch Now
                </button>
                <button 
                  onClick={() => navigate(`/anime/${current.mal_id}`)}
                  className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all text-sm"
                >
                  Detail <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute bottom-12 right-4 md:right-12 flex gap-3 z-10">
        <button 
          onClick={() => go('prev')}
          className="p-3 bg-white/5 hover:bg-primary hover:text-black rounded-lg transition-all border border-white/5"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={() => go('next')}
          className="p-3 bg-white/5 hover:bg-primary hover:text-black rounded-lg transition-all border border-white/5"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
