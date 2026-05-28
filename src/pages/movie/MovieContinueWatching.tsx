import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/errorHandlers';
import { 
  Play, 
  Clock, 
  Heart, 
  Eye,
  Film,
  Tv
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface MovieHistoryItem {
  movieId: string;
  title: string;
  poster: string;
  mediaType: 'movie' | 'tv';
  episodeNumber: number;
  seasonNumber: number;
  progress: number;
  duration: number;
  updatedAt: any;
}

export default function MovieContinueWatching() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<MovieHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      const path = `users/${user.uid}/movieWatchHistory`;
      try {
        const q = query(
          collection(db, path),
          orderBy('updatedAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs.map(doc => ({
          ...doc.data()
        })) as MovieHistoryItem[];
        setHistory(items);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === undefined || secs === 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    
    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');
    
    if (h > 0) {
      return `${h}:${mStr}:${sStr}`;
    }
    return `${mStr}:${sStr}`;
  };

  const handleCardClick = (item: MovieHistoryItem) => {
    const isTV = item.mediaType === 'tv';
    const path = isTV 
      ? `/movie/watch/${item.movieId}/season/${item.seasonNumber}/episode/${item.episodeNumber}?type=tv`
      : `/movie/watch/${item.movieId}?type=movie`;
    
    navigate(path);
  };

  return (
    <div className="w-full bg-[#202125] min-h-screen text-white pb-16">
      {/* Premium Gradient Sub-Header Section */}
      <div className="w-full bg-gradient-to-b from-black/60 to-black/20 border-b border-white/5 py-10 mb-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold tracking-tight mb-8">Hi, {displayName}</h2>
          <div className="flex justify-center items-center gap-6 md:gap-10 border-b border-white/10 pb-3 max-w-3xl mx-auto text-sm text-text-secondary overflow-x-auto scrollbar-hide">
            <button className="flex items-center gap-2 text-primary border-b-2 border-primary pb-3 font-semibold whitespace-nowrap">
              <Clock className="w-4 h-4" /> Continue Watching
            </button>
            <button 
              onClick={() => navigate('/movie/watchlist')}
              className="flex items-center gap-2 hover:text-white pb-3 transition-all cursor-pointer whitespace-nowrap"
            >
              <Heart className="w-4 h-4" /> Watch List
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Title Block */}
        <div className="flex items-center gap-3.5 mb-8">
          <Clock className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-black italic tracking-wide">Continue Watching</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : history.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-7">
            {history.map((item) => {
              const isTV = item.mediaType === 'tv';
              const label = isTV ? `S${item.seasonNumber} : EP ${item.episodeNumber}` : 'MOVIE';

              return (
                <motion.div
                  layout
                  key={item.movieId}
                  onClick={() => handleCardClick(item)}
                  className="group cursor-pointer flex flex-col"
                >
                  {/* Portrait Poster Container */}
                  <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-white/5 border border-white/10 shadow-md">
                    <img 
                      src={item.poster} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      loading="lazy"
                    />
                    
                    {/* Dark gradient shadow on hover */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="p-3.5 bg-primary rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-6 h-6 text-black fill-current" />
                      </div>
                    </div>

                    {/* Media Type Badge */}
                    <span className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-sm text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider text-white flex items-center gap-0.5 shadow border border-white/5">
                      {isTV ? <Tv className="w-2.5 h-2.5 text-primary" /> : <Film className="w-2.5 h-2.5 text-primary" />}
                      {isTV ? 'SERIES' : 'MOVIE'}
                    </span>
                  </div>

                  {/* Text Details Area */}
                  <div className="pt-3">
                    <h3 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors duration-200">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between mt-1.5 text-xs">
                      <span className="text-primary font-bold">{label}</span>
                      <span className="text-text-secondary font-semibold">Active</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-28 bg-white/5 rounded-2xl border border-dashed border-white/10 max-w-3xl mx-auto">
            <Eye className="w-14 h-14 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No watch history</h3>
            <p className="text-gray-500 mt-1 max-w-sm mx-auto text-sm">Start watching some Hollywood movies to see them here!</p>
            <button 
              onClick={() => navigate('/movie')}
              className="mt-6 bg-primary text-black px-6 py-2.5 rounded-full font-bold hover:brightness-110 transition-all cursor-pointer shadow-md"
            >
              Browse Movies
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
