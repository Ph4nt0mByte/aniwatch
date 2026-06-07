import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jikanApi } from '../services/api';
import { getEmbedUrls } from '../services/anikoto';
import { Anime, Episode } from '../types';
import { Play, List, Settings, Info, Volume2, Maximize, Bookmark, SkipBack, SkipForward, Sun, ChevronDown, ChevronRight, Search, Loader2, RotateCw } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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
  const [autoPlay, setAutoPlay] = useState(true);
  const [autoNext, setAutoNext] = useState(true);
  const [autoSkip, setAutoSkip] = useState(() => localStorage.getItem('autoSkip') === 'true');
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [relations, setRelations] = useState<any[]>([]);
  const [relationCache, setRelationCache] = useState<Record<number, any>>({});

  // Streaming state
  const [streamMode, setStreamMode] = useState<'sub' | 'dub'>('sub');
  const [embedUrls, setEmbedUrls] = useState<{ sub?: string; dub?: string } | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lightMode, setLightMode] = useState(false);
  const [skipTimes, setSkipTimes] = useState<{
    op?: { start: number; end: number };
    ed?: { start: number; end: number };
  } | null>(null);
  const skipTriggered = useRef<{ op: boolean; ed: boolean }>({ op: false, ed: false });
  const hasResumed = useRef(false);
  const [aniSkipToast, setAniSkipToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    document.body.style.overflow = lightMode ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lightMode]);

  useEffect(() => {
    localStorage.setItem('autoSkip', String(autoSkip));
  }, [autoSkip]);

  const epNumber = parseInt(ep || '1');

  useEffect(() => {
    if (!id) return;
    
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch details + episodes first (priority), then recs + relations after a delay
        // to avoid hitting Jikan's ~3 req/s rate limit which causes empty episode lists
        const [details, eps] = await Promise.all([
          jikanApi.getAnimeById(id),
          jikanApi.getEpisodes(id),
        ]);

        await new Promise(resolve => setTimeout(resolve, 400));

        const [recs, rels] = await Promise.all([
          jikanApi.getRecommendations(id),
          jikanApi.getRelations(id)
        ]);
        
        if (isMounted) {
          if (!details?.data) {
            setError('Anime data not found.');
          } else {
            const animeData = { ...details.data };
            if (animeData.duration === '5 min per ep') {
              animeData.episodes = Math.ceil((animeData.episodes || 120) / 5);
            }
            setAnime(animeData);

            let allEpisodes = eps.data || [];
            let currentPage = 1;
            let hasNext = eps.pagination?.has_next_page || false;

            while (hasNext && isMounted) {
              currentPage++;
              await new Promise(resolve => setTimeout(resolve, 500));
              const nextEps = await jikanApi.getEpisodes(id, currentPage);
              if (nextEps?.data) {
                allEpisodes = [...allEpisodes, ...nextEps.data];
              }
              hasNext = nextEps.pagination?.has_next_page || false;
            }

            let finalEps = allEpisodes;
            if (details.data.duration === '5 min per ep') {
              finalEps = finalEps.filter((_: any, idx: number) => idx % 5 === 0);
            }
            setEpisodes(finalEps);
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
            
            // Fetch relations for each related anime in parallel batches (Jikan ~3 req/s)
            const batchSize = 3;
            for (let i = 0; i < toFetch.length; i += batchSize) {
              const batch = toFetch.slice(i, i + batchSize);
              const results = await Promise.allSettled(
                batch.map(id => jikanApi.getRelations(id).catch(() => null))
              );
              results.forEach(res => {
                if (res.status === 'fulfilled' && res.value?.data && isMounted) {
                  res.value.data.forEach((r: any) => {
                    allRelations.push(r);
                  });
                }
              });
              if (i + batchSize < toFetch.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            
            if (isMounted) {
              setRelations(allRelations);
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
  }, [id, user]);

  // Fetch full details for relations (titles & posters)
  useEffect(() => {
    if (relations.length > 0) {
      const fetchDetails = async () => {
        const entries = relations.flatMap(r => r.entry);
        const uniqueEntries = Array.from(new Map(entries.map(item => [item.mal_id, item])).values());
        const toFetch = uniqueEntries.slice(0, 25).filter(e => !relationCache[e.mal_id] && e.mal_id !== anime?.mal_id);
        
        const batchSize = 3;
        for (let i = 0; i < toFetch.length; i += batchSize) {
          const batch = toFetch.slice(i, i + batchSize);
          const results = await Promise.allSettled(
            batch.map(entry => fetch(`https://api.jikan.moe/v4/anime/${entry.mal_id}`).then(r => r.json()).catch(() => null))
          );
          results.forEach((res, j) => {
            if (res.status === 'fulfilled' && res.value?.data) {
              setRelationCache(prev => ({ ...prev, [batch[j].mal_id]: res.value.data }));
            }
          });
          if (i + batchSize < toFetch.length) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      };
      fetchDetails();
    }
  }, [relations, anime?.mal_id]);

  const saveProgress = async (animeData: Anime, currentEp: number, progress = 0, duration = 0) => {
    if (!user) return;
    const path = `users/${user.uid}/watchHistory/${animeData.mal_id}`;
    try {
      await setDoc(doc(db, path), {
        animeId: String(animeData.mal_id),
        title: animeData.title,
        poster: animeData.images.webp.large_image_url,
        episodeNumber: currentEp,
        progress,
        duration,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Failed to save progress:', err);
    }
  };

  const [isWatchlisted, setIsWatchlisted] = useState(false);

  // Save progress when episode changes without re-fetching everything
  useEffect(() => {
    if (!anime || !user) return;
    const progressKey = `playback-${id}-${epNumber}`;
    const saved = localStorage.getItem(progressKey);
    let initialTime = 0;
    let initialDuration = 0;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        initialTime = parsed.time || 0;
        initialDuration = parsed.duration || 0;
      } catch {}
    }
    saveProgress(anime, epNumber, initialTime, initialDuration);
  }, [epNumber]);

  useEffect(() => {
    if (!user || !id) return;
    const check = async () => {
      const snap = await getDoc(doc(db, `users/${user.uid}/watchlist/${id}`));
      if (snap.exists()) setIsWatchlisted(true);
    };
    check();
  }, [user, id]);

  const toggleWatchlist = async () => {
    if (!user || !anime) return;
    const next = !isWatchlisted;
    setIsWatchlisted(next);
    try {
      const path = `users/${user.uid}/watchlist/${anime.mal_id}`;
      if (next) {
        await setDoc(doc(db, path), {
          title: anime.title,
          poster: anime.images.webp.large_image_url,
          score: anime.score,
          type: anime.type,
          mediaType: 'anime',
          addedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await deleteDoc(doc(db, path));
      }
    } catch (err) {
      setIsWatchlisted(isWatchlisted);
      console.warn('Failed to toggle watchlist:', err);
    }
  };

  // Listen for playback time updates from megaplay and save progress
  useEffect(() => {
    const progressKey = `playback-${id}-${epNumber}`;
    let lastSaved = 0;
    let lastFirestoreSaved = 0;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://megaplay.buzz') return;

      let data: any;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      // Handle watching-log separately — it has no channel field
      if (data?.type === 'watching-log' && typeof data.currentTime === 'number') {
        const now = Date.now();
        const currentTime = data.currentTime;
        if (now - lastSaved > 5000) {
          lastSaved = now;
          localStorage.setItem(progressKey, JSON.stringify({ time: currentTime, duration: data.duration, savedAt: now }));
          if (now - lastFirestoreSaved > 15000 && anime) {
            lastFirestoreSaved = now;
            saveProgress(anime, epNumber, currentTime, data.duration);
          }
        }
        // Also run autoskip on watching-log events
        if (autoSkip && skipTimes && iframeRef.current?.contentWindow) {
          if (skipTimes.op && currentTime >= skipTimes.op.start && currentTime < skipTimes.op.end && !skipTriggered.current.op) {
            skipTriggered.current.op = true;
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ channel: 'megacloud', event: 'seek', time: skipTimes.op.end }),
              'https://megaplay.buzz'
            );
          }
          if (skipTimes.ed && currentTime >= skipTimes.ed.start && currentTime < skipTimes.ed.end && !skipTriggered.current.ed) {
            skipTriggered.current.ed = true;
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ channel: 'megacloud', event: 'seek', time: skipTimes.ed.end }),
              'https://megaplay.buzz'
            );
          }
        }
        return;
      }

      if (data?.channel !== 'megacloud') return;

      if (data.event === 'time' && typeof data.time === 'number') {
        const currentTime = data.time;
        const now = Date.now();

        // Perform initial restore/seek exactly once
        if (!hasResumed.current && iframeRef.current?.contentWindow) {
          hasResumed.current = true;
          const saved = localStorage.getItem(progressKey);
          if (saved) {
            try {
              const { time } = JSON.parse(saved);
              if (typeof time === 'number' && time > 3) {
                iframeRef.current.contentWindow.postMessage(
                  JSON.stringify({ channel: 'megacloud', event: 'seek', time }),
                  'https://megaplay.buzz'
                );

                if (skipTimes) {
                  if (skipTimes.op && time >= skipTimes.op.start) {
                    skipTriggered.current.op = true;
                  }
                  if (skipTimes.ed && time >= skipTimes.ed.start) {
                    skipTriggered.current.ed = true;
                  }
                }
                return; // Return early on seek to avoid conflicting progress updates
              }
            } catch {}
          }
        }

        // Save progress
        if (now - lastSaved > 5000) {
          lastSaved = now;
          localStorage.setItem(progressKey, JSON.stringify({ time: currentTime, duration: data.duration, savedAt: now }));
          if (now - lastFirestoreSaved > 15000 && anime) {
            lastFirestoreSaved = now;
            saveProgress(anime, epNumber, currentTime, data.duration);
          }
        }

        // Autoskip intro and outro using AniSkip timestamps
        if (autoSkip && skipTimes && iframeRef.current?.contentWindow) {
          if (skipTimes.op && currentTime >= skipTimes.op.start && currentTime < skipTimes.op.end && !skipTriggered.current.op) {
            skipTriggered.current.op = true;
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ channel: 'megacloud', event: 'seek', time: skipTimes.op.end }),
              'https://megaplay.buzz'
            );
          }
          if (skipTimes.ed && currentTime >= skipTimes.ed.start && currentTime < skipTimes.ed.end && !skipTriggered.current.ed) {
            skipTriggered.current.ed = true;
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ channel: 'megacloud', event: 'seek', time: skipTimes.ed.end }),
              'https://megaplay.buzz'
            );
          }
        }
      }

      if (data.event === 'complete' && autoNext) {
        localStorage.removeItem(progressKey);
        if (anime) {
          saveProgress(anime, epNumber, data.duration || 100, data.duration || 100);
        }
        const maxEp = anime?.episodes || 999;
        if (epNumber < maxEp) {
          navigate(`/watch/${id}/${epNumber + 1}`);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [autoNext, autoSkip, epNumber, id, anime, navigate, skipTimes]);

  // Update document title with anime title and episode number
  useEffect(() => {
    if (anime) {
      const animeTitle = language === 'en' ? (anime.title_english || anime.title) : anime.title;
      document.title = `${animeTitle} - Episode ${epNumber} | IgnisPlay`;
    }
    return () => {
      document.title = 'IgnisPlay';
    };
  }, [anime, epNumber, language]);

  // Restore saved playback position — handled via #t= fragment in the embed URL
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch embed URLs and AniSkip times in parallel before iframe loads
  useEffect(() => {
    if (!anime) return;
    let cancelled = false;

    setStreamLoading(true);
    setStreamError(null);
    setEmbedUrls(null);
    skipTriggered.current = { op: false, ed: false };
    setSkipTimes(null);
    hasResumed.current = false;

    Promise.all([
      getEmbedUrls(anime.mal_id, epNumber),
      fetch(`https://api.aniskip.com/v1/skip-times/${anime.mal_id}/${epNumber}?types=op&types=ed`)
        .then(res => res.json())
        .catch(() => null)
    ]).then(([result, skipData]) => {
      if (cancelled) return;

      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);

      // Process skip times
      if (skipData?.found) {
        const times: { op?: { start: number; end: number }; ed?: { start: number; end: number } } = {};
        skipData.results.forEach((r: any) => {
          if (r.skip_type === 'op') times.op = { start: r.interval.start_time, end: r.interval.end_time };
          if (r.skip_type === 'ed') times.ed = { start: r.interval.start_time, end: r.interval.end_time };
        });
        const progressKey = `playback-${id}-${epNumber}`;
        const saved = localStorage.getItem(progressKey);
        if (saved) {
          try {
            const { time } = JSON.parse(saved);
            if (typeof time === 'number' && time > 3) {
              if (times.op && time >= times.op.start) skipTriggered.current.op = true;
              if (times.ed && time >= times.ed.start) skipTriggered.current.ed = true;
            }
          } catch {}
        }
        setSkipTimes(times);

        const opStr = times.op ? `OP (${Math.round(times.op.start)}s-${Math.round(times.op.end)}s)` : '';
        const edStr = times.ed ? `ED (${Math.round(times.ed.start)}s-${Math.round(times.ed.end)}s)` : '';
        const skipInfo = [opStr, edStr].filter(Boolean).join(', ') || 'None';
        setAniSkipToast(`AniSkip: Found ${skipInfo}`);
      } else {
        setAniSkipToast('AniSkip: No skip times found');
      }

      toastTimeoutRef.current = setTimeout(() => {
        setAniSkipToast(null);
      }, 5000);

      // Process embed URLs
      if (result && (result.sub || result.dub)) {
        const progressKey = `playback-${id}-${epNumber}`;
        const saved = localStorage.getItem(progressKey);
        let startTime = 0;
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (typeof parsed.time === 'number' && parsed.time > 3) {
              startTime = Math.floor(parsed.time);
            }
          } catch {}
        }
        const withTime = (url?: string) => url && startTime > 0 ? `${url}#t=${startTime}` : url;
        setEmbedUrls({ sub: withTime(result.sub), dub: withTime(result.dub) });
        setStreamMode(result.sub ? 'sub' : 'dub');
      } else {
        setStreamError('This episode is not available on the streaming service yet.');
      }
      setStreamLoading(false);
    }).catch(() => {
      if (!cancelled) {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setAniSkipToast('AniSkip: API request failed');
        toastTimeoutRef.current = setTimeout(() => {
          setAniSkipToast(null);
        }, 5000);

        setStreamError('Failed to load stream. Please try again later.');
        setStreamLoading(false);
      }
    });

    return () => {
      cancelled = true;
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [anime?.mal_id, epNumber]);

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


  return (
    <>
    {aniSkipToast && (
      <div className="fixed top-6 right-6 z-[100] bg-black/90 backdrop-blur-md border border-white/10 text-white text-xs font-black px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(255,221,149,0.5)]" />
        <span>{aniSkipToast}</span>
      </div>
    )}
    {/* Light Mode Backdrop */}
    {lightMode && (
      <div
        className="fixed inset-0 bg-black/90 z-[60]"
        onClick={() => setLightMode(false)}
      />
    )}
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
                 {episodes.map((episode, idx) => {
                    const isCurrent = epNumber === idx + 1;
                    const progressKey = `playback-${id}-${idx + 1}`;
                    const isWatched = localStorage.getItem(progressKey) !== null;

                    return (
                       <button
                          key={idx}
                          onClick={() => navigate(`/watch/${id}/${idx + 1}`)}
                          className={`w-full px-4 py-3 rounded-lg flex items-center gap-4 transition-all text-left group ${
                             isCurrent 
                                ? 'bg-primary/20 border-l-4 border-primary' 
                                : isWatched 
                                   ? 'opacity-40 hover:opacity-85 hover:bg-white/5' 
                                   : 'hover:bg-white/5'
                          }`}
                       >
                          <span className={`w-8 text-[11px] font-black ${isCurrent ? 'text-primary' : 'text-gray-500'}`}>
                             {(idx + 1).toString().padStart(2, '0')}
                          </span>
                          <div className="flex-1 truncate">
                             <p className={`text-xs font-bold truncate ${isCurrent ? 'text-primary' : 'text-gray-300 group-hover:text-primary transition-colors'}`}>
                                {episode.title || `Episode ${idx + 1}`}
                             </p>
                          </div>
                          {isCurrent && (
                             <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(255,221,149,0.5)]"></div>
                          )}
                       </button>
                    );
                 })}
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


        </div>

        {/* Main Content (Right) */}
        <div className="flex-1 min-w-0 order-1 lg:order-2 space-y-4">
          {/* Player Section */}
          <div className="space-y-0.5">
            <div ref={playerContainerRef} className={`bg-black overflow-hidden shadow-2xl border-x border-t border-white/5 ${lightMode ? 'fixed top-1/2 left-1/2 z-[70] rounded-none' : 'relative aspect-video rounded-t-2xl'}`} style={lightMode ? { width: 'min(90vw, calc(90vh * 16 / 9))', height: 'min(90vh, calc(90vw * 9 / 16))', transform: 'translate(-50%, -50%)' } : {}}>
                {/* Loading state */}
                {streamLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black z-10">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-xs font-bold text-gray-400">Finding stream source...</p>
                  </div>
                )}

                {/* Error state */}
                {!streamLoading && streamError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black z-10 px-8 text-center">
                    <div className="text-4xl">📺</div>
                    <p className="text-sm font-bold text-gray-300">{streamError}</p>
                    <p className="text-[11px] text-gray-500 max-w-xs">Try another episode or check back later — Anikoto may not have indexed this title yet.</p>
                  </div>
                )}

                {/* Iframe player — uses Anikoto's embed_url (megaplay.buzz/stream/s-2/...) */}
                {!streamLoading && !streamError && embedUrls && embedUrls[streamMode] && (
                  <iframe
                    ref={iframeRef}
                    key={`${embedUrls[streamMode]}-${refreshKey}`}
                    src={embedUrls[streamMode]}
                    className="w-full h-full"
                    allowFullScreen
                    frameBorder="0"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    scrolling="no"
                  />
                )}
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

                <button 
                  onClick={() => setLightMode(!lightMode)}
                  className={`flex items-center gap-1 transition-colors cursor-pointer ${lightMode ? 'text-primary' : 'hover:text-white'}`}
                >
                  {lightMode && <span className="w-1.5 h-1.5 bg-primary rounded-full" />} <Sun className="w-3.5 h-3.5" /> Light
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
                <button 
                  onClick={() => setRefreshKey(prev => prev + 1)}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Refresh
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

          {/* Stream Info Area */}
          <div className="flex flex-col md:flex-row bg-white/5 rounded-2xl border border-white/5 overflow-hidden mt-4">
            <div className="p-6 md:w-1/3 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-white/5 bg-white/[0.02]">
              <p className="text-sm font-medium leading-relaxed font-sans">
                You're watching <span className="text-primary font-black">Episode {epNumber}</span>.
                <br />
                <span className="text-[10px] text-gray-500 mt-2 block font-bold leading-tight">Powered by Anikoto streaming.</span>
              </p>
            </div>

            <div className="p-6 flex-1 space-y-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 w-16 shrink-0">
                  <Volume2 className="w-4 h-4 text-gray-500" />
                  <span className="text-[10px] font-black uppercase text-gray-400">Audio</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStreamMode('sub')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                      streamMode === 'sub'
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    SUB
                  </button>
                  <button
                    onClick={() => setStreamMode('dub')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                      streamMode === 'dub'
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    DUB
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase ${embedUrls ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
                  {embedUrls ? 'Stream Active' : 'Loading...'}
                </span>
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
                    relation: 'Watching',
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
                    'Watching': 2,
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
                          {String(entry.mal_id) === id ? '▶ Now' : entry.relation}
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
    </>
  );
}
