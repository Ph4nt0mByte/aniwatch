import { useEffect, useState, useRef } from 'react';
import { jikanApi } from '../services/api';
import { Anime } from '../types';
import Spotlight from '../components/Spotlight';
import AnimeCard from '../components/AnimeCard';
import { ChevronRight, TrendingUp, Zap, Clock, Star, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function Home() {
  const [topAnime, setTopAnime] = useState<Anime[]>([]);
  const [seasonalAnime, setSeasonalAnime] = useState<Anime[]>([]);
  const [airingAnime, setAiringAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const trendingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [top, seasonal, airing] = await Promise.all([
          jikanApi.getTopAnime(),
          jikanApi.getSeasonNow(),
          jikanApi.getAiring()
        ]);
        setTopAnime(top.data.slice(0, 5));
        setSeasonalAnime(seasonal.data.slice(0, 12));
        setAiringAnime(airing.data.slice(0, 10));
      } catch (error) {
        console.error('Failed to fetch anime:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <Spotlight animeList={topAnime} />
      
      <div className="max-w-7xl mx-auto px-4 space-y-16">
        {/* Trending Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black italic flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" /> Trending
            </h2>
            <div className="flex gap-2">
              <button onClick={() => trendingRef.current?.scrollBy({ left: -600, behavior: 'smooth' })} className="p-2 bg-white/5 hover:bg-primary hover:text-black rounded-lg border border-white/5 transition-all cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => trendingRef.current?.scrollBy({ left: 600, behavior: 'smooth' })} className="p-2 bg-white/5 hover:bg-primary hover:text-black rounded-lg border border-white/5 transition-all cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div ref={trendingRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {seasonalAnime.slice(0, 10).map((anime, index) => (
              <div key={anime.mal_id} className="min-w-[200px] w-[200px]">
                <AnimeCard anime={anime} rank={index + 1} />
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content: Latest Episodes */}
          <div className="lg:col-span-3">
             <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black italic flex items-center gap-2">
                  <Clock className="w-6 h-6 text-primary" /> Latest Episodes
                </h2>
                <Link to="/latest" className="text-text-secondary hover:text-primary text-sm flex items-center">
                  View more <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {seasonalAnime.map((anime) => (
                  <AnimeCard key={anime.mal_id} anime={anime} />
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Content: Top Airing etc. */}
          <div className="space-y-12">
            <section>
              <h2 className="text-xl font-black italic mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" /> Top Airing
              </h2>
              <div className="bg-[#1a1b1e] rounded-xl overflow-hidden border border-white/5">
                {airingAnime.slice(0, 5).map((anime, index) => (
                  <div key={anime.mal_id} className="p-4 flex gap-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group">
                    <span className="text-xl font-black text-gray-600 group-hover:text-primary italic w-6">{index + 1}</span>
                    <img src={anime.images.webp.image_url} className="w-12 h-16 object-cover rounded shadow-lg" alt="" />
                    <div className="flex flex-col justify-center">
                      <h4 className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                        {language === 'en' ? (anime.title_english || anime.title) : anime.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                        <span>{anime.type}</span>
                        <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                        <div className="flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-current text-primary" />
                          <span>{anime.score}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
               <h2 className="text-xl font-black italic mb-6">Genres</h2>
               <div className="flex flex-wrap gap-2">
                 {['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life'].map(genre => (
                   <button key={genre} className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-sm text-text-secondary transition-all">
                     {genre}
                   </button>
                 ))}
               </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
