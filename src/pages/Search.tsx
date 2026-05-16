import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { jikanApi } from '../services/api';
import { Anime } from '../types';
import AnimeCard from '../components/AnimeCard';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';

export default function Search() {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') || '';
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (keyword) {
      const fetchResults = async () => {
        setLoading(true);
        try {
          const data = await jikanApi.searchAnime(keyword);
          setResults(data.data);
        } catch (error) {
          console.error('Search failed:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchResults();
    }
  }, [keyword]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 mt-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
        <div>
          <h1 className="text-3xl font-black italic mb-2">Search Results</h1>
          <p className="text-text-secondary">Showing results for: <span className="text-primary">"{keyword}"</span></p>
        </div>
        
        <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-sm transition-all text-text-secondary border border-white/5">
          <SlidersHorizontal className="w-4 h-4" /> Filter
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {results.map((anime) => (
            <AnimeCard key={anime.mal_id} anime={anime} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
          <SearchIcon className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-500">No results found</h3>
          <p className="text-gray-600 mt-2">Try searching for something else</p>
        </div>
      )}
    </div>
  );
}
