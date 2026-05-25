import { Search, Menu, MessageCircle, Send, Radio, User, LogOut, Settings, History, Bookmark } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { logout } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isMovieMode = location.pathname.startsWith('/movie');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (isMovieMode) {
        navigate(`/movie/search?keyword=${encodeURIComponent(searchQuery)}`);
      } else {
        navigate(`/search?keyword=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-[#202125]/90 backdrop-blur-md z-50 flex items-center px-4 justify-between border-b border-white/5">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        <Link to="/" className="flex items-center">
          <span className="text-2xl font-bold italic tracking-tighter">ani<span className="text-primary italic">watch</span></span>
        </Link>
      </div>

      <div className="hidden md:flex flex-1 max-w-xl mx-8 relative items-center gap-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <input
            type="text"
            placeholder="Search anime..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            className="w-full bg-white/10 border border-transparent focus:border-primary/50 rounded-md py-2 px-4 pl-10 outline-none transition-all placeholder:text-gray-500"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        </form>

        <div className="flex bg-white/5 rounded-lg border border-white/5 p-0.5 shrink-0">
          <button 
            onClick={() => navigate('/')}
            className={`px-3.5 py-1 rounded-md text-[10px] font-black tracking-wider transition-all cursor-pointer ${!isMovieMode ? 'bg-primary text-black' : 'text-gray-500 hover:text-white'}`}
          >
            ANIME
          </button>
          <button 
            onClick={() => navigate('/movie')}
            className={`px-3.5 py-1 rounded-md text-[10px] font-black tracking-wider transition-all cursor-pointer ${isMovieMode ? 'bg-primary text-black' : 'text-gray-500 hover:text-white'}`}
          >
            MOVIE
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden lg:flex items-center gap-3 text-gray-400 mr-4">
          <MessageCircle className="w-5 h-5 hover:text-white cursor-pointer" />
          <Send className="w-5 h-5 hover:text-white cursor-pointer" />
          <Radio className="w-5 h-5 hover:text-white cursor-pointer" />
        </div>

        {user ? (
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent hover:border-primary transition-all"
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
                    <button onClick={() => { navigate('/watchlist'); setIsProfileOpen(false); }} className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3">
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
