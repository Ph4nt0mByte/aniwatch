import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { WatchHistoryItem } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { 
  Play, 
  Clock, 
  Heart, 
  MessageSquare,
  Mic,
  Eye
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function ContinueWatching() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      const path = `users/${user.uid}/watchHistory`;
      try {
        const q = query(
          collection(db, path),
          orderBy('updatedAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs.map(doc => ({
          ...doc.data()
        })) as WatchHistoryItem[];
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

  // Helper to generate dynamic badges matching the mockup screenshot
  const getBadges = (epNum: number, malId: string) => {
    const cc = epNum;
    const mic = epNum > 3 ? epNum - 2 : epNum;
    let total = epNum;
    if (epNum <= 12) total = 12;
    else if (epNum <= 24) total = 24;

    // Simulate mature content badge based on id parity or specific items
    const isMature = parseInt(malId) % 3 === 0;

    return { cc, mic, total, isMature };
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
              onClick={() => navigate('/watchlist')}
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
              const { cc, mic, total, isMature } = getBadges(item.episodeNumber, item.animeId);
              const progressPct = item.duration > 0 ? Math.min((item.progress / item.duration) * 100, 100) : 0;

              return (
                <motion.div
                  layout
                  key={item.animeId}
                  onClick={() => {
                    const progressKey = `playback-${item.animeId}-${item.episodeNumber}`;
                    localStorage.setItem(progressKey, JSON.stringify({ 
                      time: item.progress, 
                      duration: item.duration, 
                      savedAt: Date.now() 
                    }));
                    navigate(`/watch/${item.animeId}/${item.episodeNumber}`);
                  }}
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

                    {/* 18+ Mature Badge */}
                    {isMature && (
                      <span className="absolute top-2.5 left-2.5 bg-red-600/90 text-white font-black text-[9px] px-1.5 py-0.5 rounded shadow">
                        18+
                      </span>
                    )}

                    {/* Media Info Overlay (cc / mic / total count) */}
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm border border-white/5">
                      <span className="flex items-center gap-0.5 text-[#ffdd95]">
                        <MessageSquare className="w-3 h-3 stroke-[2.5]" /> {cc}
                      </span>
                      <span className="w-px h-3 bg-white/20"></span>
                      <span className="flex items-center gap-0.5 text-pink-400">
                        <Mic className="w-3 h-3 stroke-[2.5]" /> {mic}
                      </span>
                      {total > 0 && (
                        <>
                          <span className="w-px h-3 bg-white/20"></span>
                          <span className="text-gray-300 font-semibold">{total}</span>
                        </>
                      )}
                    </div>

                    {/* Bottom Progress Bar Overlay */}
                    {item.duration > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${progressPct}%` }}
                        ></div>
                      </div>
                    )}
                  </div>

                  {/* Text Details Area */}
                  <div className="pt-3">
                    <h3 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors duration-200">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between mt-1 text-xs">
                      <span className="text-text-secondary font-semibold">EP {item.episodeNumber}</span>
                      <span className="text-primary font-bold">
                        {formatTime(item.progress)} <span className="text-text-secondary font-normal">/</span> {formatTime(item.duration)}
                      </span>
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
            <p className="text-gray-500 mt-1 max-w-sm mx-auto text-sm">Start watching some anime to see them here!</p>
            <button 
              onClick={() => navigate('/')}
              className="mt-6 bg-primary text-black px-6 py-2.5 rounded-full font-bold hover:brightness-110 transition-all cursor-pointer shadow-md"
            >
              Browse Anime
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
