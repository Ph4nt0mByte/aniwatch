import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/errorHandlers';
import { 
  Play, 
  Clock, 
  Heart, 
  Eye,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface MovieWatchListItem {
  itemId: string;
  title: string;
  poster: string;
  mediaType: 'movie' | 'tv';
  addedAt: any;
}

export default function MovieWatchList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<MovieWatchListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchWatchList = async () => {
      const path = `users/${user.uid}/movieWatchlist`;
      try {
        const q = query(
          collection(db, path),
          orderBy('addedAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          itemId: doc.id
        })) as MovieWatchListItem[];
        setItems(fetched);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      } finally {
        setLoading(false);
      }
    };

    fetchWatchList();
  }, [user]);

  const handleRemove = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/movieWatchlist/${itemId}`));
      setItems(prev => prev.filter(i => i.itemId !== itemId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/movieWatchlist/${itemId}`);
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <div className="w-full bg-[#202125] min-h-screen text-white pb-16">
      <div className="w-full bg-gradient-to-b from-black/60 to-black/20 border-b border-white/5 py-10 mb-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold tracking-tight mb-8">Hi, {displayName}</h2>
          <div className="flex justify-center items-center gap-6 md:gap-10 border-b border-white/10 pb-3 max-w-3xl mx-auto text-sm text-text-secondary overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => navigate('/movie/continue-watching')}
              className="flex items-center gap-2 hover:text-white pb-3 transition-all cursor-pointer whitespace-nowrap"
            >
              <Clock className="w-4 h-4" /> Continue Watching
            </button>
            <button className="flex items-center gap-2 text-primary border-b-2 border-primary pb-3 font-semibold whitespace-nowrap">
              <Heart className="w-4 h-4" /> Watch List
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3.5 mb-8">
          <Heart className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-black italic tracking-wide">My Watch List</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-7">
            {items.map((item) => (
              <motion.div
                layout
                key={item.itemId}
                onClick={() => navigate(`/movie/details/${item.itemId}?type=${item.mediaType}`)}
                className="group cursor-pointer flex flex-col relative"
              >
                <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-white/5 border border-white/10 shadow-md">
                  <img 
                    src={item.poster} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="p-3.5 bg-primary rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                      <Play className="w-6 h-6 text-black fill-current" />
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors duration-200">
                      {item.title}
                    </h3>
                    <span className="text-[10px] text-text-secondary font-semibold uppercase">
                      {item.mediaType === 'movie' ? 'Movie' : 'Series'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleRemove(e, item.itemId)}
                    className="shrink-0 p-1.5 bg-white/10 hover:bg-red-500/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-28 bg-white/5 rounded-2xl border border-dashed border-white/10 max-w-3xl mx-auto">
            <Eye className="w-14 h-14 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400">Your watch list is empty</h3>
            <p className="text-gray-500 mt-1 max-w-sm mx-auto text-sm">Bookmark movies and TV series to see them here!</p>
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
