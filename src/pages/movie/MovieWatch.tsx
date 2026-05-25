import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { tmdbApi, TMDBDetails, TMDBEpisode } from '../../services/tmdb';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Play, Tv, Film, ChevronRight, ArrowLeft } from 'lucide-react';

export default function MovieWatch() {
  const { id, season, episode } = useParams<{ id: string; season?: string; episode?: string }>();
  const [searchParams] = useSearchParams();
  const type = (searchParams.get('type') || 'movie') as 'movie' | 'tv';
  const [details, setDetails] = useState<TMDBDetails | null>(null);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(season ? Number(season) : 1);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const currentSeason = season ? Number(season) : 1;
  const currentEpisode = episode ? Number(episode) : 1;
  const isMovie = type === 'movie';

  // Construct vidsrcme.ru embed URL
  const embedUrl = isMovie
    ? `https://vidsrcme.ru/embed/movie/${id}`
    : `https://vidsrcme.ru/embed/tv/${id}/${currentSeason}/${currentEpisode}`;

  useEffect(() => {
    if (!id) return;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const data = await tmdbApi.getDetails(id, type);
        setDetails(data);
        if (type === 'tv') {
          const sNum = season ? Number(season) : (data.seasons && data.seasons.length > 0 ? data.seasons[0].season_number : 1);
          setSelectedSeason(sNum);
          const eps = await tmdbApi.getSeasonEpisodes(id, sNum);
          setEpisodes(eps);
        }
      } catch (err) {
        console.error('Failed to load TMDB watch details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id, type, season]);

  // Save/Update Movie watch history immediately when they open or switch episodes
  useEffect(() => {
    if (!user || !details || !id) return;

    const saveMovieProgress = async () => {
      const path = `users/${user.uid}/movieWatchHistory/${id}`;
      try {
        await setDoc(doc(db, path), {
          movieId: String(id),
          title: details.title || details.name,
          poster: tmdbApi.getImageUrl(details.poster_path, 'w500'),
          mediaType: type,
          episodeNumber: isMovie ? 1 : currentEpisode,
          seasonNumber: isMovie ? 1 : currentSeason,
          progress: 50, // Simulated time representation
          duration: 100, // Simulated total representation
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.warn('Failed to save movie history:', err);
      }
    };
    
    saveMovieProgress();
  }, [user, details, id, currentSeason, currentEpisode, type]);

  const handleSeasonChange = async (seasonNum: number) => {
    if (!id) return;
    setSelectedSeason(seasonNum);
    try {
      const eps = await tmdbApi.getSeasonEpisodes(id, seasonNum);
      setEpisodes(eps);
      // Navigate to the first episode of the selected season
      navigate(`/movie/watch/${id}/season/${seasonNum}/episode/1?type=tv`);
    } catch (err) {
      console.error('Failed to fetch season episodes:', err);
    }
  };

  if (loading || !details) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#202125] min-h-screen text-white pb-16">
      <div className="max-w-7xl mx-auto px-4 pt-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-text-secondary font-bold uppercase tracking-wider mb-6">
          <button 
            onClick={() => navigate(`/movie/details/${details.id}?type=${type}`)}
            className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to details
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white truncate">{details.title || details.name}</span>
          {!isMovie && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-primary font-black">S{currentSeason} : E{currentEpisode}</span>
            </>
          )}
        </div>

        {/* Dynamic Watch Player Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Player iframe */}
          <div className="flex-grow">
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/5 shadow-2xl relative">
              <iframe
                src={embedUrl}
                className="w-full h-full border-0"
                allowFullScreen
                scrolling="no"
                allow="autoplay; encrypted-media"
              />
            </div>
            
            {/* Show Info details */}
            <div className="mt-6">
              <h1 className="text-2xl font-black mb-3">
                {details.title || details.name}
              </h1>
              {!isMovie && (
                <div className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-4 py-2.5 inline-flex items-center gap-2 text-xs font-black tracking-wider uppercase mb-4 shadow-sm">
                  <Tv className="w-4 h-4" /> Season {currentSeason} &bull; Episode {currentEpisode}
                </div>
              )}
              <p className="text-sm text-gray-300 leading-relaxed max-w-4xl">{details.overview}</p>
            </div>
          </div>

          {/* Right: Episodes List Sidebar (Only for TV Shows) */}
          {!isMovie && details.seasons && details.seasons.length > 0 && (
            <div className="shrink-0 w-full lg:w-80 bg-[#16171a] border border-white/5 rounded-xl p-4 self-start">
              {/* Season Selection inside Sidebar */}
              <div className="mb-4">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">Select Season</label>
                <select
                  value={selectedSeason}
                  onChange={(e) => handleSeasonChange(Number(e.target.value))}
                  className="w-full bg-[#202125] border border-white/10 rounded-lg px-3 py-2 text-xs font-bold outline-none text-white focus:border-primary/50 cursor-pointer"
                >
                  {details.seasons
                    .filter((s) => s.season_number > 0)
                    .map((season) => (
                      <option key={season.id} value={season.season_number}>
                        {season.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="border-t border-white/5 pt-4">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-3">Episodes list</span>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 scrollbar-hide">
                  {episodes.map((ep) => {
                    const isSelected = ep.episode_number === currentEpisode && ep.season_number === currentSeason;
                    return (
                      <div
                        key={ep.id}
                        onClick={() => navigate(`/movie/watch/${details.id}/season/${ep.season_number}/episode/${ep.episode_number}?type=tv`)}
                        className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-primary/10 border-primary text-primary' : 'bg-black/20 border-transparent hover:bg-white/5 hover:border-white/10'}`}
                      >
                        <div className="shrink-0 w-16 aspect-video bg-white/5 rounded overflow-hidden relative flex items-center justify-center border border-white/5">
                          {ep.still_path ? (
                            <img src={tmdbApi.getImageUrl(ep.still_path, 'w500')} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Play className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-grow min-w-0 flex flex-col justify-center">
                          <span className="text-[9px] font-black uppercase mb-0.5">EP {ep.episode_number}</span>
                          <h4 className="text-xs font-bold truncate">{ep.name}</h4>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
