import { useEffect, useState, useRef } from 'react';
import { tmdbApi, TMDBMovieOrTV } from '../../services/tmdb';
import { Play, TrendingUp, Film, Tv, Star, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function MovieHome() {
  const [trending, setTrending] = useState<TMDBMovieOrTV[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBMovieOrTV[]>([]);
  const [popularTV, setPopularTV] = useState<TMDBMovieOrTV[]>([]);
  const [topRated, setTopRated] = useState<TMDBMovieOrTV[]>([]);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const moviesRef = useRef<HTMLDivElement>(null);
  const tvRef = useRef<HTMLDivElement>(null);
  const topRatedRef = useRef<HTMLDivElement>(null);

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    ref.current?.scrollBy({ left: dir === 'left' ? -600 : 600, behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trend, popM, popT, topR] = await Promise.all([
          tmdbApi.getTrending(),
          tmdbApi.getPopularMovies(),
          tmdbApi.getPopularTV(),
          tmdbApi.getTopRated()
        ]);
        setTrending(trend.slice(0, 8));
        setPopularMovies(popM.slice(0, 10));
        setPopularTV(popT.slice(0, 10));
        setTopRated(topR.slice(0, 10));
      } catch (err) {
        console.error('Failed to load TMDB home content:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-rotate spotlight carousel every 7 seconds
  useEffect(() => {
    if (trending.length === 0) return;
    const interval = setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % trending.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [trending]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const spotlight = trending[spotlightIndex];

  const handleCardClick = (item: TMDBMovieOrTV) => {
    navigate(`/movie/details/${item.id}?type=${item.media_type}`);
  };

  const MovieCard = ({ item }: { item: TMDBMovieOrTV }) => {
    const releaseYear = (item.release_date || item.first_air_date || '').split('-')[0];
    const isMovie = item.media_type === 'movie';

    return (
      <motion.div
        onClick={() => handleCardClick(item)}
        className="group cursor-pointer flex flex-col shrink-0 w-[160px] md:w-[190px]"
        whileHover={{ scale: 1.02 }}
      >
        <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-white/5 border border-white/10 shadow-md">
          <img
            src={tmdbApi.getImageUrl(item.poster_path, 'w500')}
            alt={item.title || item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="p-3 bg-primary rounded-full shadow-lg">
              <Play className="w-5 h-5 text-black fill-current" />
            </div>
          </div>
          <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider text-white flex items-center gap-0.5 shadow">
            {isMovie ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />}
            {isMovie ? 'MOVIE' : 'SERIES'}
          </span>
          <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-[9px] px-1.5 py-0.5 rounded font-black text-primary shadow flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 fill-current" /> {item.vote_average.toFixed(1)}
          </span>
        </div>
        <div className="pt-2">
          <h4 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors duration-200">
            {item.title || item.name}
          </h4>
          <span className="text-xs text-text-secondary font-semibold">{releaseYear || 'N/A'}</span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="bg-[#202125] min-h-screen text-white pb-16">
      {/* Spotlight Carousel */}
      {spotlight && (
        <div className="relative w-full h-[62vh] md:h-[78vh] overflow-hidden mb-12 border-b border-white/5">
          <AnimatePresence mode="wait">
            <motion.div
              key={spotlight.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              <img
                src={tmdbApi.getImageUrl(spotlight.backdrop_path, 'original')}
                alt={spotlight.title || spotlight.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#202125] via-black/45 to-black/20" />
            </motion.div>
          </AnimatePresence>

          <div className="absolute inset-x-0 bottom-0 max-w-7xl mx-auto px-4 pb-12 flex flex-col justify-end h-full">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="max-w-2xl"
            >
              <span className="inline-flex items-center gap-1.5 bg-primary/20 text-primary border border-primary/20 px-2.5 py-1 rounded text-xs font-black tracking-wider uppercase mb-4">
                <TrendingUp className="w-3.5 h-3.5" /> SPOTLIGHT
              </span>
              <h1 className="text-3xl md:text-5xl font-black mb-3.5 tracking-tight line-clamp-2">
                {spotlight.title || spotlight.name}
              </h1>
              <p className="text-sm text-gray-300 line-clamp-3 mb-6 font-medium leading-relaxed drop-shadow">
                {spotlight.overview}
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(`/movie/watch/${spotlight.id}${spotlight.media_type === 'tv' ? '/season/1/episode/1' : ''}?type=${spotlight.media_type}`)}
                  className="bg-primary text-black px-6 py-2.5 rounded font-black hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Play className="w-4 h-4 fill-current" /> Watch Now
                </button>
                <button
                  onClick={() => handleCardClick(spotlight)}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded font-black transition-all flex items-center gap-2 cursor-pointer backdrop-blur border border-white/5"
                >
                  <Info className="w-4 h-4" /> Info Details
                </button>
              </div>
            </motion.div>
          </div>

          {/* Spotlight prev/next controls */}
          <div className="absolute bottom-12 right-4 md:right-12 flex gap-3 z-10">
            <button
              onClick={() => setSpotlightIndex((prev) => (prev - 1 + trending.length) % trending.length)}
              className="p-3 bg-white/5 hover:bg-primary hover:text-black rounded-lg transition-all border border-white/5 cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setSpotlightIndex((prev) => (prev + 1) % trending.length)}
              className="p-3 bg-white/5 hover:bg-primary hover:text-black rounded-lg transition-all border border-white/5 cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Main categories container */}
      <div className="max-w-7xl mx-auto px-4 space-y-12">
        {/* Popular Movies */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3.5">
              <Film className="w-6 h-6 text-primary" />
              <h2 className="text-xl md:text-2xl font-black italic tracking-wide">Popular Hollywood Movies</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => scroll(moviesRef, 'left')} className="p-2 bg-white/5 hover:bg-primary hover:text-black rounded-lg border border-white/5 transition-all cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => scroll(moviesRef, 'right')} className="p-2 bg-white/5 hover:bg-primary hover:text-black rounded-lg border border-white/5 transition-all cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div ref={moviesRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {popularMovies.map((item) => <MovieCard key={item.id} item={item} />)}
          </div>
        </section>

        {/* Popular TV Shows */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3.5">
              <Tv className="w-6 h-6 text-primary" />
              <h2 className="text-xl md:text-2xl font-black italic tracking-wide">Popular TV Shows</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => scroll(tvRef, 'left')} className="p-2 bg-white/5 hover:bg-primary hover:text-black rounded-lg border border-white/5 transition-all cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => scroll(tvRef, 'right')} className="p-2 bg-white/5 hover:bg-primary hover:text-black rounded-lg border border-white/5 transition-all cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div ref={tvRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {popularTV.map((item) => <MovieCard key={item.id} item={item} />)}
          </div>
        </section>

        {/* Top Rated Hollywood */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3.5">
              <Star className="w-6 h-6 text-primary" />
              <h2 className="text-xl md:text-2xl font-black italic tracking-wide">Top Rated Blockbusters</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => scroll(topRatedRef, 'left')} className="p-2 bg-white/5 hover:bg-primary hover:text-black rounded-lg border border-white/5 transition-all cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => scroll(topRatedRef, 'right')} className="p-2 bg-white/5 hover:bg-primary hover:text-black rounded-lg border border-white/5 transition-all cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div ref={topRatedRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {topRated.map((item) => <MovieCard key={item.id} item={item} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
