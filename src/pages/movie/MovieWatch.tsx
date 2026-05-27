import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { tmdbApi, TMDBDetails, TMDBEpisode } from '../../services/tmdb';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Play, Tv, Film, ChevronRight, ArrowLeft, Sun, Maximize, Star, Calendar, SkipForward } from 'lucide-react';

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
  const [lightMode, setLightMode] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = lightMode ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lightMode]);

  const toggleFullscreen = () => {
    if (playerContainerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        playerContainerRef.current.requestFullscreen();
      }
    }
  };

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
          const sNum = season ? Number(season) : (
            data.seasons?.find((s: any) => s.season_number > 0)?.season_number ?? 1
          );
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
          progress: 50,
          duration: 100,
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
    navigate(`/movie/watch/${id}/season/${seasonNum}/episode/1?type=tv`);
  };

  const goNextEpisode = () => {
    if (!details || !id) return;
    const maxEp = episodes.length;
    if (currentEpisode < maxEp) {
      navigate(`/movie/watch/${id}/season/${currentSeason}/episode/${currentEpisode + 1}?type=tv`);
    }
  };

  const releaseYear = (details?.release_date || details?.first_air_date || '').split('-')[0];

  if (loading || !details) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const recommendations = details.recommendations?.results?.slice(0, 12) || [];

  return (
    <div className="bg-[#202125] min-h-screen text-white pb-16">
      {lightMode && (
        <div className="fixed inset-0 bg-black/90 z-[60]" onClick={() => setLightMode(false)} />
      )}
      <div className="max-w-[1600px] mx-auto px-4 pt-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-text-secondary font-bold uppercase tracking-wider mb-4">
          <button onClick={() => navigate(`/movie/details/${details.id}?type=${type}`)} className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
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

        {/* Player + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Player */}
          <div className="flex-1 min-w-0">
            <div
              ref={playerContainerRef}
              className={`bg-black overflow-hidden shadow-2xl border-x border-t border-white/5 ${lightMode ? 'fixed top-1/2 left-1/2 z-[70] rounded-none' : 'relative aspect-video w-full rounded-t-2xl'}`}
              style={lightMode ? { width: 'min(90vw, calc(90vh * 16 / 9))', height: 'min(90vh, calc(90vw * 9 / 16))', transform: 'translate(-50%, -50%)' } : {}}
            >
              <iframe src={embedUrl} className="w-full h-full border-0" allowFullScreen scrolling="no" allow="autoplay; encrypted-media" />
              {/* Prev/Next overlays on player for TV shows in light mode only */}
              {!isMovie && lightMode && (
                <>
                  <button
                    onClick={() => navigate(`/movie/watch/${id}/season/${currentSeason}/episode/${currentEpisode - 1}?type=tv`)}
                    disabled={currentEpisode <= 1}
                    className="absolute left-0 top-0 h-full w-16 flex items-center justify-center bg-gradient-to-r from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity disabled:hidden cursor-pointer z-10 group"
                  >
                    <div className="bg-black/60 rounded-full p-2 group-hover:bg-primary group-hover:text-black transition-all">
                      <SkipForward className="w-5 h-5 fill-current rotate-180" />
                    </div>
                  </button>
                  <button
                    onClick={goNextEpisode}
                    disabled={currentEpisode >= episodes.length}
                    className="absolute right-0 top-0 h-full w-16 flex items-center justify-center bg-gradient-to-l from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity disabled:hidden cursor-pointer z-10 group"
                  >
                    <div className="bg-black/60 rounded-full p-2 group-hover:bg-primary group-hover:text-black transition-all">
                      <SkipForward className="w-5 h-5 fill-current" />
                    </div>
                  </button>
                </>
              )}
            </div>

            {/* Action Bar */}
            <div className="bg-[#121315] border-x border-b border-white/5 p-2 px-4 flex items-center gap-4 text-[11px] font-bold text-gray-400 rounded-b-2xl mb-6">
              <button onClick={toggleFullscreen} className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
                <Maximize className="w-3.5 h-3.5" /> Expand
              </button>
              <button onClick={() => setLightMode(!lightMode)} className={`flex items-center gap-1 transition-colors cursor-pointer ${lightMode ? 'text-primary' : 'hover:text-white'}`}>
                {lightMode && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
                <Sun className="w-3.5 h-3.5" /> Light
              </button>
              {!isMovie && (
                <div className="flex items-center gap-3 border-l border-white/10 pl-4">
                  <button
                    onClick={() => navigate(`/movie/watch/${id}/season/${currentSeason}/episode/${currentEpisode - 1}?type=tv`)}
                    disabled={currentEpisode <= 1}
                    className="flex items-center gap-1 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <SkipForward className="w-3.5 h-3.5 fill-current rotate-180" /> Prev
                  </button>
                  <button onClick={goNextEpisode} disabled={currentEpisode >= episodes.length} className="flex items-center gap-1 hover:text-white disabled:opacity-30 cursor-pointer">
                    Next <SkipForward className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              )}
            </div>

            {/* Info Section with Poster */}
            <div className="bg-[#121315] rounded-2xl border border-white/5 p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Poster */}
                <div className="shrink-0 w-32 md:w-44">
                  <img
                    src={tmdbApi.getImageUrl(details.poster_path, 'w500')}
                    alt={details.title || details.name}
                    className="w-full aspect-[2/3] object-cover rounded-xl shadow-2xl border border-white/10"
                  />
                </div>
                {/* Details */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black">{details.title || details.name}</h1>
                    <span className="bg-primary/20 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> {details.vote_average.toFixed(1)}
                    </span>
                    <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1">
                      {isMovie ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                      {isMovie ? 'Movie' : 'Series'}
                    </span>
                    {releaseYear && (
                      <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {releaseYear}
                      </span>
                    )}
                  </div>

                  {!isMovie && (
                    <div className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1.5 inline-flex items-center gap-2 text-xs font-black tracking-wider uppercase">
                      <Tv className="w-3.5 h-3.5" /> Season {currentSeason} &bull; Episode {currentEpisode}
                    </div>
                  )}

                  {details.genres?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {details.genres.map((g) => (
                        <span key={g.id} className="bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-gray-300">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-sm text-gray-300 leading-relaxed">{details.overview}</p>

                  {details.credits?.cast && details.credits.cast.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">Cast</p>
                      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                        {details.credits.cast.slice(0, 8).map((c) => (
                          <div key={c.id} className="shrink-0 text-center w-14">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-white/5 border border-white/10 mx-auto mb-1">
                              <img src={tmdbApi.getImageUrl(c.profile_path, 'w500')} alt={c.name} className="w-full h-full object-cover" />
                            </div>
                            <p className="text-[9px] font-bold line-clamp-1">{c.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Related Grid */}
            {recommendations.length > 0 && (
              <div className="bg-[#121315] rounded-2xl border border-white/5 p-6">
                <h3 className="text-[13px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                  <Play className="w-4 h-4 text-primary fill-current" /> You May Also Like
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {recommendations.map((rec) => {
                    const isRecMovie = rec.media_type === 'movie' || !rec.first_air_date;
                    return (
                      <div
                        key={rec.id}
                        onClick={() => navigate(`/movie/details/${rec.id}?type=${isRecMovie ? 'movie' : 'tv'}`)}
                        className="cursor-pointer group"
                      >
                        <div className="aspect-[2/3] w-full rounded-lg overflow-hidden bg-white/5 border border-white/5 relative mb-1.5">
                          <img src={tmdbApi.getImageUrl(rec.poster_path, 'w500')} alt={rec.title || rec.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-5 h-5 text-primary fill-current" />
                          </div>
                          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-[9px] px-1 py-0.5 rounded font-black text-primary flex items-center gap-0.5">
                            <Star className="w-2 h-2 fill-current" /> {rec.vote_average.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold line-clamp-1 group-hover:text-primary transition-colors">{rec.title || rec.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Episode Sidebar (TV only) */}
          {!isMovie && details.seasons && details.seasons.length > 0 && (
            <div className="shrink-0 w-full lg:w-72 bg-[#16171a] border border-white/5 rounded-xl p-4 self-start">
              <div className="mb-4">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">Select Season</label>
                <select
                  value={selectedSeason}
                  onChange={(e) => handleSeasonChange(Number(e.target.value))}
                  className="w-full bg-[#202125] border border-white/10 rounded-lg px-3 py-2 text-xs font-bold outline-none text-white focus:border-primary/50 cursor-pointer"
                >
                  {details.seasons.filter((s) => s.season_number > 0).map((season) => (
                    <option key={season.id} value={season.season_number}>{season.name}</option>
                  ))}
                </select>
              </div>
              <div className="border-t border-white/5 pt-4">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-3">Episodes</span>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-hide">
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
