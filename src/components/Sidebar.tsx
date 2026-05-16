import { X, Home, Compass, Film, Tv, Play, Calendar, Star, TrendingUp } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: TrendingUp, label: 'Most Popular', path: '/popular' },
  { icon: Tv, label: 'TV Series', path: '/tv-series' },
  { icon: Film, label: 'Movies', path: '/movies' },
  { icon: Play, label: 'OVAs', path: '/ovas' },
  { icon: Play, label: 'ONAs', path: '/onas' },
  { icon: Play, label: 'Specials', path: '/specials' },
];

const genreItems = [
  'Action', 'Adventure', 'Cars', 'Comedy', 'Dementia', 'Demons', 'Drama', 'Ecchi', 'Fantasy', 'Game', 'Harem', 'Historical', 'Horror', 'Isekai', 'Josei', 'Kids', 'Magic', 'Martial Arts', 'Mecha', 'Military', 'Music', 'Mystery', 'Parody'
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-[#16171a] z-[70] shadow-2xl flex flex-col border-r border-white/5"
          >
            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <button onClick={onClose} className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors">
                <X className="w-5 h-5" />
                <span className="text-sm font-medium">Close menu</span>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto px-4 py-6 scrollbar-hide">
              <div className="space-y-1 mb-8">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) => `
                      flex items-center gap-4 px-4 py-3 rounded-lg transition-all
                      ${isActive ? 'bg-primary text-black' : 'text-text-secondary hover:text-white hover:bg-white/5'}
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </div>

              <div className="mb-8">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4 mb-4">Genres</h3>
                <div className="grid grid-cols-2 gap-2">
                  {genreItems.map((genre) => (
                    <button
                      key={genre}
                      className="text-sm text-text-secondary hover:text-primary px-4 py-2 text-left rounded-lg hover:bg-white/5 transition-all truncate"
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {user && (
              <div className="p-4 border-t border-white/5 bg-black/20">
                <div className="flex items-center gap-3 px-2">
                  <img src={user.photoURL || ''} className="w-8 h-8 rounded-full" alt="" />
                  <div className="truncate">
                    <p className="text-sm font-medium truncate">{user.displayName}</p>
                    <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
