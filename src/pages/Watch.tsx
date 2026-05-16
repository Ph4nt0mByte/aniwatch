import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jikanApi } from '../services/api';
import { Anime, Episode } from '../types';
import { Play, List, ChevronLeft, ChevronRight, Settings, Info, Share2, Volume2, Maximize, MessageSquare, Bookmark, SkipBack, SkipForward, Sun, ChevronDown, Search } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export default function Watch() {
  const { id, ep } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [server, setServer] = useState<'Vidstream' | 'VidCloud'>('Vidstream');
  const [mode, setMode] = useState<'sub' | 'dub'>('sub');
  const [autoPlay, setAutoPlay] = useState(true);
  const [autoNext, setAutoNext] = useState(true);
  const [autoSkip, setAutoSkip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [relations, setRelations] = useState<any[]>([]);
  const [relationCache, setRelationCache] = useState<Record<number, any>>({});

  const epNumber = parseInt(ep || '1');

  useEffect(() => {
    if (!id) return;
    
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [details, eps, recs, rels] = await Promise.all([
          jikanApi.getAnimeById(id),
          jikanApi.getEpisodes(id),
          jikanApi.getRecommendations(id),
          jikanApi.getRelations(id)
        ]);
        
        if (isMounted) {
          if (!details?.data) {
            setError('Anime data not found.');
          } else {
            setAnime(details.data);
            setEpisodes(eps.data || []);
            setRecommendations(recs.data || []);
            
            const initialRels = rels.data || [];
            setRelations(initialRels);

            // Enhanced recursive relation fetch for complete franchises
            const allRelatedIds = new Set([parseInt(id)]);
            const allRelations: any[] = [...initialRels];
            
            // Build a queue of all related anime IDs to fetch
            const toFetch: number[] = [];
            initialRels.forEach((r: any) => {
              r.entry.forEach((e: any) => {
                if (!allRelatedIds.has(e.mal_id)) {
                  allRelatedIds.add(e.mal_id);
                  toFetch.push(e.mal_id);
                }
              });
            });
            
            // Fetch relations for each related anime (breadth-first)
            let currentBatch = [...toFetch];
            let depth = 0;
            const maxDepth = 3;
            
            while (currentBatch.length > 0 && depth < maxDepth) {
              const nextBatch: number[] = [];
              
              for (const relatedId of currentBatch) {
                try {
                  await new Promise(resolve => setTimeout(resolve, 350));
                  const res = await jikanApi.getRelations(relatedId);
                  
                  if (res?.data && isMounted) {
                    res.data.forEach((r: any) => {
                      allRelations.push(r);
                      r.entry.forEach((e: any) => {
                        if (!allRelatedIds.has(e.mal_id)) {
                          allRelatedIds.add(e.mal_id);
                          nextBatch.push(e.mal_id);
                        }
                      });
                    });
                  }
                } catch (e) {
                  console.warn(`Failed to fetch relations for ${relatedId}:`, e);
                }
              }
              
              currentBatch = nextBatch;
              depth++;
            }
            
            if (isMounted) {
              setRelations(allRelations);
            }
            
            // Save progress to "Continue Watching"
            if (user && details.data) {
              saveProgress(details.data, epNumber);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch details:', err);
        if (isMounted) setError('Failed to load anime streaming data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    window.scrollTo(0, 0);

    return () => { isMounted = false; };
  }, [id, ep, user]);

  // Fetch full details for relations (titles & posters)
  useEffect(() => {
    if (relations.length > 0) {
      const fetchDetails = async () => {
        const entries = relations.flatMap(r => r.entry);
        const uniqueEntries = Array.from(new Map(entries.map(item => [item.mal_id, item])).values());
        
        for (const entry of uniqueEntries.slice(0, 25)) {
          if (relationCache[entry.mal_id] || entry.mal_id === anime?.mal_id) continue;
          
          try {
            const res = await fetch(`https://api.jikan.moe/v4/anime/${entry.mal_id}`);
            const data = await res.json();
            if (data?.data) {
              setRelationCache(prev => ({ ...prev, [entry.mal_id]: data.data }));
            }
            // Respect Jikan rate limit: ~2 requests per second is usually safe for short bursts
            await new Promise(r => setTimeout(r, 600)); 
          } catch (e) {
            console.error(e);
          }
        }
      };
      fetchDetails();
    }
  }, [relations, anime?.mal_id]);

  const saveProgress = async (animeData: Anime, currentEp: number) => {
    if (!user) return;
    const path = `users/${user.uid}/watchHistory/${animeData.mal_id}`;
    try {
      await setDoc(doc(db, path), {
        animeId: String(animeData.mal_id),
        title: animeData.title,
        poster: animeData.images.webp.large_image_url,
        episodeNumber: currentEp,
        progress: 10,
        duration: 24,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Failed to save progress:', err);
    }
  };

  const [isWatchlisted, setIsWatchlisted] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    // Check if in watchlist
    // (Implementation omitted for brevity, adding a mock state toggle for now)
  }, [user, id]);

  const toggleWatchlist = async () => {
    if (!user || !anime) return;
    try {
      const path = `users/${user.uid}/watchlist/${anime.mal_id}`;
      await setDoc(doc(db, path), {
        title: anime.title,
        poster: anime.images.webp.large_image_url,
        score: anime.score,
        type: anime.type,
        addedAt: serverTimestamp()
      }, { merge: true });
      setIsWatchlisted(true);
    } catch (err) {
      console.warn('Failed to add to watchlist:', err);
    }
  };
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (playerContainerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        playerContainerRef.current.requestFullscreen();
      }
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      <p className="text-sm text-gray-500 font-medium">Preparing your screen...</p>
    </div>
  );

  if (error || !anime) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="bg-white/5 p-6 rounded-3xl mb-4">
        <Info className="w-12 h-12 text-red-400 mx-auto" />
      </div>
      <h2 className="text-2xl font-bold mb-2">{error || 'Anime not found'}</h2>
      <p className="text-gray-400 mb-6 italic">This might be due to a rate limit or service interruption.</p>
      <button onClick={() => navigate('/')} className="bg-primary text-black px-8 py-3 rounded-full font-bold">
        Back to Home
      </button>
    </div>
  );

  const playerUrl = server === 'Vidstream' 
    ? `https://vidsrc.xyz/embed/anime/${id}/${epNumber}`
    : `https://vidsrc.to/embed/anime/${id}/${epNumber}`;

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6">
      {/* Title Header - Spans full width above both sidebar and player */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-2">
          <span className="bg-primary/20 px-2 py-0.5 rounded">Currently Watching</span>
        </div>
        <h1 className="text-lg md:text-2xl font-black leading-tight">
          {language === 'en' ? (anime.title_english || anime.title) : anime.title} 
          <span className="text-primary ml-2 italic opacity-80">Episode {epNumber}</span>
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar (Left) */}
        <div className="w-full lg:w-[280px] shrink-0 space-y-6 order-2 lg:order-1">
           {/* Episode List */}
           <div>
              <div className="bg-[#121315] rounded-2xl overflow-hidden border border-white/5">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                 <h3 className="font-black flex items-center gap-2 text-[13px] uppercase tracking-wider">
                    <List className="w-4 h-4 text-primary" /> Episodes
                 </h3>
                 <span className="text-[10px] font-black text-gray-500 uppercase">{episodes.length} Total</span>
              </div>
              
              <div className="p-3 border-b border-white/5 flex gap-2">
                 <div className="flex-1 relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Search Episode..." 
                      className="w-full bg-white/5 border border-white/5 rounded-md py-1.5 pl-8 pr-3 text-[10px] font-bold focus:outline-none focus:border-primary/50"
                    />
                 </div>
                 <div className="bg-white/5 px-3 py-1.5 rounded-md text-[10px] font-bold border border-white/5 flex items-center gap-2 cursor-pointer hover:bg-white/10">
                    <ChevronDown className="w-3 h-3" />
                 </div>
              </div>

              <div className="max-h-[550px] overflow-y-auto scrollbar-hide py-2 px-1 space-y-1">
                 {episodes.map((episode, idx) => (
                    <button
                       key={idx}
                       onClick={() => navigate(`/watch/${id}/${idx + 1}`)}
                       className={`w-full px-4 py-3 rounded-lg flex items-center gap-4 transition-all text-left group ${epNumber === idx + 1 ? 'bg-primary/20 border-l-4 border-primary' : 'hover:bg-white/5'}`}
                    >
                       <span className={`w-8 text-[11px] font-black ${epNumber === idx + 1 ? 'text-primary' : 'text-gray-500'}`}>
                          {(idx + 1).toString().padStart(2, '0')}
                       </span>
                       <div className="flex-1 truncate">
                          <p className={`text-xs font-bold truncate ${epNumber === idx + 1 ? 'text-primary' : 'text-gray-300 group-hover:text-primary transition-colors'}`}>
                             {episode.title || `Episode ${idx + 1}`}
                          </p>
                       </div>
                       {epNumber === idx + 1 && (
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(255,221,149,0.5)]"></div>
                       )}
                    </button>
                 ))}
              </div>
           </div>
           </div>

           {/* Recommendations Sidebar */}
           {recommendations.length > 0 && (
             <div className="space-y-4">
                <h3 className="font-black text-[13px] uppercase tracking-widest flex items-center gap-2 px-1">
                   <Play className="w-4 h-4 text-primary fill-current" /> Related Anime
                </h3>
                <div className="space-y-3">
                   {recommendations.slice(0, 5).map((rec: any) => (
                      <Link 
                        key={rec.entry.mal_id} 
                        to={`/anime/${rec.entry.mal_id}`}
                        className="flex gap-4 group bg-white/[0.02] p-3 rounded-2xl border border-transparent hover:border-white/10 hover:bg-white/5 transition-all outline-none"
                      >
                         <img src={rec.entry.images.webp.image_url} className="w-16 aspect-[2/3] object-cover rounded-xl shadow-lg border border-white/5" alt="" />
                         <div className="flex-1 py-1">
                            <h4 className="text-xs font-black line-clamp-2 group-hover:text-primary transition-colors mb-1 leading-relaxed">{rec.entry.title}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-primary font-black uppercase bg-primary/10 px-1.5 py-0.5 rounded">TV</span>
                              <span className="text-[10px] text-gray-500 font-bold uppercase">{rec.votes} Votes</span>
                            </div>
                         </div>
                      </Link>
                   ))}
                </div>
             </div>
           )}

           {/* Discord Card */}
           <div className="bg-[#5865F2] rounded-3xl p-6 text-center shadow-xl shadow-[#5865F2]/10 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
              <MessageSquare className="w-12 h-12 text-white mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="font-black text-white mb-2 uppercase tracking-wide">Community Discord</h4>
              <p className="text-[11px] text-white/80 mb-6 font-bold leading-relaxed px-4">Join our community to discuss about this anime and request for features!</p>
              <button className="bg-white text-[#5865F2] w-full py-3.5 rounded-2xl text-xs font-black hover:bg-gray-100 transition-all shadow-lg active:scale-95 cursor-pointer">
                 Join Discord
              </button>
           </div>
        </div>

        {/* Main Content (Right) */}
        <div className="flex-1 min-w-0 order-1 lg:order-2 space-y-4">
          {/* Player Section */}
          <div className="space-y-0.5">
            <div ref={playerContainerRef} className="relative aspect-video bg-black rounded-t-2xl overflow-hidden shadow-2xl group border-x border-t border-white/5">
                <iframe
                  src={playerUrl}
                  title="Streaming Player"
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                ></iframe>
                
                <div className="absolute top-4 left-4 pointer-events-none flex items-center gap-2">
                  <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-black flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    SERVER {server.toUpperCase()} ({mode.toUpperCase()})
                  </div>
                </div>
            </div>

            {/* Action Bar (Below Player) */}
            <div className="bg-[#121315] border-x border-b border-white/5 p-2 px-4 flex items-center justify-between text-[11px] font-bold text-gray-400 rounded-b-2xl">
              <div className="flex items-center gap-4">
                <button 
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                >
                  <Maximize className="w-3.5 h-3.5" /> Expand
                </button>
                
                <button 
                  onClick={() => setAutoPlay(!autoPlay)}
                  className={`flex items-center gap-1 transition-colors cursor-pointer ${autoPlay ? 'text-primary' : 'hover:text-white'}`}
                >
                  {autoPlay && <span className="w-1.5 h-1.5 bg-primary rounded-full" />} Auto Play
                </button>

                <button 
                  onClick={() => setAutoNext(!autoNext)}
                  className={`flex items-center gap-1 transition-colors cursor-pointer ${autoNext ? 'text-primary' : 'hover:text-white'}`}
                >
                  {autoNext && <span className="w-1.5 h-1.5 bg-primary rounded-full" />} Auto Next
                </button>

                <button 
                  onClick={() => setAutoSkip(!autoSkip)}
                  className={`flex items-center gap-1 transition-colors cursor-pointer ${autoSkip ? 'text-primary' : 'hover:text-white'}`}
                >
                  {autoSkip && <span className="w-1.5 h-1.5 bg-primary rounded-full" />} Auto Skip
                </button>

                <button className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
                  <Sun className="w-3.5 h-3.5" /> Light
                </button>

                <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
                  <button 
                    disabled={epNumber <= 1}
                    onClick={() => navigate(`/watch/${id}/${epNumber - 1}`)}
                    className="flex items-center gap-1 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <SkipBack className="w-3.5 h-3.5 fill-current" /> Prev
                  </button>
                  <button 
                    disabled={epNumber >= (anime.episodes || 999)}
                    onClick={() => navigate(`/watch/${id}/${epNumber + 1}`)}
                    className="flex items-center gap-1 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    Next <SkipForward className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
                  <Info className="w-3.5 h-3.5" /> Report
                </button>
                <button 
                  onClick={toggleWatchlist}
                  className={`flex items-center gap-1 transition-colors cursor-pointer ${isWatchlisted ? 'text-primary' : 'hover:text-white'}`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-current' : ''}`} /> {isWatchlisted ? 'In Watchlist' : 'Add to list'}
                </button>
              </div>
            </div>
          </div>

          {/* Server Selection Area */}
          <div className="flex flex-col md:flex-row bg-white/5 rounded-2xl border border-white/5 overflow-hidden mt-4">
            <div className="p-6 md:w-1/3 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-white/5 bg-white/[0.02]">
              <p className="text-sm font-medium leading-relaxed font-sans">
                You're watching <span className="text-primary font-black">Episode {epNumber}</span>.
                <br />
                <span className="text-[10px] text-gray-500 mt-2 block font-bold leading-tight">If current servers doesn't work, please try other servers beside.</span>
              </p>
            </div>
            
            <div className="p-6 flex-1 space-y-6">
              {/* SUB Servers */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 w-16 shrink-0">
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  <span className="text-[10px] font-black uppercase text-gray-400">SUB</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Vidstream', 'VidCloud'].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setServer(s as any); setMode('sub'); }}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${server === s && mode === 'sub' ? 'bg-primary text-black border-primary' : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/5'}`}
                    >
                      <Play className={`w-3 h-3 ${server === s && mode === 'sub' ? 'fill-current' : ''}`} /> {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* DUB Servers */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 w-16 shrink-0">
                  <Volume2 className="w-4 h-4 text-gray-500" />
                  <span className="text-[10px] font-black uppercase text-gray-400">DUB</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Vidstream', 'VidCloud'].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setServer(s as any); setMode('dub'); }}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${server === s && mode === 'dub' ? 'bg-primary text-black border-primary' : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/5'}`}
                    >
                      <Play className={`w-3 h-3 ${server === s && mode === 'dub' ? 'fill-current' : ''}`} /> {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Seasons & Related Section ( Sideways ) */}
          {anime && (
            <div className="bg-[#121315] p-6 rounded-2xl border border-white/5 mt-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[13px] font-black flex items-center gap-2 uppercase tracking-widest text-gray-400">
                  <Settings className="w-4 h-4 text-primary" /> Seasons & Related
                </h3>
                <span className="text-[10px] font-black text-gray-500 uppercase">Horizontal Scroll</span>
              </div>
              
              <div className="w-full overflow-x-auto pb-4">
                <div className="flex gap-4 flex-nowrap">
                {(() => {
                  // Build a comprehensive list of all related anime
                  const relatedMap = new Map<number, any>();
                  
                  // Add current anime
                  relatedMap.set(anime.mal_id, {
                    mal_id: anime.mal_id,
                    name: anime.title,
                    relation: 'Current',
                    type: 'anime'
                  });
                  
                  // Process all relations and flatten entries
                  relations.forEach((r: any) => {
                    r.entry.forEach((e: any) => {
                      if (e.type === 'anime' && !relatedMap.has(e.mal_id)) {
                        relatedMap.set(e.mal_id, {
                          ...e,
                          relation: r.relation
                        });
                      }
                    });
                  });
                  
                  // Convert to array and sort by relation priority
                  const relationPriority: Record<string, number> = {
                    'Prequel': 1,
                    'Current': 2,
                    'Sequel': 3,
                    'Side story': 4,
                    'Parent story': 5,
                    'Full story': 6,
                    'Alternative setting': 7,
                    'Alternative version': 8,
                    'Spin-off': 9,
                    'Summary': 10,
                    'Other': 11
                  };
                  
                  const sortedEntries = Array.from(relatedMap.values())
                    .sort((a, b) => {
                      const priorityA = relationPriority[a.relation] || 99;
                      const priorityB = relationPriority[b.relation] || 99;
                      return priorityA - priorityB;
                    });

                  return sortedEntries.map((entry, idx) => (
                    <button
                      key={`${entry.mal_id}-${idx}`}
                      onClick={() => String(entry.mal_id) !== id && navigate(`/watch/${entry.mal_id}/1`)}
                      className={`flex-shrink-0 w-64 p-4 rounded-2xl border transition-all text-left flex gap-4 group cursor-pointer ${String(entry.mal_id) === id ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(255,221,149,0.15)] ring-1 ring-primary/50' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}
                    >
                      <div className="shrink-0 w-12 h-16 bg-white/10 rounded-lg overflow-hidden relative border border-white/5">
                        <img 
                          src={relationCache[entry.mal_id]?.images?.webp?.image_url || (String(entry.mal_id) === id ? anime.images.webp.large_image_url : '')} 
                          className={`w-full h-full object-cover transition-opacity duration-300 ${(!relationCache[entry.mal_id] && String(entry.mal_id) !== id) ? 'opacity-0' : 'opacity-100'}`} 
                          alt="" 
                        />
                        {(!relationCache[entry.mal_id] && String(entry.mal_id) !== id) && (
                          <div className="absolute inset-0 flex items-center justify-center font-black text-[10px] text-gray-500">
                             ANI
                          </div>
                        )}
                        {String(entry.mal_id) === id && (
                          <div className="absolute inset-0 bg-primary/40 flex items-center justify-center backdrop-blur-[2px]">
                            <Play className="w-5 h-5 text-white fill-current animate-pulse" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className={`text-xs font-black line-clamp-3 leading-snug ${String(entry.mal_id) === id ? 'text-white' : 'text-gray-300 group-hover:text-white transition-colors'}`}>
                          {(() => {
                            const detail = relationCache[entry.mal_id];
                            if (detail) {
                              return language === 'en' ? (detail.title_english || detail.title) : detail.title;
                            }
                            return entry.name;
                          })()}
                        </p>
                        <span className={`text-[9px] font-black uppercase mt-1 tracking-widest ${String(entry.mal_id) === id ? 'text-primary' : 'text-gray-500'}`}>
                          {String(entry.mal_id) === id ? 'Watching Now' : entry.relation}
                        </span>
                      </div>
                    </button>
                  ));
                })()}
                </div>
              </div>
            </div>
          )}

          {/* About Section */}
          <div className="bg-[#121315] p-8 rounded-2xl border border-white/5 mt-4">
             <div className="flex flex-col md:flex-row gap-8">
                <div className="shrink-0">
                  <img src={anime.images.webp.large_image_url} className="w-32 md:w-40 aspect-[2/3] object-cover rounded-xl shadow-2xl border border-white/10" alt="" />
                </div>
                <div className="flex-1 space-y-4">
                   <div className="flex flex-wrap items-center gap-3">
                      <span className="text-2xl font-black">
                        {language === 'en' ? (anime.title_english || anime.title) : anime.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-primary bg-primary/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{anime.score || 'N/A'} Score</span>
                        <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{anime.type}</span>
                        <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{anime.status}</span>
                      </div>
                   </div>
                   <p className="text-sm text-gray-400 leading-relaxed font-medium">{anime.synopsis}</p>
                   <Link to={`/anime/${id}`} className="inline-flex items-center gap-2 text-primary text-sm font-black hover:underline group">
                      View full details <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                   </Link>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
