import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { tmdbApi, TMDBMovieOrTV } from '../../services/tmdb';
import { Film, Tv, Star, Play, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

export default function MovieSearch() {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') || '';
  const [results, setResults] = useState<TMDBMovieOrTV[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!keyword.trim()) return;
    
    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await tmdbApi.searchMulti(keyword);
        setResults(data);
      } catch (err) {
        console.error('Failed to search TMDB multi:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [keyword]);

  const handleCardClick = (item: TMDBMovieOrTV) => {
    navigate(`/movie/details/${item.id}?type=${item.media_type}`);
  };

  return (
    <div className="bg-[#202125] min-h-screen text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Search Title */}
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-black italic tracking-wide">
            Search Results <span className="text-primary not-italic">"{keyword}"</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">Hollywood Movies and TV Series match from TMDB</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-28">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8">
            {results.map((item) => {
              const releaseYear = (item.release_date || item.first_air_date || '').split('-')[0];
              const isMovie = item.media_type === 'movie';

              return (
                <motion.div
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  className="group cursor-pointer flex flex-col"
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
                  <div className="pt-2.5">
                    <h4 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors duration-200">
                      {item.title || item.name}
                    </h4>
                    <span className="text-xs text-text-secondary font-semibold">{releaseYear || 'N/A'}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-28 bg-white/5 rounded-2xl border border-dashed border-white/10 max-w-3xl mx-auto">
            <EyeOff className="w-14 h-14 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No results found</h3>
            <p className="text-gray-500 mt-1 max-w-xs mx-auto text-sm">We couldn't find any Hollywood movies or shows matching your query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
