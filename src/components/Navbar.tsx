import { Search, MessageCircle, Send, Radio, User, LogOut, Settings, History, Bookmark, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { logout } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { jikanApi } from '../services/api';
import { tmdbApi } from '../services/tmdb';

export default function Navbar() {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isMovieMode = location.pathname.startsWith('/movie');
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    if (!isProfileOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isProfileOpen]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        if (isMovieMode) {
          const data = await tmdbApi.searchMulti(searchQuery);
          setSuggestions(data.slice(0, 6));
        } else {
          const data = await jikanApi.searchAnime(searchQuery);
          setSuggestions(data.data?.slice(0, 6) || []);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, isMovieMode]);

  useEffect(() => {
    if (!suggestions.length && !suggestionsLoading) return;
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [suggestions, suggestionsLoading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSuggestions([]);
      if (isMovieMode) {
        navigate(`/movie/search?keyword=${encodeURIComponent(searchQuery)}`);
      } else {
        navigate(`/search?keyword=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  const handleSuggestionClick = (item: any) => {
    setSuggestions([]);
    setSearchQuery('');
    if (isMovieMode) {
      const mediaType = item.media_type || 'movie';
      navigate(`/movie/details/${item.id}?type=${mediaType}`);
    } else {
      navigate(`/anime/${item.mal_id}`);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-12 bg-[#202125]/60 backdrop-blur-sm z-50 flex items-center px-4 justify-between border-b border-white/5">
      {/* Bottom glow bleeding into page content */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-red-600/15 blur-md -z-10 translate-y-1/2 pointer-events-none" />
      {/* Left: brand */}
      <div className="flex items-center gap-4 shrink-0">
        <Link to={isMovieMode ? '/movie' : '/'} className="flex items-center">
          <span className="text-2xl font-bold italic tracking-tighter">ignis<span className="text-primary italic">play</span></span>
        </Link>
      </div>

      {/* Right: search + toggle + avatar */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-3">
          <div className="relative" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder={isMovieMode ? 'Search movies...' : 'Search anime...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="w-48 lg:w-64 bg-white/10 border border-transparent focus:border-primary/50 rounded-full py-1.5 px-4 pl-9 text-xs outline-none transition-all placeholder:text-gray-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            </form>
            <AnimatePresence>
              {(suggestions.length > 0 || suggestionsLoading) && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full mt-2 w-full bg-[#2f3033] rounded-xl shadow-2xl border border-white/5 overflow-hidden z-[60]"
                >
                  {suggestionsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  ) : (
                    suggestions.map((item: any) => (
                      <button
                        key={item.mal_id || item.id}
                        onClick={() => handleSuggestionClick(item)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                      >
                        <img
                          src={isMovieMode ? tmdbApi.getImageUrl(item.poster_path, 'w500') : item.images?.webp?.image_url}
                          alt=""
                          className="w-8 h-11 rounded object-cover bg-white/5 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.title_english || item.title || item.name}</p>
                          <p className="text-[10px] text-text-secondary">
                            {isMovieMode
                              ? (item.media_type === 'tv' ? 'TV' : 'Movie')
                              : (item.type || 'Anime')
                            }
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex bg-white/5 rounded-full border border-white/5 p-0.5 shrink-0">
            <button
              onClick={() => navigate('/')}
              className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider transition-all cursor-pointer ${!isMovieMode ? 'bg-primary text-black' : 'text-gray-500 hover:text-white'}`}
            >
              ANIME
            </button>
            <button
              onClick={() => navigate('/movie')}
              className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider transition-all cursor-pointer ${isMovieMode ? 'bg-primary text-black' : 'text-gray-500 hover:text-white'}`}
            >
              MOVIE
            </button>
          </div>
        </div>

        {user ? (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-primary transition-all"
            >
              <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" />
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-64 bg-[#2f3033] rounded-xl shadow-2xl border border-white/5 overflow-hidden"
                >
                  <div className="p-4 border-b border-white/5">
                    <p className="font-semibold truncate">{user.displayName || 'User'}</p>
                    <p className="text-xs text-text-secondary truncate">{user.email}</p>
                  </div>
                  <div className="py-2">
                    <button onClick={() => { navigate('/profile'); setIsProfileOpen(false); }} className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3">
                      <User className="w-4 h-4" /> Profile
                    </button>
                    <button onClick={() => { navigate(isMovieMode ? '/movie/continue-watching' : '/continue-watching'); setIsProfileOpen(false); }} className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3">
                      <History className="w-4 h-4" /> Continue Watching
                    </button>
                    <button onClick={() => { navigate(isMovieMode ? '/movie/watchlist' : '/watchlist'); setIsProfileOpen(false); }} className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3">
                      <Bookmark className="w-4 h-4" /> Watch List
                    </button>
                    <button onClick={() => { navigate('/settings'); setIsProfileOpen(false); }} className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3">
                      <Settings className="w-4 h-4" /> Settings
                    </button>
                  </div>
                  <div className="p-2 border-t border-white/5">
                    <button onClick={() => logout()} className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-400/10 rounded-lg flex items-center gap-3">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <Link to="/auth" className="bg-primary text-black px-4 py-1.5 rounded-md font-medium text-sm hover:brightness-110 transition-all">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
