import { Play, Star, Calendar } from 'lucide-react';
import { Anime } from '../types';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

interface AnimeCardProps {
  anime: Anime;
  rank?: number;
}

export default function AnimeCard({ anime, rank }: AnimeCardProps) {
  const { language } = useLanguage();
  const title = language === 'en' ? (anime.title_english || anime.title) : anime.title;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="group relative bg-bg-card rounded-lg overflow-hidden flex flex-col h-full"
    >
      <Link to={`/anime/${anime.mal_id}`} className="relative aspect-[2/3] overflow-hidden block">
        <img
          src={anime.images.webp.large_image_url}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {anime.rating?.includes('18+') && (
            <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">18+</span>
          )}
        </div>

        <div className="absolute bottom-2 right-2 flex gap-1">
          <span className="bg-primary text-black text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
            <Play className="w-2.5 h-2.5 fill-current" /> {anime.episodes || '?'}
          </span>
        </div>

        {/* Hover Play Button */}
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
            <span>{anime.type}</span>
            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
            <span>{anime.duration?.split(' ')[0] || '?'} min</span>
          </div>
          {anime.score && (
            <div className="flex items-center gap-1 text-primary">
              <Star className="w-3 h-3 fill-current" />
              <span>{anime.score}</span>
            </div>
          )}
        </div>
      </div>

      {rank !== undefined && (
        <div className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 bg-black/60 rounded-full border border-white/10">
          <span className="text-sm font-black text-primary italic">#{rank}</span>
        </div>
      )}
    </motion.div>
  );
}
