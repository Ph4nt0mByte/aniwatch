import { Play, Star } from 'lucide-react';
import { Anime } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { jikanApi } from '../services/api';

interface AnimeCardProps {
  anime: Anime;
  rank?: number;
}

interface ModalPos {
  bottom: number;
  left: number;
}

export default function AnimeCard({ anime, rank }: AnimeCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const title = language === 'en' ? (anime.title_english || anime.title) : anime.title;
  const [isHovered, setIsHovered] = useState(false);
  const [details, setDetails] = useState<Anime | null>(null);
  const [modalPos, setModalPos] = useState<ModalPos | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computePosition = () => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const modalWidth = 240;
    const gap = 10;

    // Pin the modal's bottom to the card's vertical midpoint
    // `bottom` in fixed positioning = distance from viewport bottom
    const cardMidY = rect.top + rect.height / 2;
    const bottom = window.innerHeight - cardMidY;

    // Prefer right of card, fall back to left
    const spaceRight = window.innerWidth - rect.right;
    let left: number;

    if (spaceRight >= modalWidth + gap) {
      left = rect.right + gap;
    } else {
      left = rect.left - modalWidth - gap;
    }

    left = Math.min(Math.max(left, 8), window.innerWidth - modalWidth - 8);

    setModalPos({ bottom, left });
  };

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    hoverTimerRef.current = setTimeout(async () => {
      computePosition();
      setIsHovered(true);
      if (!anime.synopsis && !details) {
        try {
          const res = await jikanApi.getAnimeById(anime.mal_id);
          if (res?.data) setDetails(res.data);
        } catch {}
      }
    }, 350);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    leaveTimerRef.current = setTimeout(() => setIsHovered(false), 200);
  };

  const handleModalEnter = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
  };

  const handleModalLeave = () => {
    leaveTimerRef.current = setTimeout(() => setIsHovered(false), 200);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  const display = details || anime;

  const modal = (
    <AnimatePresence>
      {isHovered && modalPos && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          onMouseEnter={handleModalEnter}
          onMouseLeave={handleModalLeave}
          style={{
            position: 'fixed',
            bottom: modalPos.bottom,
            left: modalPos.left,
            width: 240,
            zIndex: 9999,
            background: 'rgba(18, 19, 21, 0.75)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
          className="border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Poster + title header */}
          <div className="flex gap-3 p-3 pb-2">
            <img
              src={anime.images.webp.large_image_url}
              alt={title}
              className="w-14 h-20 object-cover rounded-lg flex-shrink-0 shadow-lg"
            />
            <div className="flex flex-col justify-between min-w-0">
              <p className="text-xs font-bold text-white line-clamp-2 leading-snug">{title}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {display.type && (
                  <span className="text-[10px] font-bold uppercase text-primary bg-primary/15 px-1.5 py-0.5 rounded">
                    {display.type}
                  </span>
                )}
                {display.score && (
                  <span className="text-[10px] font-bold text-primary flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded">
                    <Star className="w-2.5 h-2.5 fill-current" /> {display.score}
                  </span>
                )}
              </div>
              {display.status && (
                <span className="text-[10px] text-gray-400 mt-1">{display.status}</span>
              )}
            </div>
          </div>

          {display.synopsis && (
            <div className="px-3 pb-2">
              <p className="text-[11px] text-gray-300 line-clamp-4 leading-relaxed">
                {display.synopsis}
              </p>
            </div>
          )}

          {display.genres && display.genres.length > 0 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1">
              {display.genres.slice(0, 4).map((g) => (
                <span key={g.name} className="text-[9px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                  {g.name}
                </span>
              ))}
            </div>
          )}

          <div className="px-3 pb-3 flex flex-col gap-1.5">
            <button
              onClick={() => navigate(`/watch/${anime.mal_id}/1`)}
              className="w-full flex items-center justify-center gap-2 bg-primary text-black text-xs font-bold py-2 rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Watch Now
            </button>
            <Link
              to={`/anime/${anime.mal_id}`}
              className="w-full flex items-center justify-center text-xs font-semibold text-white bg-white/10 py-2 rounded-xl hover:bg-white/15 transition-colors border border-white/10"
            >
              Details
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <motion.div
        ref={cardRef}
        whileHover={{ y: -5 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="group relative bg-bg-card rounded-lg overflow-hidden flex flex-col h-full"
      >
        <Link to={`/anime/${anime.mal_id}`} className="relative aspect-[2/3] overflow-hidden block">
          <img
            src={anime.images.webp.large_image_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />

          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {display.rating?.includes('18+') && (
              <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">18+</span>
            )}
          </div>

          <div className="absolute bottom-2 right-2 flex gap-1">
            <span className="bg-primary text-black text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
              <Play className="w-2.5 h-2.5 fill-current" /> {display.episodes || '?'}
            </span>
          </div>

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-xl">
              <Play className="w-6 h-6 text-black fill-current ml-1" />
            </div>
          </div>
        </Link>

        <div className="p-3 flex flex-col flex-grow">
          <Link to={`/anime/${anime.mal_id}`} className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors mb-2 block">
            {title}
          </Link>

          <div className="mt-auto flex items-center justify-between text-[11px] text-text-secondary">
            <div className="flex items-center gap-2">
              <span>{display.type}</span>
              <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
              <span>{display.duration?.split(' ')[0] || '?'} min</span>
            </div>
            {display.score && (
              <div className="flex items-center gap-1 text-primary">
                <Star className="w-3 h-3 fill-current" />
                <span>{display.score}</span>
              </div>
            )}
          </div>
        </div>

        {rank !== undefined && (
          <div className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 bg-black/60 rounded-full border border-white/10 z-10">
            <span className="text-sm font-black text-primary italic">#{rank}</span>
          </div>
        )}
      </motion.div>

      {createPortal(modal, document.body)}
    </>
  );
}
