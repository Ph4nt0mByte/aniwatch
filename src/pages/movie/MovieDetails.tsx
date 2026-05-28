import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { tmdbApi, TMDBDetails, TMDBEpisode } from '../../services/tmdb';
import { Play, Star, Calendar, Clock, Film, Tv, ChevronRight, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export default function MovieDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const type = (searchParams.get('type') || 'movie') as 'movie' | 'tv';
  const [details, setDetails] = useState<TMDBDetails | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [watchlisted, setWatchlisted] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAddToWatchlist = async () => {
    if (!user) return navigate('/auth');
    if (!details) return;
    const itemId = String(details.id);
    const path = `users/${user.uid}/movieWatchlist/${itemId}`;
    const next = !watchlisted;
    setWatchlisted(next);
    try {
      if (next) {
        await setDoc(doc(db, path), {
          title: details.title || details.name || 'Unknown',
          poster: tmdbApi.getImageUrl(details.poster_path, 'w500'),
          mediaType: details.media_type,
          addedAt: serverTimestamp()
        });
      } else {
        await deleteDoc(doc(db, path));
      }
    } catch (error) {
      setWatchlisted(watchlisted);
      console.error('Failed to toggle watchlist:', error);
    }
  };

  useEffect(() => {
    if (!id) return;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const data = await tmdbApi.getDetails(id, type);
        setDetails(data);
        if (type === 'tv' && data.seasons && data.seasons.length > 0) {
          const firstSeasonNum = data.seasons.find((s: any) => s.season_number > 0)?.season_number ?? 1;
          setSelectedSeason(firstSeasonNum);
          fetchSeasonEpisodes(id, firstSeasonNum);
        }
      } catch (err) {
        console.error('Failed to fetch TMDB details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id, type]);

  useEffect(() => {
    if (!user || !details) return;
    const check = async () => {
      const snap = await getDoc(doc(db, `users/${user.uid}/movieWatchlist/${details.id}`));
      if (snap.exists()) setWatchlisted(true);
    };
    check();
  }, [user, details]);

  const fetchSeasonEpisodes = async (showId: string | number, seasonNum: number) => {
    setEpisodesLoading(true);
    try {
      const eps = await tmdbApi.getSeasonEpisodes(showId, seasonNum);
      setEpisodes(eps);
    } catch (err) {
      console.error('Failed to fetch season episodes:', err);
    } finally {
      setEpisodesLoading(false);
    }
  };

  const handleSeasonChange = (seasonNum: number) => {
    if (!id) return;
    setSelectedSeason(seasonNum);
    fetchSeasonEpisodes(id, seasonNum);
  };

  if (loading || !details) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isMovie = details.media_type === 'movie';
  const releaseYear = (details.release_date || details.first_air_date || '').split('-')[0];
  const runtimeDisplay = isMovie 
    ? `${details.runtime || 0} min` 
    : `${details.number_of_seasons} Seasons (${details.number_of_episodes} Episodes)`;

  return (
    <div className="bg-[#202125] min-h-screen text-white pb-16">
      {/* Immersive Blurred Banner Backdrop */}
      <div className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden">
        <img 
          src={tmdbApi.getImageUrl(details.backdrop_path, 'original')} 
          alt={details.title || details.name} 
          className="w-full h-full object-cover scale-105 filter blur-xs brightness-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#202125] to-black/30" />
      </div>

      {/* Main Info Card Container */}
      <div className="max-w-7xl mx-auto px-4 -mt-32 md:-mt-48 relative z-10 flex flex-col md:flex-row gap-8">
        {/* Left: Poster */}
        <div className="shrink-0 w-48 md:w-64 mx-auto md:mx-0">
          <div className="aspect-[2/3] w-full rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-white/5">
            <img 
              src={tmdbApi.getImageUrl(details.poster_path, 'w500')} 
              alt={details.title || details.name} 
              className="w-full h-full object-cover"
            />
          </div>
          <button 
            onClick={() => navigate(`/movie/watch/${details.id}${!isMovie ? `/season/${selectedSeason}/episode/1` : ''}?type=${details.media_type}`)}
            className="w-full mt-5 bg-primary hover:brightness-110 text-black py-3 rounded-xl font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Play className="w-5 h-5 fill-current" /> Play Stream
          </button>
          <button
            onClick={handleAddToWatchlist}
            className={`w-full mt-3 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all ${
              watchlisted ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Plus className="w-5 h-5" /> {watchlisted ? 'Remove from List' : 'Add to List'}
          </button>
        </div>

        {/* Right: Text details */}
        <div className="flex-grow pt-4 md:pt-16">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-white/10 text-xs px-2 py-0.5 rounded font-black tracking-wider uppercase flex items-center gap-1">
              {isMovie ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
              {isMovie ? 'MOVIE' : 'SERIES'}
            </span>
            <span className="bg-primary/20 text-primary border border-primary/20 text-xs px-2 py-0.5 rounded font-black flex items-center gap-0.5 shadow">
              <Star className="w-3 h-3 fill-current" /> {details.vote_average.toFixed(1)}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
            {details.title || details.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-secondary font-semibold mb-6">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-primary" /> {releaseYear}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-primary" /> {runtimeDisplay}</span>
          </div>

          {/* Genres list */}
          <div className="flex flex-wrap gap-2 mb-8">
            {details.genres.map((g) => (
              <span key={g.id} className="bg-white/5 border border-white/10 px-3.5 py-1 rounded-full text-xs font-semibold hover:border-primary/45 transition-colors cursor-default">
                {g.name}
              </span>
            ))}
          </div>

          {/* Synopsis Description */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-2.5">Overview</h3>
            <p className="text-gray-300 text-sm leading-relaxed max-w-4xl">{details.overview || 'No synopsis is currently available.'}</p>
          </div>

          {/* Cast members list */}
          {details.credits?.cast && details.credits.cast.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-4">Cast Crew</h3>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {details.credits.cast.slice(0, 10).map((cast) => (
                  <div key={cast.id} className="shrink-0 w-16 text-center">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-white/5 border border-white/10 mx-auto shadow mb-2">
                      <img 
                        src={tmdbApi.getImageUrl(cast.profile_path, 'w500')} 
                        alt={cast.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[10px] font-bold line-clamp-1 text-white">{cast.name}</p>
                    <p className="text-[9px] text-gray-500 line-clamp-1">{cast.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Episode Selection Grid (Only for TV Shows) */}
      {!isMovie && details.seasons && details.seasons.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <Tv className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-black italic tracking-wide">Episode Selector</h2>
            </div>
            
            {/* Season Selector Dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary font-semibold">Season</span>
              <select 
                value={selectedSeason} 
                onChange={(e) => handleSeasonChange(Number(e.target.value))}
                className="bg-[#2f3033] border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary/50 text-white font-bold cursor-pointer"
              >
                {details.seasons
                  .filter((s) => s.season_number > 0)
                  .map((season) => (
                    <option key={season.id} value={season.season_number}>
                      {season.name} ({season.episode_count} Episodes)
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {episodesLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {episodes.map((ep) => (
                <div 
                  key={ep.id}
                  onClick={() => navigate(`/movie/watch/${details.id}/season/${ep.season_number}/episode/${ep.episode_number}?type=tv`)}
                  className="bg-[#1a1b1e] border border-white/5 rounded-xl p-3.5 flex gap-4 cursor-pointer hover:border-primary/45 transition-colors group"
                >
                  <div className="shrink-0 w-28 aspect-video rounded-lg overflow-hidden bg-white/5 border border-white/5 relative">
                    {ep.still_path ? (
                      <img src={tmdbApi.getImageUrl(ep.still_path, 'w500')} alt={ep.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-black/40 flex items-center justify-center">
                        <Play className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-primary fill-current" />
                    </div>
                  </div>
                  <div className="flex-grow flex flex-col justify-center min-w-0">
                    <span className="text-[10px] text-primary font-black uppercase tracking-wider mb-0.5">EPISODE {ep.episode_number}</span>
                    <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors text-white">{ep.name}</h4>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-snug">{ep.overview || 'No episode description is available.'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations Section */}
      {details.recommendations?.results && details.recommendations.results.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-16">
          <div className="flex items-center gap-2 mb-6">
            <Film className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-black italic tracking-wide">You May Also Like</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {details.recommendations.results.slice(0, 10).map((rec) => {
              const releaseYear = (rec.release_date || rec.first_air_date || '').split('-')[0];
              const isRecMovie = rec.media_type === 'movie' || !rec.first_air_date;

              return (
                <div 
                  key={rec.id}
                  onClick={() => navigate(`/movie/details/${rec.id}?type=${isRecMovie ? 'movie' : 'tv'}`)}
                  className="shrink-0 w-36 cursor-pointer group flex flex-col"
                >
                  <div className="aspect-[2/3] w-full rounded-lg overflow-hidden border border-white/5 shadow relative bg-white/5">
                    <img src={tmdbApi.getImageUrl(rec.poster_path, 'w500')} alt={rec.title || rec.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-primary fill-current" />
                    </div>
                  </div>
                  <h4 className="font-bold text-xs line-clamp-1 mt-2 group-hover:text-primary transition-colors">{rec.title || rec.name}</h4>
                  <span className="text-[10px] text-gray-500 font-semibold">{releaseYear}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
