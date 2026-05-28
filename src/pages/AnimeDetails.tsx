import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { jikanApi } from '../services/api';
import { Anime, Episode } from '../types';
import { Play, Star, Clock, Calendar, Bookmark, Share2, Plus, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export default function AnimeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchlisted, setWatchlisted] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const [details, eps] = await Promise.all([
          jikanApi.getAnimeById(id),
          jikanApi.getEpisodes(id)
        ]);
        setAnime(details.data);
        setEpisodes(eps.data || []);
      } catch (error) {
        console.error('Failed to fetch details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!user || !anime) return;
    const check = async () => {
      const snap = await getDoc(doc(db, `users/${user.uid}/watchlist/${anime.mal_id}`));
      if (snap.exists()) setWatchlisted(true);
    };
    check();
  }, [user, anime]);

  const handleAddToWatchlist = async () => {
    if (!user) return navigate('/auth');
    if (!anime) return;
    const path = `users/${user.uid}/watchlist/${anime.mal_id}`;
    const next = !watchlisted;
    setWatchlisted(next);
    try {
      if (next) {
        await setDoc(doc(db, path), {
          title: anime.title,
          poster: anime.images.webp.large_image_url,
          mediaType: 'anime',
          addedAt: serverTimestamp()
        });
      } else {
        await deleteDoc(doc(db, path));
      }
    } catch (error) {
      setWatchlisted(watchlisted);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  if (!anime) return <div className="text-center py-20">Anime not found</div>;

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <div className="relative h-[400px] md:h-[500px]">
        <div className="absolute inset-0">
          <img src={anime.images.webp.large_image_url} alt="" className="w-full h-full object-cover blur-sm brightness-[0.3]" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/60 to-transparent"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 h-full flex flex-col md:flex-row items-end gap-8 pb-12">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="hidden md:block w-64 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10"
          >
            <img src={anime.images.webp.large_image_url} alt={language === 'en' ? (anime.title_english || anime.title) : anime.title} className="w-full h-full object-cover" />
          </motion.div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-2 text-primary font-medium text-sm">
              <Link to="/" className="hover:underline">Home</Link>
              <span>•</span>
              <span className="text-white">{anime.type}</span>
              <span>•</span>
              <span className="text-white">{language === 'en' ? (anime.title_english || anime.title) : anime.title}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black">{language === 'en' ? (anime.title_english || anime.title) : anime.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
              <span className="bg-white/10 px-2 py-0.5 rounded text-xs">PG-13</span>
              <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs">HD</span>
              <div className="flex items-center gap-1.5"><Play className="w-4 h-4 fill-current" /> {anime.type}</div>
              <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {anime.duration.split(' ')[0]} min</div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <button 
                onClick={() => navigate(`/watch/${anime.mal_id}/1`)}
                className="bg-primary text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:brightness-110 transition-all"
              >
                <Play className="w-5 h-5 fill-current" /> Watch Now
              </button>
              <button 
                onClick={handleAddToWatchlist}
                className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all ${
                  watchlisted ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <Plus className="w-5 h-5" /> {watchlisted ? 'Remove from List' : 'Add to List'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-4 gap-12 mt-12">
        {/* Left Column: Details */}
        <div className="lg:col-span-3 space-y-12">
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" /> Synopsis
            </h2>
            <p className="text-gray-400 leading-relaxed text-sm md:text-base">
              {anime.synopsis}
            </p>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" /> Episodes
              </h2>
              <span className="text-xs text-gray-500">{episodes.length} Total</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {episodes.length > 0 ? episodes.map((ep, idx) => (
                <Link 
                  key={ep.mal_id || idx}
                  to={`/watch/${anime.mal_id}/${idx + 1}`}
                  className="bg-white/5 hover:bg-primary hover:text-black py-2 rounded text-center text-sm font-medium transition-all"
                >
                  {idx + 1}
                </Link>
              )) : (
                 <div className="col-span-full py-8 text-center text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                    No episodes found for this seasonal anime.
                 </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Info Grid */}
        <div className="space-y-8 bg-white/5 p-6 rounded-2xl h-fit border border-white/5">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between pb-2 border-b border-white/5">
              <span className="text-gray-500">Type:</span>
              <span className="font-medium">{anime.type}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-white/5">
              <span className="text-gray-500">Studios:</span>
              <span className="font-medium text-right">{anime.studios?.map(s => s.name).join(', ') || '?'}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-white/5">
              <span className="text-gray-500">Date aired:</span>
              <span className="font-medium">{anime.status}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-white/5">
              <span className="text-gray-500">Status:</span>
              <span className="font-medium">{anime.status}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-white/5">
              <span className="text-gray-500">Score:</span>
              <span className="text-primary font-bold">{anime.score}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-2">Genres:</span>
              <div className="flex flex-wrap gap-1.5">
                {anime.genres.map(g => (
                  <span key={g.name} className="px-2 py-0.5 bg-white/10 rounded text-[10px] text-gray-300">
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
