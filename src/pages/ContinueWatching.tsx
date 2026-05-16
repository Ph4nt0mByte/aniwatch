import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { WatchHistoryItem } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { Play, Calendar, Trash2, Clock } from 'lucide-react';
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 mt-4">
      <div className="flex items-center gap-4 mb-12">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Clock className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black italic">Continue Watching</h1>
          <p className="text-text-secondary">Pick up where you left off</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : history.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {history.map((item) => (
            <motion.div
              layout
              key={item.animeId}
              onClick={() => navigate(`/watch/${item.animeId}/${item.episodeNumber}`)}
              className="bg-[#1a1b1e] rounded-xl overflow-hidden border border-white/5 group cursor-pointer"
            >
              <div className="relative aspect-video">
                <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-12 h-12 text-primary fill-current" />
                </div>
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${(item.progress / item.duration) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold line-clamp-1 group-hover:text-primary transition-colors">{item.title}</h3>
                <div className="flex items-center justify-between mt-2 text-xs text-text-secondary">
                  <span>Episode {item.episodeNumber}</span>
                  <div className="flex items-center gap-1 capitalize">
                    <span className="w-1 h-1 bg-primary rounded-full"></span>
                    Watching
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <Play className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-500">No watch history</h3>
          <p className="text-gray-600 mt-2">Start watching some anime to see them here!</p>
          <button className="mt-6 bg-primary text-black px-6 py-2 rounded-full font-bold hover:brightness-110 transition-all">
            Browse Anime
          </button>
        </div>
      )}
    </div>
  );
}
